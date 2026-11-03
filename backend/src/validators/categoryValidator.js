import { HttpError } from '../middlewares/httpError.js';
import {
  hasInvalidNameChars,
  INVALID_CHARS_MESSAGE,
  isPlainObject,
  isUuid,
  normalizeName,
} from './common.js';

export { isUuid };

const NAME_MAX_LENGTH = 50;
const SLUG_MAX_LENGTH = 60;

export const MESSAGES = Object.freeze({
  nameRequired: 'Vui lòng nhập tên danh mục.',
  nameTooLong: 'Tên danh mục tối đa 50 ký tự.',
  nameNoAlnum: 'Tên danh mục phải chứa ít nhất một chữ cái hoặc chữ số.',
});

/** Chuẩn hoá tên: NFC -> trim -> gộp khoảng trắng liên tiếp thành 1 dấu cách. */
export function normalizeCategoryName(raw) {
  return normalizeName(raw);
}

/**
 * Sinh slug từ tên: bỏ dấu (NFD, \p{M}), đ/Đ -> d, lowercase, ký tự khác [a-z0-9] -> '-',
 * bỏ '-' đầu/cuối, cắt 60 ký tự rồi bỏ '-' cuối. Có thể trả về chuỗi rỗng.
 */
export function slugifyCategoryName(name) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
}

/**
 * Validate body POST/PUT danh mục. Trả { name, slug } hoặc ném 400.
 * Body không phải object -> 400 BAD_REQUEST; trường thừa bị bỏ qua.
 */
export function validateCategoryBody(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  }
  const fail = (message) =>
    new HttpError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', { name: message });

  if (typeof body.name !== 'string') throw fail(MESSAGES.nameRequired);
  const name = normalizeCategoryName(body.name);
  if (name === '') throw fail(MESSAGES.nameRequired);
  if (hasInvalidNameChars(name)) throw fail(INVALID_CHARS_MESSAGE);
  if ([...name].length > NAME_MAX_LENGTH) throw fail(MESSAGES.nameTooLong);
  const slug = slugifyCategoryName(name);
  if (slug === '') throw fail(MESSAGES.nameNoAlnum);
  return { name, slug };
}
