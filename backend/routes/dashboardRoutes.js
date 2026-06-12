import { Router } from 'express';
import { getDashboardFixed, updateDashboardFixed } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/dashboard-fixed/:userId', requireAuth, getDashboardFixed);
router.put('/dashboard-fixed/:userId', requireAuth, updateDashboardFixed);

export default router;