import { supabase } from '../config/supabase.js';
import Movement from '../models/MovementModel.js';

const HIGH_RISK = [
    'Restaurantes', 'Comida rápida', 'Delivery', 'Café / Snacks',
    'Streaming', 'Videojuegos', 'Cine', 'Eventos', 'Hobbies', 'Viajes'
];

const FOOD_CATS = ['Restaurantes', 'Comida rápida', 'Delivery', 'Café / Snacks', 'Supermercado'];
const SUB_CATS  = ['Streaming', 'Suscripciones'];

function monthPrefix(year, month) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function calcTotals(movs) {
    const result = { income: 0, expense: 0, categories: {} };
    for (const m of movs) {
        const amt = parseFloat(m.monto) || 0;
        if (m.tipo === 'income') {
            result.income += amt;
        } else {
            result.expense += amt;
            result.categories[m.categoria] = (result.categories[m.categoria] || 0) + amt;
        }
    }
    result.balance = result.income - result.expense;
    return result;
}

function fmt(n) { return n.toFixed(2); }

export const getRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;

        const [movements, fixedRes] = await Promise.all([
            Movement.findByUserId(userId),
            supabase.from('dashboard_fixed').select('*').eq('user_id', userId).single()
        ]);

        const fixed = fixedRes.data || {};
        const ingresoFijo   = parseFloat(fixed.ingreso_fijo)  || 0;
        const egresoFijo    = parseFloat(fixed.egreso_fijo)   || 0;
        const metaCantidad  = parseFloat(fixed.meta_cantidad) || 0;
        const metaNombre    = fixed.meta_nombre || '';

        const now  = new Date();
        const cY   = now.getFullYear();
        const cM   = now.getMonth();
        const pM   = cM === 0 ? 11 : cM - 1;
        const pY   = cM === 0 ? cY - 1 : cY;

        const curPrefix  = monthPrefix(cY, cM);
        const prevPrefix = monthPrefix(pY, pM);

        const curMovs  = movements.filter(m => m.fecha.startsWith(curPrefix));
        const prevMovs = movements.filter(m => m.fecha.startsWith(prevPrefix));

        const cur  = calcTotals(curMovs);
        const prev = calcTotals(prevMovs);

        const curIncome   = cur.income  + ingresoFijo;
        const curExpense  = cur.expense + egresoFijo;
        const curBalance  = curIncome - curExpense;
        const prevExpense = prev.expense + egresoFijo;

        const recs = [];

        // ── Gastos superan ingresos ──
        if (curMovs.length > 0 && curExpense > curIncome) {
            recs.push({
                type: 'danger', icon: 'fa-circle-exclamation',
                title: 'Gastos superiores a tus ingresos',
                message: `Este mes gastas $${fmt(curExpense - curIncome)} más de lo que ingresas. Revisa tus egresos urgente.`,
                priority: 1
            });
        }

        // ── Balance negativo ──
        if (curBalance < 0 && curExpense <= curIncome) {
            recs.push({
                type: 'danger', icon: 'fa-circle-xmark',
                title: 'Balance mensual negativo',
                message: `Tu balance del mes es -$${fmt(Math.abs(curBalance))}. Considera reducir gastos variables.`,
                priority: 1
            });
        }

        // ── Categorías con aumento > 20% vs mes anterior ──
        for (const [cat, curAmt] of Object.entries(cur.categories)) {
            const prevAmt = prev.categories[cat] || 0;
            if (prevAmt > 0) {
                const pct = ((curAmt - prevAmt) / prevAmt) * 100;
                if (pct >= 20) {
                    const isRisk = HIGH_RISK.includes(cat);
                    recs.push({
                        type: isRisk ? 'warning' : 'info',
                        icon: 'fa-arrow-trend-up',
                        title: `${cat} aumentó un ${pct.toFixed(0)}%`,
                        message: `Pasaste de $${fmt(prevAmt)} a $${fmt(curAmt)} en ${cat} respecto al mes anterior.`,
                        priority: isRisk ? 2 : 4
                    });
                }
            }
        }

        // ── Categoría concentrada > 40% del gasto total ──
        if (curExpense > 0) {
            const [topCat, topAmt] = Object.entries(cur.categories)
                .sort((a, b) => b[1] - a[1])[0] || [];
            if (topCat && (topAmt / curExpense) * 100 > 40) {
                recs.push({
                    type: 'warning', icon: 'fa-chart-pie',
                    title: `Alta concentración en ${topCat}`,
                    message: `El ${((topAmt / curExpense) * 100).toFixed(0)}% de tus gastos es en ${topCat}. Diversificar podría mejorar tu balance.`,
                    priority: 2
                });
            }
        }

        // ── Gastos totales aumentaron > 15% ──
        if (prevExpense > 0 && curExpense > prevExpense) {
            const pct = ((curExpense - prevExpense) / prevExpense) * 100;
            if (pct >= 15) {
                recs.push({
                    type: 'warning', icon: 'fa-triangle-exclamation',
                    title: `Gastos totales aumentaron ${pct.toFixed(0)}%`,
                    message: `Tus egresos subieron de $${fmt(prevExpense)} a $${fmt(curExpense)} comparado al mes anterior.`,
                    priority: 2
                });
            }
        }

        // ── Progreso hacia meta ──
        if (metaCantidad > 0 && curBalance > 0) {
            const savPct = (curBalance / metaCantidad) * 100;
            if (savPct >= 80) {
                recs.push({
                    type: 'success', icon: 'fa-trophy',
                    title: '¡Vas muy bien hacia tu meta!',
                    message: `Llevas el ${savPct.toFixed(0)}% de "${metaNombre}": $${fmt(curBalance)} de $${fmt(metaCantidad)}.`,
                    priority: 5
                });
            } else if (savPct < 30) {
                recs.push({
                    type: 'warning', icon: 'fa-bullseye',
                    title: 'Avance lento hacia tu meta',
                    message: `Solo llevas el ${savPct.toFixed(0)}% de "${metaNombre}". Te faltan $${fmt(metaCantidad - curBalance)} más.`,
                    priority: 3
                });
            }
        }

        // ── Variación de ingresos ──
        if (prev.income > 0 && cur.income > 0) {
            const chgPct = ((cur.income - prev.income) / prev.income) * 100;
            if (Math.abs(chgPct) < 5) {
                recs.push({
                    type: 'info', icon: 'fa-shield-halved',
                    title: 'Ingresos estables',
                    message: `Tus ingresos se mantienen similares al mes anterior (variación del ${Math.abs(chgPct).toFixed(1)}%).`,
                    priority: 6
                });
            } else if (chgPct > 0) {
                recs.push({
                    type: 'success', icon: 'fa-arrow-trend-up',
                    title: `Ingresos crecieron un ${chgPct.toFixed(0)}%`,
                    message: `Pasaste de $${fmt(prev.income)} a $${fmt(cur.income)} en ingresos respecto al mes pasado.`,
                    priority: 5
                });
            }
        }

        // ── Predicción básica de gastos ──
        if (prevExpense > 0 && curExpense > 0) {
            const avg = (prevExpense + curExpense) / 2;
            recs.push({
                type: 'info', icon: 'fa-chart-line',
                title: 'Predicción de gastos próximo mes',
                message: `Basado en los últimos 2 meses, podrías gastar aproximadamente $${fmt(avg)} el próximo mes.`,
                priority: 7
            });
        }

        // ── Tip: comida > 25% del gasto ──
        if (curExpense > 0) {
            const foodAmt = FOOD_CATS.reduce((s, c) => s + (cur.categories[c] || 0), 0);
            if (foodAmt > 0 && foodAmt / curExpense > 0.25) {
                recs.push({
                    type: 'tip', icon: 'fa-utensils',
                    title: 'Optimiza tus gastos en alimentación',
                    message: `El ${((foodAmt / curExpense) * 100).toFixed(0)}% de tus gastos es en comida ($${fmt(foodAmt)}). Cocinar en casa puede reducirlo.`,
                    priority: 4
                });
            }

            // ── Tip: suscripciones > 10% ──
            const subAmt = SUB_CATS.reduce((s, c) => s + (cur.categories[c] || 0), 0);
            if (subAmt > 0 && subAmt / curExpense > 0.10) {
                recs.push({
                    type: 'tip', icon: 'fa-tv',
                    title: 'Revisa tus suscripciones activas',
                    message: `Tienes $${fmt(subAmt)} en streaming y suscripciones. Cancelar las que no uses podría ahorrarte dinero.`,
                    priority: 4
                });
            }
        }

        // ── Sin movimientos este mes ──
        if (curMovs.length === 0) {
            recs.push({
                type: 'info', icon: 'fa-calendar-plus',
                title: 'Sin movimientos registrados este mes',
                message: 'Aún no tienes registros este mes. Usa el calendario para anotar tus ingresos y gastos diarios.',
                priority: 8
            });
        }

        // ── Resumen general ──
        if (curMovs.length > 0) {
            recs.push({
                type: curBalance >= 0 ? 'success' : 'danger',
                icon: 'fa-chart-pie',
                title: 'Resumen financiero del mes',
                message: curBalance >= 0
                    ? `Tu balance mensual es positivo: +$${fmt(curBalance)}. ¡Buen trabajo manteniendo tus finanzas!`
                    : `Tu balance mensual es negativo: -$${fmt(Math.abs(curBalance))}. Toma acción para equilibrar tus finanzas.`,
                priority: curBalance >= 0 ? 8 : 1
            });
        }

        recs.sort((a, b) => a.priority - b.priority);

        res.json({
            success: true,
            data: {
                recommendations: recs.slice(0, 8),
                summary: {
                    currentIncome:  curIncome,
                    currentExpense: curExpense,
                    currentBalance: curBalance,
                    movementsCount: curMovs.length,
                    metaCantidad,
                    metaNombre
                }
            }
        });

    } catch (err) {
        console.error('[Recommendations] Error:', err.message);
        res.status(500).json({ success: false, message: 'Error al generar recomendaciones.' });
    }
};
