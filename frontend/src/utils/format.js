const vndFormatter = new Intl.NumberFormat('vi-VN');

/** 199000 -> "199.000 ₫" */
export function formatVnd(amount) {
  return `${vndFormatter.format(amount)} ₫`;
}

/** Chuỗi chữ số -> "199.000" (không kèm đơn vị), dùng trong ô nhập giá. */
export function formatDigitsWithDots(digits) {
  return digits === '' ? '' : vndFormatter.format(Number(digits));
}

export const PRICE_MAX_DIGITS = 9;

/** Làm sạch về chữ số ("199,000", "199.000đ" -> "199000"), bỏ số 0 đầu, tối đa 9 chữ số. */
export function sanitizePrice(raw) {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, PRICE_MAX_DIGITS);
}
