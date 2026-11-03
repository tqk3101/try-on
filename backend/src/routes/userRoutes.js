import { Router } from 'express';
import { getMyProfile } from '../controllers/userController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
// Mọi route /api/user/* đều cần đăng nhập.
router.use(requireAuth);
router.get('/profile', getMyProfile);

export default router;
