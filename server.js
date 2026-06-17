import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rutas
import userRoutes          from './backend/routes/userRoutes.js';
import movementRoutes      from './backend/routes/movementRoutes.js';
import skinRoutes          from './backend/routes/skinRoutes.js';
import dashboardRoutes     from './backend/routes/dashboardRoutes.js';
import gameRoutes          from './backend/routes/gameRoutes.js';
import challengeRoutes     from './backend/routes/challengeRoutes.js';
import adminRoutes         from './backend/routes/adminRoutes.js';
import adminPlatformRoutes from './backend/routes/adminPlatformRoutes.js';
import authRoutes          from './backend/routes/authRoutes.js';
import authRecoveryRoutes  from './backend/routes/authRecoveryRoutes.js';
import inversionRoutes     from './backend/routes/inversionRoutes.js';
import progressRoutes      from './backend/routes/progressRoutes.js';
import ticketRoutes           from './backend/routes/ticketRoutes.js';
import recommendationRoutes   from './backend/routes/recommendationRoutes.js';
import appRoutes              from './backend/routes/appRoutes.js';
import TicketModel            from './backend/models/TicketModel.js';
import { supabaseAdmin }      from './backend/config/supabase.js';

dotenv.config();

if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET no está definido. El servidor no puede iniciar de forma segura.');
    process.exit(1);
}

const app = express();

// Necesario para que express-rate-limit funcione detrás de Render/Nginx
app.set('trust proxy', 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// =====================
// SEGURIDAD — ANTES DE CUALQUIER RUTA
// =====================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:              ["'self'"],
            scriptSrc:               ["'self'", "https://challenges.cloudflare.com"],
            styleSrc:                ["'self'"],
            imgSrc:                  ["'self'", "data:", "https:"],
            connectSrc:              ["'self'", "https://challenges.cloudflare.com"],
            fontSrc:                 ["'self'"],
            objectSrc:               ["'none'"],
            frameSrc:                ["https://challenges.cloudflare.com"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge:            31536000,
        includeSubDomains: true,
        preload:           true,
    },
    frameguard:     { action: 'deny' },
    noSniff:        true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('CORS: origen no permitido'));
    },
    credentials: true,
}));

// Rate limit para endpoints API (300 req / 15 min por IP)
const globalLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            300,
    standardHeaders: true,
    legacyHeaders:  false,
    message:        { success: false, message: 'Demasiadas peticiones. Intenta en 15 minutos.' },
});

// Rate limit estricto para endpoints de autenticación (20 req / 15 min)
const authLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            20,
    standardHeaders: true,
    legacyHeaders:  false,
    message:        { success: false, message: 'Demasiados intentos. Intenta en 15 minutos.' },
});

app.use(express.json({ limit: '10kb' }));

// =====================
// ARCHIVOS ESTÁTICOS — antes del rate limit para no consumir cuota
// =====================
app.use('/public',  express.static(path.join(__dirname, 'frontend/public')));
app.use(express.static(path.join(__dirname, 'frontend/views')));

// =====================
// RUTAS API
// =====================
// Rate limiting solo para /api — archivos estáticos no consumen cuota
app.use('/api/auth', authLimiter);
app.use('/api',      globalLimiter);

app.use('/api', authRoutes);
app.use('/api', authRecoveryRoutes);
app.use('/api', userRoutes);
app.use('/api', movementRoutes);
app.use('/api', skinRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', gameRoutes);
app.use('/api', challengeRoutes);
app.use('/api', adminRoutes);
app.use('/api', adminPlatformRoutes);
app.use('/api', inversionRoutes);
app.use('/api', progressRoutes);
app.use('/api', ticketRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', appRoutes);

// =====================
// LIMPIEZA AUTOMÁTICA DE TICKETS (cada 24 h)
// =====================
async function runTicketCleanup() {
    try {
        const result = await TicketModel.deleteExpiredTickets();
        if (result.deleted > 0) {
            console.log(`[Cleanup] ${result.deleted} ticket(s) con más de 30 días eliminado(s).`);
        }
    } catch (err) {
        console.error('[Cleanup] Error al limpiar tickets expirados:', err.message);
    }
}

setTimeout(runTicketCleanup, 10_000);
setInterval(runTicketCleanup, 24 * 60 * 60 * 1000);

// =====================
// LIMPIEZA DE CUENTAS NO VERIFICADAS (cada 24 h)
// Elimina usuarios que se registraron pero nunca verificaron su correo
// después de 24 horas — evita acumulación de cuentas zombie en la BD.
// =====================
async function runUnverifiedCleanup() {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('email_verified', false)
            .lt('created_at', cutoff)
            .select('id');

        if (error) throw error;
        if (data?.length > 0) {
            console.log(`[Cleanup] ${data.length} cuenta(s) no verificada(s) eliminada(s).`);
        }
    } catch (err) {
        console.error('[Cleanup] Error al limpiar cuentas no verificadas:', err.message);
    }
}

// =====================
// LIMPIEZA DE CUENTAS INACTIVAS (cada 24 h)
// Elimina cuentas que llevan más de 90 días con is_active = false
// (desactivadas por el admin y no reactivadas en ese período).
// =====================
async function runInactiveCleanup() {
    try {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('is_active', false)
            .lt('updated_at', cutoff)
            .select('id');

        if (error) throw error;
        if (data?.length > 0) {
            console.log(`[Cleanup] ${data.length} cuenta(s) inactiva(s) eliminada(s) tras 90 días.`);
        }
    } catch (err) {
        console.error('[Cleanup] Error al limpiar cuentas inactivas:', err.message);
    }
}

setTimeout(runUnverifiedCleanup, 15_000);
setInterval(runUnverifiedCleanup, 24 * 60 * 60 * 1000);

setTimeout(runInactiveCleanup, 20_000);
setInterval(runInactiveCleanup, 24 * 60 * 60 * 1000);

// =====================
// 404 y ERROR HANDLERS
// =====================
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint no encontrado.' });
});

app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor.' });
});

// =====================
// SERVIDOR
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor TOO-EASY listo en http://localhost:${PORT}`);
});
