import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  normalizePhone,
  validateProfileBody,
} from '../../src/validators/profileValidator.js';

const valid = { displayName: 'Lan', phone: '0912345678', heightCm: 165, weightKg: 52 };

function failure(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('Mong đợi ném lỗi nhưng không có');
}

describe('normalizePhone', () => {
  it.each([
    ['+84 912 345 678', '0912345678'],
    ['84912345678', '0912345678'],
    ['(091) 234-5678', '0912345678'],
    ['091.234.5678', '0912345678'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });
});

describe('validateProfileBody', () => {
  it('chấp nhận hợp lệ, bỏ qua trường lạ', () => {
    const result = validateProfileBody({ ...valid, role: 'admin', email: 'x@y.z', id: '1' });
    expect(result).toEqual({
      displayName: 'Lan',
      phone: '0912345678',
      heightCm: 165,
      weightKg: 52,
    });
  });

  it('displayName/phone rỗng hoặc thiếu -> null', () => {
    const result = validateProfileBody({
      heightCm: 170,
      weightKg: 60,
      displayName: '  ',
      phone: '',
    });
    expect(result.displayName).toBeNull();
    expect(result.phone).toBeNull();
    const missing = validateProfileBody({ heightCm: 170, weightKg: 60 });
    expect(missing.displayName).toBeNull();
    expect(missing.phone).toBeNull();
  });

  it('chuẩn hoá SĐT +84', () => {
    expect(validateProfileBody({ ...valid, phone: '+84 912 345 678' }).phone).toBe('0912345678');
  });

  it('SĐT sai (đầu số 02, thiếu số, không phải string)', () => {
    for (const phone of ['0212345678', '091234567', 123]) {
      expect(failure(() => validateProfileBody({ ...valid, phone })).fields.phone).toBe(
        MESSAGES.phoneInvalid,
      );
    }
  });

  it('displayName tối đa 50 ký tự và phải là string', () => {
    expect(validateProfileBody({ ...valid, displayName: 'a'.repeat(50) }).displayName).toHaveLength(
      50,
    );
    expect(
      failure(() => validateProfileBody({ ...valid, displayName: 'a'.repeat(51) })).fields
        .displayName,
    ).toBe(MESSAGES.displayNameTooLong);
    expect(
      failure(() => validateProfileBody({ ...valid, displayName: 5 })).fields.displayName,
    ).toBe(MESSAGES.displayNameInvalid);
  });

  it('số đo bắt buộc', () => {
    const err = failure(() => validateProfileBody({}));
    expect(err.fields).toEqual({
      heightCm: MESSAGES.heightRequired,
      weightKg: MESSAGES.weightRequired,
    });
  });

  it('biên khoảng chiều cao / cân nặng', () => {
    expect(validateProfileBody({ ...valid, heightCm: 100, weightKg: 30 })).toMatchObject({
      heightCm: 100,
      weightKg: 30,
    });
    expect(validateProfileBody({ ...valid, heightCm: 250, weightKg: 250 })).toMatchObject({
      heightCm: 250,
      weightKg: 250,
    });
    const err = failure(() => validateProfileBody({ ...valid, heightCm: 99.9, weightKg: 250.1 }));
    expect(err.fields).toEqual({ heightCm: MESSAGES.heightRange, weightKg: MESSAGES.weightRange });
  });

  it('làm tròn 1 chữ số thập phân trước khi kiểm tra khoảng', () => {
    expect(validateProfileBody({ ...valid, heightCm: 99.96 }).heightCm).toBe(100);
    expect(validateProfileBody({ ...valid, weightKg: 52.46 }).weightKg).toBe(52.5);
  });

  it('số đo là chuỗi / NaN / Infinity -> lỗi khoảng', () => {
    for (const heightCm of ['165', NaN, Infinity]) {
      expect(failure(() => validateProfileBody({ ...valid, heightCm })).fields.heightCm).toBe(
        MESSAGES.heightRange,
      );
    }
  });

  it('body không phải object -> BAD_REQUEST', () => {
    expect(failure(() => validateProfileBody([])).code).toBe('BAD_REQUEST');
  });
});
