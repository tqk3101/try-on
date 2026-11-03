import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { loginLimiter, registerLimiter } from '../middlewares/rateLimiters.js';

const router = Router();
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

export default router;
