import {
  createCategory,
  deleteCategory,
  listBuyerCategories,
  listCategories,
  updateCategory,
} from '../services/categoryService.js';
import { listBuyerProducts } from '../services/productService.js';
import { isUuid, validateCategoryBody } from '../validators/categoryValidator.js';
import { HttpError } from '../middlewares/httpError.js';

// :id không phải uuid -> 404 ngay, không gửi xuống DB (tránh lỗi 22P02).
function requireCategoryId(req) {
  if (!isUuid(req.params.id)) {
    throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
  }
  return req.params.id;
}

export async function getCategories(req, res) {
  res.json({ success: true, data: { categories: await listCategories() } });
}

export async function postCategory(req, res) {
  const category = await createCategory(validateCategoryBody(req.body));
  res.status(201).json({ success: true, data: { category } });
}

export async function putCategory(req, res) {
  const id = requireCategoryId(req);
  const category = await updateCategory(id, validateCategoryBody(req.body));
  res.json({ success: true, data: { category } });
}

export async function removeCategory(req, res) {
  const id = requireCategoryId(req);
  res.json({ success: true, data: await deleteCategory(id) });
}

export async function getBuyerCategories(req, res) {
  res.json({ success: true, data: { categories: await listBuyerCategories() } });
}

export async function getBuyerCategoryProducts(req, res) {
  const id = requireCategoryId(req);
  res.json({ success: true, data: await listBuyerProducts(id) });
}
