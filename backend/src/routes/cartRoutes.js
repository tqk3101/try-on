import { Router } from 'express';
import {
  deleteCartItem,
  getCart,
  postCartItem,
  putCartItem,
} from '../controllers/cartController.js';
import { requireAuth } from '../middlewares/auth.js';
import { cartLimiter, cartReadLimiter } from '../middlewares/rateLimiters.js';

const router = Router();
// requireAuth -> limiter (theo user) -> controller. Mọi role (user/admin) đều dùng được.
router.use(requireAuth);
router.get('/', cartReadLimiter, getCart);
router.post('/items', cartLimiter, postCartItem);
router.put('/items/:productId', cartLimiter, putCartItem);
router.delete('/items/:productId', cartLimiter, deleteCartItem);

export default router;
