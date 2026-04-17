// backend/routes/inversionRoutes.js
import { Router } from 'express';
import {
    getSettings, updateSettings,
    getHistorial, getSimulacion,
    saveSimulacion, deleteSimulacion
} from '../controllers/inversionController.js';

const router = Router();

router.get('/inversiones/settings/:userId',  getSettings);
router.put('/inversiones/settings/:userId',  updateSettings);
router.get('/inversiones/historial/:userId', getHistorial);
router.get('/inversiones/:id',               getSimulacion);
router.post('/inversiones',                  saveSimulacion);
router.delete('/inversiones/:id',            deleteSimulacion);

export default router;