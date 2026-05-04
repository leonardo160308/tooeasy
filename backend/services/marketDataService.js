// backend/services/marketDataService.js
//
// Responsabilidades:
//   1. Consumir Alpha Vantage para instrumentos con ticker público (Grupo A)
//   2. Calcular retornos logarítmicos, μ y σ anualizados
//   3. Hacer seed de parámetros estáticos para instrumentos mexicanos (Grupo B)
//
// Grupo A — con datos en Alpha Vantage:
//   sp500, tech_stocks, bitcoin, ethereum
//
// Grupo B — sin API pública gratuita (CETES, FIBRAs, P2P, etc.):
//   Se usan parámetros calibrados manualmente. Se actualizan vía endpoint /refresh
//   con body JSON si el admin quiere ajustar un valor puntual.

import MarketDataModel from '../models/MarketDataModel.js';

const AV_BASE = 'https://www.alphavantage.co/query';

const TICKER_MAP = {
    sp500:       { symbol: 'SPY', type: 'equity' },
    tech_stocks: { symbol: 'QQQ', type: 'equity' },
    bitcoin:     { symbol: 'BTC', type: 'crypto' },
    ethereum:    { symbol: 'ETH', type: 'crypto' },
};

// Parámetros calibrados para instrumentos mexicanos sin API gratuita
const STATIC_PARAMS = {
    cetes:         { tasa_base: 0.105000, volatilidad: 0.008000 },
    bonddia:       { tasa_base: 0.095000, volatilidad: 0.005000 },
    sofipos:       { tasa_base: 0.085000, volatilidad: 0.006000 },
    pagare:        { tasa_base: 0.075000, volatilidad: 0.003000 },
    udibonos:      { tasa_base: 0.040000, volatilidad: 0.010000 },
    fibras:        { tasa_base: 0.090000, volatilidad: 0.030000 },
    acciones_div:  { tasa_base: 0.090000, volatilidad: 0.032000 },
    crowdfunding:  { tasa_base: 0.120000, volatilidad: 0.042000 },
    fondos_mixtos: { tasa_base: 0.080000, volatilidad: 0.022000 },
    p2p:           { tasa_base: 0.150000, volatilidad: 0.075000 },
    startups:      { tasa_base: 0.500000, volatilidad: 0.220000 },
};

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

async function fetchPricesEquity(symbol, apiKey) {
    const url = `${AV_BASE}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${symbol}`);
    const json = await res.json();
    if (json['Note'] || json['Information']) {
        throw new Error(`Rate limit Alpha Vantage: ${json['Note'] ?? json['Information']}`);
    }
    const series = json['Time Series (Daily)'];
    if (!series) throw new Error(`Alpha Vantage no devolvió datos para ${symbol}`);
    return series;
}

async function fetchPricesCrypto(symbol, apiKey) {
    const url = `${AV_BASE}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${symbol}`);
    const json = await res.json();
    if (json['Note'] || json['Information']) {
        throw new Error(`Rate limit Alpha Vantage: ${json['Note'] ?? json['Information']}`);
    }
    const series = json['Time Series (Digital Currency Daily)'];
    if (!series) throw new Error(`Alpha Vantage no devolvió datos crypto para ${symbol}`);
    return series;
}

// ── Procesamiento estadístico ─────────────────────────────────────────────────

function extractPrices(series, type) {
    const prices = [];
    for (const [date, data] of Object.entries(series)) {
        const raw = type === 'crypto'
            ? (data['4a. close (USD)'] ?? data['4. close'])
            : data['5. adjusted close'];
        const price = parseFloat(raw);
        if (!isNaN(price) && price > 0) prices.push({ date, price });
    }
    // Ordenar de más antiguo a más reciente
    prices.sort((a, b) => (a.date < b.date ? -1 : 1));
    // Últimos ~5 años de datos de trading (≈1260 días hábiles)
    return prices.slice(-1260);
}

function calculateAnnualParams(prices) {
    if (prices.length < 30) throw new Error('Datos insuficientes para calcular parámetros');

    // Retornos logarítmicos diarios: r_t = ln(P_t / P_{t-1})
    const logReturns = [];
    for (let i = 1; i < prices.length; i++) {
        const r = Math.log(prices[i].price / prices[i - 1].price);
        if (isFinite(r)) logReturns.push(r);
    }

    const n    = logReturns.length;
    const mean = logReturns.reduce((s, r) => s + r, 0) / n;
    const variance = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);

    // Anualizar: 252 días hábiles por año
    return {
        tasa_base:  Math.max(mean * 252, -0.99),  // clamp: evitar retorno < -99%
        volatilidad: Math.sqrt(variance) * Math.sqrt(252),
    };
}

// ── API pública del servicio ──────────────────────────────────────────────────

/**
 * Garantiza que todos los instrumentos de Grupo B existan en market_parameters.
 * Idempotente: sólo inserta los que faltan.
 */
export async function ensureStaticParams() {
    const existing = await MarketDataModel.getAllParameters();
    const rows = Object.entries(STATIC_PARAMS)
        .filter(([id]) => !existing[id])
        .map(([id, p]) => ({
            instrumento_id: id,
            tasa_base:      p.tasa_base,
            volatilidad:    p.volatilidad,
            fuente:         'static',
            last_updated:   null,
            datos_extra:    {}
        }));
    if (rows.length > 0) await MarketDataModel.upsertMany(rows);
}

/**
 * Actualiza μ y σ de los 4 instrumentos del Grupo A consultando Alpha Vantage.
 * Tarda ~45 s por el throttle entre llamadas (free tier: 25 req/día).
 * Diseñado para llamarse en background (fire-and-forget desde el controlador).
 */
export async function refreshApiInstruments() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY no está configurada en .env');

    const results = { success: [], failed: [] };
    const entries = Object.entries(TICKER_MAP);

    for (let i = 0; i < entries.length; i++) {
        const [instrId, cfg] = entries[i];
        try {
            const rawSeries = cfg.type === 'crypto'
                ? await fetchPricesCrypto(cfg.symbol, apiKey)
                : await fetchPricesEquity(cfg.symbol, apiKey);

            const prices = extractPrices(rawSeries, cfg.type);
            const params = calculateAnnualParams(prices);

            await MarketDataModel.upsertParameter(
                instrId,
                params.tasa_base,
                params.volatilidad,
                'alpha_vantage',
                { ticker: cfg.symbol, n_prices: prices.length }
            );
            console.log(`[MarketData] ${instrId} (${cfg.symbol}): μ=${(params.tasa_base * 100).toFixed(1)}% σ=${(params.volatilidad * 100).toFixed(1)}%`);
            results.success.push(instrId);
        } catch (err) {
            console.error(`[MarketData] Error en ${instrId}:`, err.message);
            results.failed.push({ instrId, error: err.message });
        }

        // Respetar el rate limit de Alpha Vantage free tier (25 req/día)
        // 13 s entre llamadas = ~4.6 req/min, muy por debajo del límite
        if (i < entries.length - 1) {
            await new Promise(r => setTimeout(r, 13000));
        }
    }

    return results;
}
