// Cùng bộ quy tắc với server (design/flows/profile.md mục 2). Server vẫn quyết định cuối cùng.

export const FIELD_ORDER = ['displayName', 'phone', 'heightCm', 'weightKg'];

const DISPLAY_NAME_MAX = 50;
const PHONE_REGEX = /^0[35789][0-9]{8}$/;
const HEIGHT_RANGE = [100, 250];
const WEIGHT_RANGE = [30, 250];

export const MESSAGES = {
  displayNameTooLong: 'Tên hiển thị tối đa 50 ký tự.',
  phoneInvalid: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (ví dụ 0912345678).',
  heightRequired: 'Vui lòng nhập chiều cao.',
  heightRange: 'Chiều cao phải từ 100 đến 250 cm.',
  weightRequired: 'Vui lòng nhập cân nặng.',
  weightRange: 'Cân nặng phải từ 30 đến 250 kg.',
};

/** Bỏ khoảng trắng, `.`, `-`, `(`, `)`; đầu `+84` hoặc `84` -> `0`. */
export function normalizePhone(value) {
  return value.replace(/[\s.\-()]/g, '').replace(/^\+?84/, '0');
}

/** "50,5" -> 50.5 (làm tròn 1 chữ số thập phân); không phải số hợp lệ -> NaN. */
export function parseDecimal(value) {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return NaN;
  return Math.round(Number(text) * 10) / 10;
}

function validateMeasure(raw, [min, max], requiredMessage, rangeMessage) {
  if (raw.trim() === '') return { error: requiredMessage };
  const number = parseDecimal(raw);
  if (!Number.isFinite(number) || number < min || number > max) return { error: rangeMessage };
  return { value: number };
}

/**
 * values: { displayName, phone, heightCm, weightKg } đều là chuỗi (giá trị ô nhập).
 * Trả về { errors: { tênTrường: message }, payload } — payload là body gửi PUT /user/profile
 * (số là number), chỉ dùng khi errors rỗng.
 */
export function validateProfileForm(values) {
  const errors = {};
  const payload = {};

  const name = values.displayName.trim();
  if ([...name].length > DISPLAY_NAME_MAX) errors.displayName = MESSAGES.displayNameTooLong;
  payload.displayName = name === '' ? null : name;

  const phoneRaw = values.phone.trim();
  if (phoneRaw === '') {
    payload.phone = null;
  } else {
    const phone = normalizePhone(phoneRaw);
    if (PHONE_REGEX.test(phone)) payload.phone = phone;
    else errors.phone = MESSAGES.phoneInvalid;
  }

  const height = validateMeasure(
    values.heightCm,
    HEIGHT_RANGE,
    MESSAGES.heightRequired,
    MESSAGES.heightRange,
  );
  if (height.error) errors.heightCm = height.error;
  else payload.heightCm = height.value;

  const weight = validateMeasure(
    values.weightKg,
    WEIGHT_RANGE,
    MESSAGES.weightRequired,
    MESSAGES.weightRange,
  );
  if (weight.error) errors.weightKg = weight.error;
  else payload.weightKg = weight.value;

  return { errors, payload };
}

/** Profile (API) -> giá trị các ô nhập. */
export function toFormValues(profile) {
  return {
    displayName: profile.displayName ?? '',
    phone: profile.phone ?? '',
    heightCm: profile.heightCm == null ? '' : String(profile.heightCm),
    weightKg: profile.weightKg == null ? '' : String(profile.weightKg),
  };
}

/** Phần text của profile ở dạng payload, để so sánh "có thay đổi chưa". */
export function profileToPayload(profile) {
  return {
    displayName: profile.displayName ?? null,
    phone: profile.phone ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
  };
}

/** Form có khác dữ liệu đã lưu không (kể cả khi đang có lỗi nhập). */
export function isFormDirty(values, profile) {
  const { errors, payload } = validateProfileForm(values);
  if (Object.keys(errors).length === 0) {
    const saved = profileToPayload(profile);
    return FIELD_ORDER.some((key) => payload[key] !== saved[key]);
  }
  const initial = toFormValues(profile);
  return FIELD_ORDER.some((key) => values[key].trim() !== initial[key]);
}
