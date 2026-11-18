// Validate form đặt hàng phía client; cùng quy tắc với server (design/flows/cart-and-orders.md mục 3).
// Server vẫn quyết định cuối cùng (400 VALIDATION_ERROR `fields` được map lại vào từng ô).
import { normalizePhone, PHONE_REGEX } from '../../utils/profileValidation.js';

export const CHECKOUT_FIELD_ORDER = ['recipientName', 'phone', 'shippingAddress', 'note'];

const NAME_MAX = 100;
const ADDRESS_RANGE = [10, 500];
const NOTE_MAX = 500;

export const CHECKOUT_MESSAGES = {
  nameRequired: 'Vui lòng nhập họ tên người nhận.',
  nameTooLong: 'Họ tên tối đa 100 ký tự.',
  phoneRequired: 'Vui lòng nhập số điện thoại.',
  phoneInvalid: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (ví dụ 0912345678).',
  addressRequired: 'Vui lòng nhập địa chỉ giao hàng.',
  addressTooShort: 'Địa chỉ giao hàng cần ít nhất 10 ký tự (số nhà, đường, phường/xã, tỉnh/thành).',
  addressTooLong: 'Địa chỉ giao hàng tối đa 500 ký tự.',
  noteTooLong: 'Ghi chú tối đa 500 ký tự.',
};

/** NFC + bỏ khoảng trắng đầu/cuối + gộp khoảng trắng liên tiếp (giống `normalizeName` của server). */
export const normalizeText = (value) => value.normalize('NFC').trim().replace(/\s+/g, ' ');

/**
 * values: { recipientName, phone, shippingAddress, note } đều là chuỗi.
 * Trả về { errors: { tênTrường: message }, payload } — payload là phần body gửi POST /api/orders
 * (chưa gồm idempotencyKey/expectedTotal); chỉ dùng khi errors rỗng. `note` rỗng -> null.
 */
export function validateCheckoutForm(values) {
  const errors = {};

  const recipientName = normalizeText(values.recipientName);
  if (recipientName === '') errors.recipientName = CHECKOUT_MESSAGES.nameRequired;
  else if ([...recipientName].length > NAME_MAX) errors.recipientName = CHECKOUT_MESSAGES.nameTooLong;

  const phoneRaw = values.phone.trim();
  const phone = normalizePhone(phoneRaw);
  if (phoneRaw === '') errors.phone = CHECKOUT_MESSAGES.phoneRequired;
  else if (!PHONE_REGEX.test(phone)) errors.phone = CHECKOUT_MESSAGES.phoneInvalid;

  const shippingAddress = normalizeText(values.shippingAddress);
  if (shippingAddress === '') errors.shippingAddress = CHECKOUT_MESSAGES.addressRequired;
  else if ([...shippingAddress].length < ADDRESS_RANGE[0]) {
    errors.shippingAddress = CHECKOUT_MESSAGES.addressTooShort;
  } else if ([...shippingAddress].length > ADDRESS_RANGE[1]) {
    errors.shippingAddress = CHECKOUT_MESSAGES.addressTooLong;
  }

  const note = values.note.trim();
  if ([...note].length > NOTE_MAX) errors.note = CHECKOUT_MESSAGES.noteTooLong;

  return {
    errors,
    payload: { recipientName, phone, shippingAddress, note: note === '' ? null : note },
  };
}
