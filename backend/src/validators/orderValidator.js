import { HttpError } from '../middlewares/httpError.js';
import { MESSAGES as PROFILE_MESSAGES, normalizePhone, PHONE_REGEX } from './profileValidator.js';
import { hasInvalidNameChars, isPlainObject, isUuid, normalizeName } from './common.js';

export const ORDER_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled',
]);
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

const VALIDATION_MESSAGE = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
const MESSAGES = Object.freeze({
  idempotencyKey: 'Mã đặt hàng không hợp lệ. Vui lòng tải lại trang.',
  recipientName: 'Vui lòng nhập họ tên người nhận (tối đa 100 ký tự).',
  recipientNameInvalid: 'Họ tên chứa ký tự không hợp lệ.',
  phone: PROFILE_MESSAGES.phoneInvalid,
  address: 'Địa chỉ giao hàng phải từ 10 đến 500 ký tự.',
  addressInvalid: 'Địa chỉ chứa ký tự không hợp lệ.',
  note: 'Ghi chú tối đa 500 ký tự.',
  noteInvalid: 'Ghi chú chứa ký tự không hợp lệ.',
  expectedTotal: 'Tổng tiền không hợp lệ. Vui lòng tải lại giỏ hàng.',
  status: 'Trạng thái đơn hàng không hợp lệ.',
  page: 'Số trang không hợp lệ.',
  pageSize: `Số đơn mỗi trang phải từ 1 đến ${MAX_PAGE_SIZE}.`,
});

const validationError = (fields) =>
  new HttpError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, fields);

export const orderNotFound = () =>
  new HttpError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');

// Ghi chú nhiều dòng được phép: bỏ tab/xuống dòng trước khi kiểm tra ký tự điều khiển và U+FFFD.
const hasInvalidNoteChars = (note) => hasInvalidNameChars(note.replace(/[\t\n\r]/g, ''));

const charLength = (text) => [...text].length;

/**
 * POST /orders -> { idempotencyKey, recipientName, phone, shippingAddress, note, expectedTotal }
 * đã chuẩn hoá. Trường lạ (kể cả giá/tổng do client tự đặt) bị bỏ qua.
 */
export function validateCreateOrderBody(rawBody) {
  if (!isPlainObject(rawBody)) throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  const body = rawBody;
  const fields = {};
  const result = {};

  if (isUuid(body.idempotencyKey)) result.idempotencyKey = body.idempotencyKey.toLowerCase();
  else fields.idempotencyKey = MESSAGES.idempotencyKey;

  if (typeof body.recipientName !== 'string') {
    fields.recipientName = MESSAGES.recipientName;
  } else {
    const name = normalizeName(body.recipientName);
    if (name === '' || charLength(name) > 100) fields.recipientName = MESSAGES.recipientName;
    else if (hasInvalidNameChars(name)) fields.recipientName = MESSAGES.recipientNameInvalid;
    else result.recipientName = name;
  }

  if (typeof body.phone !== 'string') {
    fields.phone = MESSAGES.phone;
  } else {
    const phone = normalizePhone(body.phone);
    if (PHONE_REGEX.test(phone)) result.phone = phone;
    else fields.phone = MESSAGES.phone;
  }

  if (typeof body.shippingAddress !== 'string') {
    fields.shippingAddress = MESSAGES.address;
  } else {
    const address = normalizeName(body.shippingAddress);
    const length = charLength(address);
    if (length < 10 || length > 500) fields.shippingAddress = MESSAGES.address;
    else if (hasInvalidNameChars(address)) fields.shippingAddress = MESSAGES.addressInvalid;
    else result.shippingAddress = address;
  }

  if (body.note === undefined || body.note === null) {
    result.note = null;
  } else if (typeof body.note !== 'string') {
    fields.note = MESSAGES.note;
  } else {
    const note = body.note.normalize('NFC').trim();
    if (note === '') result.note = null;
    else if (charLength(note) > 500) fields.note = MESSAGES.note;
    else if (hasInvalidNoteChars(note)) fields.note = MESSAGES.noteInvalid;
    else result.note = note;
  }

  if (Number.isSafeInteger(body.expectedTotal) && body.expectedTotal >= 0) {
    result.expectedTotal = body.expectedTotal;
  } else {
    fields.expectedTotal = MESSAGES.expectedTotal;
  }

  if (Object.keys(fields).length > 0) throw validationError(fields);
  return result;
}

/** `:id` đơn trên path: không phải uuid -> 404 ngay (không gửi xuống DB, tránh lỗi 22P02). */
export function validateOrderIdParam(value) {
  if (!isUuid(value)) throw orderNotFound();
  return value;
}

const DIGITS = /^\d+$/;

/** GET /admin/orders?status&page&pageSize -> { status|null, page, pageSize }. */
export function validateAdminOrderQuery(query) {
  const fields = {};
  let status = null;
  let page = 1;
  let pageSize = DEFAULT_PAGE_SIZE;

  if (query.status !== undefined) {
    if (typeof query.status === 'string' && ORDER_STATUSES.includes(query.status)) {
      status = query.status;
    } else {
      fields.status = MESSAGES.status;
    }
  }
  if (query.page !== undefined) {
    const value =
      typeof query.page === 'string' && DIGITS.test(query.page) ? Number(query.page) : 0;
    // Giới hạn để offset (page * pageSize) luôn là số nguyên an toàn.
    if (value >= 1 && value <= 1_000_000) page = value;
    else fields.page = MESSAGES.page;
  }
  if (query.pageSize !== undefined) {
    const value =
      typeof query.pageSize === 'string' && DIGITS.test(query.pageSize)
        ? Number(query.pageSize)
        : 0;
    if (value >= 1 && value <= MAX_PAGE_SIZE) pageSize = value;
    else fields.pageSize = MESSAGES.pageSize;
  }

  if (Object.keys(fields).length > 0) throw validationError(fields);
  return { status, page, pageSize };
}
