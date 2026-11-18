import { Router } from 'express';
import {
  getTryOnById,
  getTryOnQuota,
  postTryOn,
  postTryOnConsent,
} from '../controllers/tryOnController.js';
import { requireAuth } from '../middlewares/auth.js';
import { tryOnLimiter, tryOnPollLimiter } from '../middlewares/rateLimiters.js';

const router = Router();
// requireAuth -> limiter (theo user) -> controller. Mọi role (user/admin) đều dùng được.
router.use(requireAuth);
// /quota và /consent khai báo TRƯỚC /:id để không bị coi là id.
router.get('/quota', tryOnPollLimiter, getTryOnQuota);
router.post('/consent', tryOnLimiter, postTryOnConsent);
router.post('/', tryOnLimiter, postTryOn);
router.get('/:id', tryOnPollLimiter, getTryOnById);

export default router;
