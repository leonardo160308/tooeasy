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

// Rate limit global (100 req / 15 min por IP)
const globalLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            100,
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

app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));

// =====================
// ARCHIVOS ESTÁTICOS
// =====================
app.use('/public',  express.static(path.join(__dirname, 'frontend/public')));
app.use(express.static(path.join(__dirname, 'frontend/views')));

// =====================
// RUTAS API
// =====================
// authLimiter se aplica ANTES de montar las rutas de auth
app.use('/api/auth', authLimiter);

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

// =====================
// SERVIDOR
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor TOO-EASY listo en http://localhost:${PORT}`);
});
