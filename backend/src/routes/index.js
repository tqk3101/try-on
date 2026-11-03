import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import { notFoundHandler } from '../middlewares/errorHandler.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
// Mọi đường dẫn /api/* không khớp route nào
router.use(notFoundHandler);

export default router;
