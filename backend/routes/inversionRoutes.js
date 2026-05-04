// backend/routes/inversionRoutes.js
import { Router } from 'express';
import {
    getSettings, updateSettings,
    getHistorial, getSimulacion,
    saveSimulacion, deleteSimulacion,
    getParametrosMercado, refreshParametrosMercado
} from '../controllers/inversionController.js';

const router = Router();

router.get('/inversiones/settings/:userId',           getSettings);
router.put('/inversiones/settings/:userId',           updateSettings);
router.get('/inversiones/historial/:userId',          getHistorial);
// IMPORTANTE: estas rutas deben ir ANTES de /:id para que Express no las interprete como IDs
router.get('/inversiones/parametros-mercado',         getParametrosMercado);
router.post('/inversiones/parametros-mercado/refresh', refreshParametrosMercado);
router.get('/inversiones/:id',                        getSimulacion);
router.post('/inversiones',                           saveSimulacion);
router.delete('/inversiones/:id',                     deleteSimulacion);

export default router;