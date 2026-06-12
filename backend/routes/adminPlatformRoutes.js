// backend/routes/adminPlatformRoutes.js
import { Router } from 'express';
import { checkAdmin } from '../controllers/adminController.js';
import {
    getPlatformStats,
    getUsers,
    getUserDetail,
    setUserStatus
} from '../controllers/adminPlatformController.js';

const router = Router();

router.get('/admin/platform/stats',              checkAdmin, getPlatformStats);
router.get('/admin/platform/users',              checkAdmin, getUsers);
router.get('/admin/platform/users/:id/detail',   checkAdmin, getUserDetail);
router.patch('/admin/platform/users/:id/status', checkAdmin, setUserStatus);

export default router;
