import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import userRoutes from './userRoutes.js';
import tryOnRoutes from './tryOnRoutes.js';
import { notFoundHandler } from '../middlewares/errorHandler.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/try-on', tryOnRoutes);
router.use('/admin', adminRoutes);
// Mọi đường dẫn /api/* không khớp route nào
router.use(notFoundHandler);

export default router;
