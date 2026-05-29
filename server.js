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
import authRoutes          from './backend/routes/authRoutes.js';
import authRecoveryRoutes  from './backend/routes/authRecoveryRoutes.js';
import inversionRoutes     from './backend/routes/inversionRoutes.js';
import progressRoutes      from './backend/routes/progressRoutes.js';
import ticketRoutes           from './backend/routes/ticketRoutes.js';
import recommendationRoutes   from './backend/routes/recommendationRoutes.js';
import appRoutes              from './backend/routes/appRoutes.js';
import TicketModel            from './backend/models/TicketModel.js';

dotenv.config();
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
            scriptSrc:               ["'self'"],
            styleSrc:                ["'self'"],
            imgSrc:                  ["'self'", "data:", "https:"],
            connectSrc:              ["'self'"],
            fontSrc:                 ["'self'"],
            objectSrc:               ["'none'"],
            frameSrc:                ["'none'"],
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
