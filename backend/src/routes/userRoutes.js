import { Router } from 'express';
import {
  deleteMyAvatar,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '../controllers/userController.js';
import { requireAuth } from '../middlewares/auth.js';
import { avatarLimiter } from '../middlewares/rateLimiters.js';
import { parseAvatarUpload } from '../middlewares/uploadAvatar.js';

const router = Router();
// Mọi route /api/user/* đều cần đăng nhập.
router.use(requireAuth);
router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
// requireAuth và avatarLimiter chạy trước multer: không nhận file của request chưa xác thực / vượt ngưỡng.
router.put('/profile/avatar', avatarLimiter, parseAvatarUpload, uploadMyAvatar);
router.delete('/profile/avatar', avatarLimiter, deleteMyAvatar);

export default router;
