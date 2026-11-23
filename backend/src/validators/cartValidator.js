import { HttpError } from '../middlewares/httpError.js';
import { isPlainObject, isUuid } from './common.js';

export const CART_MAX_LINES = 50;
export const CART_MAX_QUANTITY = 10;

const VALIDATION_MESSAGE = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
const PRODUCT_MESSAGE = 'Sản phẩm không hợp lệ.';
export const QUANTITY_MESSAGE = `Số lượng phải từ 1 đến ${CART_MAX_QUANTITY}.`;

const validationError = (fields) =>
  new HttpError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, fields);

/** Số lượng: JSON number nguyên 1..10 (không nhận chuỗi "2"). */
function isValidQuantity(value) {
  return Number.isInteger(value) && value >= 1 && value <= CART_MAX_QUANTITY;
}

function requireBody(body) {
  if (!isPlainObject(body)) throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  return body;
}

/** POST /cart/items: { productId, quantity? } -> { productId, quantity } (quantity mặc định 1). */
export function validateAddItemBody(rawBody) {
  const body = requireBody(rawBody);
  const fields = {};
  if (!isUuid(body.productId)) fields.productId = PRODUCT_MESSAGE;
  const quantity = body.quantity === undefined ? 1 : body.quantity;
  if (!isValidQuantity(quantity)) fields.quantity = QUANTITY_MESSAGE;
  if (Object.keys(fields).length > 0) throw validationError(fields);
  return { productId: body.productId, quantity };
}

/** PUT /cart/items/:productId: { quantity } tuyệt đối. */
export function validateSetQuantityBody(rawBody) {
  const body = requireBody(rawBody);
  if (!isValidQuantity(body.quantity)) throw validationError({ quantity: QUANTITY_MESSAGE });
  return { quantity: body.quantity };
}

/** `:productId` trên path (PUT/DELETE) phải là uuid. */
export function validateProductIdParam(value) {
  if (!isUuid(value)) throw validationError({ productId: PRODUCT_MESSAGE });
  return value;
}
