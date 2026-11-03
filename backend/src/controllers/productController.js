import { HttpError } from '../middlewares/httpError.js';
import {
  categoryExists,
  createProduct,
  deleteProduct,
  getProduct,
  getProductImagePath,
  listProducts,
  updateProduct,
} from '../services/productService.js';
import { detectImageType, readImageSize } from '../utils/image.js';
import { isUuid } from '../validators/common.js';
import {
  MESSAGES,
  MIN_IMAGE_SIDE,
  validateCategoryFilter,
  validateProductFields,
  validationError,
} from '../validators/productValidator.js';

// :id không phải uuid -> 404 ngay, không gửi xuống DB (tránh lỗi 22P02).
function requireProductId(req) {
  if (!isUuid(req.params.id)) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã bị xoá.');
  }
  return req.params.id;
}

export async function getProducts(req, res) {
  const categoryId = validateCategoryFilter(req.query);
  res.json({ success: true, data: { products: await listProducts({ categoryId }) } });
}

export async function getProductById(req, res) {
  res.json({ success: true, data: { product: await getProduct(requireProductId(req)) } });
}

/**
 * Kiểm tra kích thước tối thiểu của ảnh (Q10; không kiểm tra tỷ lệ).
 * Trả message cho fields.image, hoặc '' nếu đạt.
 */
function checkImageSize(file, type) {
  const size = readImageSize(file.buffer, type);
  if (!size) return MESSAGES.imageUnreadable;
  if (size.width < MIN_IMAGE_SIDE || size.height < MIN_IMAGE_SIDE) return MESSAGES.imageTooSmall;
  return '';
}

/**
 * Thứ tự (product-management.md mục 3): text + có ảnh (400, mọi lỗi) -> magic bytes (415)
 * -> kích thước ảnh + danh mục tồn tại (400 fields) -> Storage/DB.
 */
export async function postProduct(req, res) {
  const { values, fields } = validateProductFields(req.body, req.file, { requireImage: true });
  if (Object.keys(fields).length > 0) throw validationError(fields);

  const type = detectImageType(req.file.buffer);
  if (!type) {
    throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Chỉ hỗ trợ ảnh JPG hoặc PNG.');
  }

  const sizeError = checkImageSize(req.file, type);
  if (sizeError) fields.image = sizeError;
  if (!(await categoryExists(values.categoryId))) fields.categoryId = MESSAGES.categoryNotFound;
  if (Object.keys(fields).length > 0) throw validationError(fields);

  const product = await createProduct(values, req.file, type);
  res.status(201).json({ success: true, data: { product } });
}

/**
 * PUT: text bắt buộc, ảnh tuỳ chọn. Thứ tự: validate text + magic bytes (không cần DB)
 * -> 404 sản phẩm -> kích thước ảnh + danh mục tồn tại (400 fields) -> Storage/DB.
 */
export async function putProduct(req, res) {
  const id = requireProductId(req);
  const { values, fields } = validateProductFields(req.body, req.file, { requireImage: false });
  if (Object.keys(fields).length > 0) throw validationError(fields);

  let type = null;
  if (req.file) {
    type = detectImageType(req.file.buffer);
    if (!type) {
      throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Chỉ hỗ trợ ảnh JPG hoặc PNG.');
    }
  }

  const oldPath = await getProductImagePath(id);

  if (req.file) {
    const sizeError = checkImageSize(req.file, type);
    if (sizeError) fields.image = sizeError;
  }
  if (!(await categoryExists(values.categoryId))) fields.categoryId = MESSAGES.categoryNotFound;
  if (Object.keys(fields).length > 0) throw validationError(fields);

  const product = await updateProduct(id, values, oldPath, req.file, type);
  res.json({ success: true, data: { product } });
}

export async function removeProduct(req, res) {
  const id = requireProductId(req);
  await deleteProduct(id);
  res.json({ success: true, data: { id } });
}
