import { Router } from 'express';
import { getBuyerCategories, getBuyerCategoryProducts } from '../controllers/categoryController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
// API đọc cho người mua: chỉ cần đăng nhập, không cần admin.
router.use(requireAuth);
router.get('/', getBuyerCategories);
router.get('/:id/products', getBuyerCategoryProducts);

export default router;
