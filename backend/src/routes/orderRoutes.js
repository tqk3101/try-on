import { Router } from 'express';
import { getOrder, postOrder } from '../controllers/orderController.js';
import { requireAuth } from '../middlewares/auth.js';
import { orderLimiter } from '../middlewares/rateLimiters.js';

const router = Router();
// requireAuth -> limiter (theo user) -> controller. Mọi role dùng được; không có GET danh sách (Q34).
router.use(requireAuth);
router.post('/', orderLimiter, postOrder);
router.get('/:id', getOrder);

export default router;
