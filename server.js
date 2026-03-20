import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Rutas
import userRoutes from './backend/routes/userRoutes.js';
import movementRoutes from './backend/routes/movementRoutes.js';
import skinRoutes from './backend/routes/skinRoutes.js';
import dashboardRoutes from './backend/routes/dashboardRoutes.js';
import gameRoutes from './backend/routes/gameRoutes.js';
import challengeRoutes from './backend/routes/challengeRoutes.js';

dotenv.config();
const app = express();

// __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================
// MIDDLEWARES
// =====================
app.use(cors());
app.use(express.json());

// =====================
// ARCHIVOS ESTÁTICOS
// =====================
app.use('/public', express.static(path.join(__dirname, 'frontend/public')));
app.use(express.static(path.join(__dirname, 'frontend/views')));

// =====================
// RUTAS API
// =====================
app.use('/api', userRoutes);
app.use('/api', movementRoutes);
app.use('/api', skinRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', gameRoutes);
app.use('/api', challengeRoutes);

// =====================
// 404 / SPA fallback
// =======
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor TOO-EASY listo en http://localhost:${PORT}`);
});
