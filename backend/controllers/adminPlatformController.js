// backend/controllers/adminPlatformController.js
import { supabaseAdmin } from '../config/supabase.js';

const SAFE_USER_LIST_FIELDS =
    'id, nombre, email, edad, genero, role, level, coins, wood, is_active, email_verified, created_at';

const SAFE_USER_DETAIL_FIELDS =
    'id, nombre, email, edad, genero, foto, avatar, coins, wood, level, ' +
    'house_level, beaver_level, current_appearance, current_beaver, ' +
    'role, is_active, email_verified, email_verified_at, ' +
    'last_login_at, password_changed_at, ' +
    'has_seen_tutorial, tutorial_completed_at, created_at, updated_at';

// ──────────────────────────────────────────────────────────────────
// GET /api/admin/platform/stats
// ──────────────────────────────────────────────────────────────────
export async function getPlatformStats(req, res) {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [
            { count: totalUsers,        error: e1 },
            { count: activeUsers,       error: e2 },
            { count: recentActiveUsers, error: e3 },
            { count: verifiedUsers,     error: e4 },
            { count: ticketsPending,    error: e5 },
            { count: ticketsResolved,   error: e6 },
            { count: totalSimulations,  error: e7 },
            { count: totalMovements,    error: e8 },
            { data:  roleRows,          error: e9 }
        ] = await Promise.all([
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true).gte('last_login_at', thirtyDaysAgo),
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('email_verified', true),
            supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
            supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['closed', 'resolved']),
            supabaseAdmin.from('investment_simulations').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('movements').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('users').select('role')
        ]);

        const firstErr = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9;
        if (firstErr) {
            console.error('[getPlatformStats] Supabase error:', firstErr);
            return res.status(500).json({ success: false, message: 'Error al consultar estadísticas.' });
        }

        const roleCounts = { user: 0, admin: 0, support: 0 };
        (roleRows || []).forEach(r => {
            if (roleCounts[r.role] !== undefined) roleCounts[r.role]++;
        });

        res.json({
            success: true,
            data: {
                totalUsers:        totalUsers        ?? 0,
                activeUsers:       activeUsers       ?? 0,
                recentActiveUsers: recentActiveUsers ?? 0,
                verifiedUsers:     verifiedUsers     ?? 0,
                ticketsPending:    ticketsPending    ?? 0,
                ticketsResolved:   ticketsResolved   ?? 0,
                totalSimulations:  totalSimulations  ?? 0,
                totalMovements:    totalMovements    ?? 0,
                roleBreakdown:     roleCounts
            }
        });
    } catch (err) {
        console.error('[getPlatformStats]', err);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
    }
}

// ──────────────────────────────────────────────────────────────────
// GET /api/admin/platform/users?search=&role=&is_active=&email_verified=&page=&limit=
// ──────────────────────────────────────────────────────────────────
export async function getUsers(req, res) {
    try {
        const {
            search         = '',
            role           = '',
            is_active      = '',
            email_verified = '',
            page           = '1',
            limit          = '25'
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const offset   = (pageNum - 1) * limitNum;

        let query = supabaseAdmin
            .from('users')
            .select(SAFE_USER_LIST_FIELDS, { count: 'exact' });

        if (search.trim()) {
            query = query.or(`nombre.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
        }
        if (role)            query = query.eq('role', role);
        if (is_active !== '') query = query.eq('is_active', is_active === 'true');
        if (email_verified !== '') query = query.eq('email_verified', email_verified === 'true');

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limitNum - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            pagination: {
                total:      count      ?? 0,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil((count ?? 0) / limitNum)
            }
        });
    } catch (err) {
        console.error('[getUsers]', err);
        res.status(500).json({ success: false, message: 'Error al obtener usuarios.' });
    }
}

// ──────────────────────────────────────────────────────────────────
// GET /api/admin/platform/users/:id/detail
// ──────────────────────────────────────────────────────────────────
export async function getUserDetail(req, res) {
    try {
        const { id } = req.params;

        const [
            userRes,
            progressRes,
            movementsRes,
            simsCountRes,
            simLatestRes,
            ticketsRes,
            skinsRes,
            dashFixedRes
        ] = await Promise.all([
            supabaseAdmin.from('users').select(SAFE_USER_DETAIL_FIELDS).eq('id', id).single(),
            supabaseAdmin.from('user_category_progress')
                .select('category_id, completed_levels, learning_categories(nombre)')
                .eq('user_id', id),
            supabaseAdmin.from('movements').select('tipo, monto').eq('user_id', id),
            supabaseAdmin.from('investment_simulations').select('*', { count: 'exact', head: true }).eq('user_id', id),
            supabaseAdmin.from('investment_simulations')
                .select('id, nombre, rendimiento_pct, capital_inicial, ganancia_total, created_at')
                .eq('user_id', id)
                .order('created_at', { ascending: false })
                .limit(1),
            supabaseAdmin.from('support_tickets')
                .select('id, subject, status, priority, created_at')
                .eq('user_id', id)
                .order('created_at', { ascending: false })
                .limit(20),
            supabaseAdmin.from('user_skins')
                .select('skin_id, skins(tipo, nombre)')
                .eq('user_id', id),
            supabaseAdmin.from('dashboard_fixed').select('saving_method').eq('user_id', id).maybeSingle()
        ]);

        if (userRes.error?.code === 'PGRST116') {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        if (userRes.error) throw userRes.error;

        // Aggregate movements (only tipo + monto, no individual details exposed)
        const movements = movementsRes.data || [];
        const movStats = movements.reduce(
            (acc, m) => {
                const amount = parseFloat(m.monto) || 0;
                if (m.tipo === 'income') { acc.incomeCount++; acc.incomeTotal += amount; }
                else                     { acc.expenseCount++; acc.expenseTotal += amount; }
                return acc;
            },
            { total: 0, incomeCount: 0, expenseCount: 0, incomeTotal: 0, expenseTotal: 0 }
        );
        movStats.total = movements.length;

        // Progress
        const progressList = (progressRes.data || []).map(p => ({
            categoryId:      p.category_id,
            categoryName:    p.learning_categories?.nombre ?? `Categoría ${p.category_id}`,
            completedLevels: Array.isArray(p.completed_levels) ? p.completed_levels.length : 0
        }));
        const totalLevelsCompleted = progressList.reduce((s, p) => s + p.completedLevels, 0);

        // Tickets
        const tickets = ticketsRes.data || [];
        const ticketStats = tickets.reduce(
            (acc, t) => {
                if (['open', 'in_progress'].includes(t.status)) acc.open++;
                else acc.resolved++;
                return acc;
            },
            { total: tickets.length, open: 0, resolved: 0 }
        );

        res.json({
            success: true,
            data: {
                user:        userRes.data,
                progress:    { categories: progressList, totalLevelsCompleted },
                movements:   movStats,
                simulations: { count: simsCountRes.count ?? 0, latest: simLatestRes.data?.[0] ?? null },
                tickets:     { list: tickets, stats: ticketStats },
                skins:       (skinsRes.data || []).map(s => ({
                    id:     s.skin_id,
                    tipo:   s.skins?.tipo ?? 'unknown',
                    nombre: s.skins?.nombre ?? s.skin_id
                })),
                savingMethod: dashFixedRes.data?.saving_method ?? null
            }
        });
    } catch (err) {
        console.error('[getUserDetail]', err);
        res.status(500).json({ success: false, message: 'Error al obtener detalle del usuario.' });
    }
}

// ──────────────────────────────────────────────────────────────────
// PATCH /api/admin/platform/users/:id/status  { is_active: boolean }
// ──────────────────────────────────────────────────────────────────
export async function setUserStatus(req, res) {
    try {
        const { id }       = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ success: false, message: 'El campo is_active debe ser un booleano.' });
        }

        if (String(id) === String(req.userId)) {
            return res.status(400).json({ success: false, message: 'No puedes cambiar el estado de tu propia cuenta.' });
        }

        const { data: target, error: fetchErr } = await supabaseAdmin
            .from('users')
            .select('id, role, is_active')
            .eq('id', id)
            .single();

        if (fetchErr || !target) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        if (target.role === 'admin') {
            return res.status(403).json({ success: false, message: 'No se puede cambiar el estado de una cuenta de administrador.' });
        }

        // Usar .select() (sin .single()) para detectar si el trigger trg_hard_delete_on_deactivate
        // cancela el UPDATE devolviendo 0 filas. Si eso ocurre se retorna MIGRATION_REQUIRED.
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('users')
            .update({ is_active })
            .eq('id', id)
            .select('id, is_active');

        if (updateErr) throw updateErr;

        if (!updated || updated.length === 0) {
            return res.status(409).json({
                success: false,
                code:    'MIGRATION_REQUIRED',
                message: 'Un trigger de base de datos está bloqueando la operación. Ejecuta migrations/enable_soft_deactivation.sql en el Editor SQL de Supabase para habilitarla.'
            });
        }

        res.json({
            success:   true,
            message:   is_active ? 'Cuenta reactivada correctamente.' : 'Cuenta desactivada correctamente.',
            data:      { id: updated[0].id, is_active: updated[0].is_active }
        });
    } catch (err) {
        console.error('[setUserStatus]', err);
        res.status(500).json({ success: false, message: 'Error al actualizar estado del usuario.' });
    }
}
