import { HttpError } from '../middlewares/httpError.js';
import { hasInvalidNameChars, INVALID_CHARS_MESSAGE, isUuid, normalizeName } from './common.js';

export const NAME_MAX_LENGTH = 100;
export const PRICE_MAX = 100_000_000;
/** Cạnh tối thiểu (px) của ảnh flat lay: cả chiều rộng và chiều cao (Q10). Dễ đổi ở đây. */
export const MIN_IMAGE_SIDE = 400;

const PRICE_REGEX = /^[1-9][0-9]*$/;

export const MESSAGES = Object.freeze({
  nameRequired: 'Vui lòng nhập tên sản phẩm.',
  nameTooLong: `Tên sản phẩm tối đa ${NAME_MAX_LENGTH} ký tự.`,
  priceRequired: 'Vui lòng nhập giá sản phẩm.',
  priceFormat: 'Giá phải là số nguyên dương (VND), không có dấu chấm hoặc phẩy.',
  priceTooHigh: 'Giá tối đa 100.000.000 ₫.',
  categoryRequired: 'Vui lòng chọn danh mục.',
  categoryNotFound: 'Danh mục không tồn tại. Vui lòng chọn lại.',
  categoryInvalidQuery: 'Danh mục không hợp lệ.',
  imageRequired: 'Vui lòng chọn ảnh sản phẩm.',
  imageTooSmall: `Ảnh quá nhỏ, cần tối thiểu ${MIN_IMAGE_SIDE}×${MIN_IMAGE_SIDE} px.`,
  imageUnreadable: 'Không đọc được kích thước ảnh. Vui lòng chọn ảnh khác.',
});

export const validationError = (fields) =>
  new HttpError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', fields);

function validateName(value) {
  if (typeof value !== 'string') return { error: MESSAGES.nameRequired };
  const name = normalizeName(value);
  if (name === '') return { error: MESSAGES.nameRequired };
  if (hasInvalidNameChars(name)) return { error: INVALID_CHARS_MESSAGE };
  if ([...name].length > NAME_MAX_LENGTH) return { error: MESSAGES.nameTooLong };
  return { value: name };
}

function validatePrice(value) {
  if (typeof value !== 'string' || value.trim() === '') return { error: MESSAGES.priceRequired };
  const text = value.trim();
  if (!PRICE_REGEX.test(text)) return { error: MESSAGES.priceFormat };
  // Dài hơn 9 chữ số chắc chắn vượt trần; tránh Number() mất chính xác với chuỗi rất dài.
  const price = text.length > 9 ? Infinity : Number(text);
  if (price > PRICE_MAX) return { error: MESSAGES.priceTooHigh };
  return { value: price };
}

/**
 * Validate các trường text của POST/PUT sản phẩm (multipart nên mọi giá trị là string).
 * Trả { values, fields }: `fields` gom MỌI lỗi để hiện cùng lúc. Không kiểm tra danh mục
 * có tồn tại hay không (cần DB) và không kiểm tra nội dung ảnh (cần magic bytes).
 * `requireImage`: POST bắt buộc có file; PUT tuỳ chọn.
 */
export function validateProductFields(body, file, { requireImage }) {
  const source = body ?? {};
  const fields = {};
  const values = {};

  const name = validateName(source.name);
  if (name.error) fields.name = name.error;
  else values.name = name.value;

  const price = validatePrice(source.price);
  if (price.error) fields.price = price.error;
  else values.price = price.value;

  if (typeof source.categoryId !== 'string' || source.categoryId.trim() === '') {
    fields.categoryId = MESSAGES.categoryRequired;
  } else if (!isUuid(source.categoryId.trim())) {
    // Sai định dạng: coi như không tồn tại để form hiện lỗi ở ô danh mục.
    fields.categoryId = MESSAGES.categoryNotFound;
  } else {
    values.categoryId = source.categoryId.trim().toLowerCase();
  }

  if (requireImage && !file) fields.image = MESSAGES.imageRequired;

  return { values, fields };
}

/**
 * Query `?categoryId=` của GET danh sách: không có / rỗng -> null (không lọc);
 * sai định dạng -> 400 VALIDATION_ERROR fields.categoryId.
 */
export function validateCategoryFilter(query) {
  const raw = query?.categoryId;
  if (raw === undefined || raw === '') return null;
  if (!isUuid(raw)) throw validationError({ categoryId: MESSAGES.categoryInvalidQuery });
  return raw.toLowerCase();
}
