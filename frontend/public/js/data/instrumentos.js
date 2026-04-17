// frontend/public/js/data/instrumentos.js

export const INSTRUMENTOS = {
    // ── BAJO RIESGO ───────────────────────────────────────────────────────────
    cetes: {
        id: 'cetes', nombre: 'CETES', categoria: 'Deuda Gubernamental',
        riesgo: 'bajo', tasa_base: 0.105, volatilidad: 0.005,
        descripcion: 'Certificados de la Tesorería de la Federación. El instrumento más seguro de México.'
    },
    bonddia: {
        id: 'bonddia', nombre: 'Bonddia', categoria: 'Deuda Gubernamental',
        riesgo: 'bajo', tasa_base: 0.095, volatilidad: 0.003,
        descripcion: 'Bonos de regulación monetaria a corto plazo del Banco de México.'
    },
    sofipos: {
        id: 'sofipos', nombre: 'SOFIPOS', categoria: 'Ahorro',
        riesgo: 'bajo', tasa_base: 0.085, volatilidad: 0.004,
        descripcion: 'Sociedades Financieras Populares reguladas por la CNBV.'
    },
    pagare: {
        id: 'pagare', nombre: 'Pagaré Bancario', categoria: 'Ahorro',
        riesgo: 'bajo', tasa_base: 0.075, volatilidad: 0.002,
        descripcion: 'Instrumento de deuda a plazo fijo emitido por bancos comerciales.'
    },
    udibonos: {
        id: 'udibonos', nombre: 'UDIBONOS', categoria: 'Deuda Gubernamental',
        riesgo: 'bajo', tasa_base: 0.040, volatilidad: 0.006,
        descripcion: 'Bonos indexados a la inflación. Protegen el poder adquisitivo real.',
        indexadoInflacion: true
    },

    // ── RIESGO MEDIO ──────────────────────────────────────────────────────────
    sp500: {
        id: 'sp500', nombre: 'S&P 500', categoria: 'Acciones EE.UU.',
        riesgo: 'medio', tasa_base: 0.10, volatilidad: 0.04,
        descripcion: 'Índice de las 500 empresas más grandes de Estados Unidos.'
    },
    fibras: {
        id: 'fibras', nombre: 'FIBRAs', categoria: 'Bienes Raíces',
        riesgo: 'medio', tasa_base: 0.09, volatilidad: 0.035,
        descripcion: 'Fideicomisos de Infraestructura y Bienes Raíces mexicanos.'
    },
    acciones_div: {
        id: 'acciones_div', nombre: 'Acciones con dividendos', categoria: 'Acciones',
        riesgo: 'medio', tasa_base: 0.09, volatilidad: 0.04,
        descripcion: 'Empresas consolidadas que reparten dividendos de forma regular.'
    },
    crowdfunding: {
        id: 'crowdfunding', nombre: 'Crowdfunding inmobiliario', categoria: 'Bienes Raíces',
        riesgo: 'medio', tasa_base: 0.12, volatilidad: 0.05,
        descripcion: 'Inversión colectiva en proyectos de construcción y renta.'
    },
    fondos_mixtos: {
        id: 'fondos_mixtos', nombre: 'Fondos mixtos', categoria: 'Fondo de Inversión',
        riesgo: 'medio', tasa_base: 0.08, volatilidad: 0.03,
        descripcion: 'Combinación de renta fija y variable para equilibrar riesgo y rendimiento.'
    },

    // ── ALTO RIESGO ───────────────────────────────────────────────────────────
    bitcoin: {
        id: 'bitcoin', nombre: 'Bitcoin', categoria: 'Criptomoneda',
        riesgo: 'alto', tasa_base: 0.40, volatilidad: 0.15,
        descripcion: 'La criptomoneda más conocida. Alta volatilidad y alto potencial de pérdida o ganancia.'
    },
    ethereum: {
        id: 'ethereum', nombre: 'Ethereum / Altcoins', categoria: 'Criptomoneda',
        riesgo: 'alto', tasa_base: 0.35, volatilidad: 0.18,
        descripcion: 'Plataforma blockchain y monedas alternativas. Extrema volatilidad.'
    },
    tech_stocks: {
        id: 'tech_stocks', nombre: 'Acciones tecnológicas', categoria: 'Acciones',
        riesgo: 'alto', tasa_base: 0.20, volatilidad: 0.10,
        descripcion: 'Empresas de alto crecimiento: NVIDIA, Meta, Tesla, etc.'
    },
    p2p: {
        id: 'p2p', nombre: 'Préstamos P2P', categoria: 'Deuda Privada',
        riesgo: 'alto', tasa_base: 0.15, volatilidad: 0.08,
        descripcion: 'Préstamos directos entre particulares. Riesgo significativo de impago.'
    },
    startups: {
        id: 'startups', nombre: 'Startups', categoria: 'Capital de Riesgo',
        riesgo: 'alto', tasa_base: 0.50, volatilidad: 0.25,
        descripcion: 'Inversión en empresas emergentes. La mayoría fracasa; unas pocas despegan.'
    }
};

export const INSTRUMENTOS_LISTA = Object.values(INSTRUMENTOS);

export const RIESGO_META = {
    bajo:  { label: 'Bajo',  emoji: '🟢', color: '#27ae60', bg: '#eaf7f0', border: '#6fcf97' },
    medio: { label: 'Medio', emoji: '🟡', color: '#e67e22', bg: '#fef9e7', border: '#f0c040' },
    alto:  { label: 'Alto',  emoji: '🔴', color: '#c0392b', bg: '#fdf0ee', border: '#e8a09a' }
};

export const COLORES_LINEA = ['#2C405B', '#BA8E58', '#27ae60', '#8e44ad'];