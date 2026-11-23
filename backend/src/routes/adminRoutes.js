import { Router } from 'express';
import { getAdminPing } from '../controllers/adminController.js';
import { getAdminOrder, getAdminOrders } from '../controllers/orderController.js';
import {
  getCategories,
  postCategory,
  putCategory,
  removeCategory,
} from '../controllers/categoryController.js';
import {
  getProductById,
  getProducts,
  postProduct,
  putProduct,
  removeProduct,
} from '../controllers/productController.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';
import { parseProductImageUpload } from '../middlewares/imageUpload.js';
import { productImageLimiter } from '../middlewares/rateLimiters.js';

const router = Router();
// Mọi route /api/admin/* cần đăng nhập và role admin (đọc từ DB mỗi request).
router.use(requireAuth, requireAdmin);
// Endpoint tối thiểu để kiểm tra phân quyền; các endpoint nghiệp vụ thêm ở Task 4–6.
router.get('/ping', getAdminPing);
router.get('/categories', getCategories);
router.post('/categories', postCategory);
router.put('/categories/:id', putCategory);
router.delete('/categories/:id', removeCategory);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
// Limiter và multer chạy sau phân quyền: không nhận file của request không phải admin.
router.post('/products', productImageLimiter, parseProductImageUpload, postProduct);
router.put('/products/:id', productImageLimiter, parseProductImageUpload, putProduct);
router.delete('/products/:id', removeProduct);
// Đơn hàng: chỉ xem (Sprint 4, Q29), không có API đổi trạng thái.
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrder);

export default router;
