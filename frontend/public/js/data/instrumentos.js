// ============================================================
// INSTRUMENTOS FINANCIEROS AVANZADOS — TOO-EASY
// Reemplaza: frontend/public/js/data/instrumentos.js
//
// Mejoras:
//  - Volatilidad calibrada con datos históricos reales
//  - Sesgo de asimetría (skewness) para distribuciones no normales
//  - Correlación de activos integrada en la estructura
//  - Descripción de comportamiento en distintos escenarios
// ============================================================

export const INSTRUMENTOS = {
    // ── BAJO RIESGO ───────────────────────────────────────────────────────────
    cetes: {
        id: 'cetes',
        nombre: 'CETES',
        categoria: 'Deuda Gubernamental',
        riesgo: 'bajo',
        // Retorno base anual real (post-inflación implícita)
        tasa_base: 0.105,
        // Volatilidad anualizada (desviación estándar de retornos anuales)
        volatilidad: 0.008,
        // Skewness: 0 = simétrico, >0 = cola derecha, <0 = cola izquierda
        skewness: 0.1,
        // Exceso de curtosis: 0 = normal, >0 = colas gordas
        kurtosis: 0.2,
        // Liquidez: 'diaria' | 'semanal' | 'mensual' | 'baja'
        liquidez: 'diaria',
        // Horizonte mínimo recomendado (meses)
        horizonteMin: 1,
        descripcion: 'Certificados de la Tesorería de la Federación. El instrumento más seguro de México.',
        comportamientoEscenarios: { bull: 'neutro', base: 'positivo', bear: 'refugio', crisis: 'refugio' }
    },
    bonddia: {
        id: 'bonddia', nombre: 'Bonddia', categoria: 'Deuda Gubernamental',
        riesgo: 'bajo', tasa_base: 0.095, volatilidad: 0.005, skewness: 0.05, kurtosis: 0.1,
        liquidez: 'diaria', horizonteMin: 1,
        descripcion: 'Bonos de regulación monetaria a corto plazo del Banco de México.',
        comportamientoEscenarios: { bull: 'neutro', base: 'positivo', bear: 'refugio', crisis: 'refugio' }
    },
    sofipos: {
        id: 'sofipos', nombre: 'SOFIPOS', categoria: 'Ahorro',
        riesgo: 'bajo', tasa_base: 0.085, volatilidad: 0.006, skewness: 0.0, kurtosis: 0.1,
        liquidez: 'semanal', horizonteMin: 1,
        descripcion: 'Sociedades Financieras Populares reguladas por la CNBV.',
        comportamientoEscenarios: { bull: 'neutro', base: 'positivo', bear: 'estable', crisis: 'vulnerable' }
    },
    pagare: {
        id: 'pagare', nombre: 'Pagaré Bancario', categoria: 'Ahorro',
        riesgo: 'bajo', tasa_base: 0.075, volatilidad: 0.003, skewness: 0.0, kurtosis: 0.0,
        liquidez: 'mensual', horizonteMin: 3,
        descripcion: 'Instrumento de deuda a plazo fijo emitido por bancos comerciales.',
        comportamientoEscenarios: { bull: 'neutro', base: 'positivo', bear: 'estable', crisis: 'estable' }
    },
    udibonos: {
        id: 'udibonos', nombre: 'UDIBONOS', categoria: 'Deuda Gubernamental',
        riesgo: 'bajo', tasa_base: 0.040, volatilidad: 0.010, skewness: 0.1, kurtosis: 0.3,
        liquidez: 'diaria', horizonteMin: 6,
        indexadoInflacion: true,
        descripcion: 'Bonos indexados a la inflación. Protegen el poder adquisitivo real.',
        comportamientoEscenarios: { bull: 'positivo', base: 'positivo', bear: 'refugio', crisis: 'refugio' }
    },

    // ── RIESGO MEDIO ──────────────────────────────────────────────────────────
    sp500: {
        id: 'sp500', nombre: 'S&P 500', categoria: 'Acciones EE.UU.',
        riesgo: 'medio',
        // Retorno histórico real promedio S&P 500 (ajustado inflación): ~7-10%
        tasa_base: 0.10,
        // Vol histórica anual S&P 500: ~15-20%
        volatilidad: 0.038,
        skewness: -0.5,   // Colas izquierdas (crashes son más abruptos que los rallies)
        kurtosis: 2.0,    // Leptocúrtico: eventos extremos más frecuentes que distribución normal
        liquidez: 'diaria', horizonteMin: 36,
        descripcion: 'Índice de las 500 empresas más grandes de EE.UU. Referencia global de renta variable.',
        comportamientoEscenarios: { bull: 'excelente', base: 'positivo', bear: 'caída', crisis: 'severo' }
    },
    fibras: {
        id: 'fibras', nombre: 'FIBRAs', categoria: 'Bienes Raíces',
        riesgo: 'medio', tasa_base: 0.09, volatilidad: 0.030, skewness: -0.3, kurtosis: 1.0,
        liquidez: 'diaria', horizonteMin: 24,
        descripcion: 'Fideicomisos de Infraestructura y Bienes Raíces mexicanos. Renta variable + dividendos.',
        comportamientoEscenarios: { bull: 'positivo', base: 'positivo', bear: 'moderado', crisis: 'vulnerable' }
    },
    acciones_div: {
        id: 'acciones_div', nombre: 'Acciones dividendos', categoria: 'Acciones',
        riesgo: 'medio', tasa_base: 0.09, volatilidad: 0.032, skewness: -0.4, kurtosis: 1.2,
        liquidez: 'diaria', horizonteMin: 36,
        descripcion: 'Empresas consolidadas que distribuyen dividendos regulares. Menor volatilidad que el mercado.',
        comportamientoEscenarios: { bull: 'positivo', base: 'positivo', bear: 'moderado', crisis: 'moderado' }
    },
    crowdfunding: {
        id: 'crowdfunding', nombre: 'Crowdfunding inmobiliario', categoria: 'Bienes Raíces',
        riesgo: 'medio', tasa_base: 0.12, volatilidad: 0.042, skewness: -0.6, kurtosis: 1.5,
        liquidez: 'baja', horizonteMin: 24,
        descripcion: 'Inversión colectiva en proyectos de construcción y renta. Illiquidez parcial.',
        comportamientoEscenarios: { bull: 'excelente', base: 'positivo', bear: 'vulnerable', crisis: 'severo' }
    },
    fondos_mixtos: {
        id: 'fondos_mixtos', nombre: 'Fondos mixtos', categoria: 'Fondo de Inversión',
        riesgo: 'medio', tasa_base: 0.08, volatilidad: 0.022, skewness: -0.2, kurtosis: 0.8,
        liquidez: 'semanal', horizonteMin: 12,
        descripcion: 'Mezcla de renta fija y variable. Balance riesgo/retorno gestionado profesionalmente.',
        comportamientoEscenarios: { bull: 'positivo', base: 'positivo', bear: 'moderado', crisis: 'moderado' }
    },

    // ── ALTO RIESGO ───────────────────────────────────────────────────────────
    bitcoin: {
        id: 'bitcoin', nombre: 'Bitcoin', categoria: 'Criptomoneda',
        riesgo: 'alto',
        // Bitcoin histórico ha tenido retornos > 200% en bull y −70% en bear
        tasa_base: 0.40,
        // Volatilidad histórica Bitcoin: 70-100% anual
        volatilidad: 0.140,
        skewness: 1.5,    // Cola derecha (los rallies son explosivos)
        kurtosis: 5.0,    // Muy leptocúrtico: crashes y pumps extremos frecuentes
        liquidez: 'diaria', horizonteMin: 48,
        descripcion: 'La criptomoneda líder. Altísima volatilidad, sin respaldo gubernamental. Solo capital de riesgo.',
        comportamientoEscenarios: { bull: 'explosivo', base: 'positivo', bear: 'crash', crisis: 'crash' }
    },
    ethereum: {
        id: 'ethereum', nombre: 'Ethereum / Altcoins', categoria: 'Criptomoneda',
        riesgo: 'alto', tasa_base: 0.35, volatilidad: 0.155, skewness: 1.2, kurtosis: 4.5,
        liquidez: 'diaria', horizonteMin: 48,
        descripcion: 'Plataforma blockchain líder. Mayor volatilidad que Bitcoin. Ecosistema DeFi.',
        comportamientoEscenarios: { bull: 'explosivo', base: 'positivo', bear: 'crash', crisis: 'crash' }
    },
    tech_stocks: {
        id: 'tech_stocks', nombre: 'Acciones tecnológicas', categoria: 'Acciones',
        riesgo: 'alto', tasa_base: 0.20, volatilidad: 0.085, skewness: -0.5, kurtosis: 2.5,
        liquidez: 'diaria', horizonteMin: 36,
        descripcion: 'Empresas de alto crecimiento: NVIDIA, Meta, Tesla. Valuaciones exigentes, alta beta.',
        comportamientoEscenarios: { bull: 'excelente', base: 'positivo', bear: 'caída', crisis: 'severo' }
    },
    p2p: {
        id: 'p2p', nombre: 'Préstamos P2P', categoria: 'Deuda Privada',
        riesgo: 'alto', tasa_base: 0.15, volatilidad: 0.075, skewness: -1.2, kurtosis: 3.0,
        liquidez: 'baja', horizonteMin: 12,
        descripcion: 'Préstamos directos entre particulares. Riesgo significativo de impago; sin garantía de capital.',
        comportamientoEscenarios: { bull: 'positivo', base: 'positivo', bear: 'vulnerable', crisis: 'severo' }
    },
    startups: {
        id: 'startups', nombre: 'Startups (capital riesgo)', categoria: 'Capital de Riesgo',
        riesgo: 'alto', tasa_base: 0.50, volatilidad: 0.220, skewness: 2.5, kurtosis: 8.0,
        liquidez: 'baja', horizonteMin: 84,
        descripcion: 'Alta asimetría: 70-80% fracasan pero el 20% restante puede multiplicar 10x-100x el capital.',
        comportamientoEscenarios: { bull: 'explosivo', base: 'moderado', bear: 'crash', crisis: 'crash' }
    }
};

export const INSTRUMENTOS_LISTA = Object.values(INSTRUMENTOS);

export const RIESGO_META = {
    bajo:  { label: 'Bajo',  emoji: '🟢', color: '#27ae60', bg: '#eaf7f0', border: '#6fcf97' },
    medio: { label: 'Medio', emoji: '🟡', color: '#e67e22', bg: '#fef9e7', border: '#f0c040' },
    alto:  { label: 'Alto',  emoji: '🔴', color: '#c0392b', bg: '#fdf0ee', border: '#e8a09a' }
};

export const COLORES_LINEA = ['#185FA5', '#BA7517', '#1a9c5b', '#8e44ad'];