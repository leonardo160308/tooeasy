import { Router } from 'express';
import { getDashboardFixed, updateDashboardFixed } from '../controllers/dashboardController.js';

const router = Router();

router.get('/dashboard-fixed/:userId', getDashboardFixed);
router.put('/dashboard-fixed/:userId', updateDashboardFixed);

export default router;