import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  normalizeEmail,
  validateLoginBody,
  validateRegisterBody,
} from '../../src/validators/authValidator.js';

const valid = { email: 'a@b.co', password: 'Abcdefg1', confirmPassword: 'Abcdefg1' };

function failure(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('Mong đợi ném lỗi nhưng không có');
}

describe('normalizeEmail', () => {
  it('trim + lowercase, non-string -> chuỗi rỗng', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(123)).toBe('');
  });
});

describe('validateRegisterBody', () => {
  it('chấp nhận dữ liệu hợp lệ và chuẩn hoá email', () => {
    expect(validateRegisterBody({ ...valid, email: '  User@Example.COM ' })).toEqual({
      email: 'user@example.com',
      password: 'Abcdefg1',
    });
  });

  it('bỏ qua trường thừa (role)', () => {
    const result = validateRegisterBody({ ...valid, role: 'admin' });
    expect(result).not.toHaveProperty('role');
  });

  it('body không phải object -> 400 BAD_REQUEST', () => {
    for (const body of [undefined, null, [], 'x']) {
      const err = failure(() => validateRegisterBody(body));
      expect(err).toMatchObject({ status: 400, code: 'BAD_REQUEST' });
    }
  });

  it('gom mọi lỗi trường cùng lúc', () => {
    const err = failure(() => validateRegisterBody({}));
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(err.fields).toEqual({
      email: MESSAGES.emailRequired,
      password: MESSAGES.passwordRequired,
      confirmPassword: MESSAGES.confirmMismatch,
    });
  });

  it.each([
    ['thiếu chữ hoa', 'abcdefg1'],
    ['thiếu chữ thường', 'ABCDEFG1'],
    ['thiếu chữ số', 'Abcdefgh'],
    ['quá ngắn', 'Abc1'],
    ['quá dài (> 72 ký tự)', `Aa1${'x'.repeat(70)}`],
  ])('mật khẩu yếu: %s', (_label, password) => {
    const err = failure(() =>
      validateRegisterBody({ ...valid, password, confirmPassword: password }),
    );
    expect(err.fields.password).toBe(MESSAGES.passwordWeak);
  });

  it('mật khẩu vượt 72 byte dù ít hơn 72 ký tự -> yếu', () => {
    const password = `Aa1${'é'.repeat(40)}`; // 43 ký tự, 83 byte
    const err = failure(() =>
      validateRegisterBody({ ...valid, password, confirmPassword: password }),
    );
    expect(err.fields.password).toBe(MESSAGES.passwordWeak);
  });

  it('mật khẩu không phải string -> yếu', () => {
    const err = failure(() => validateRegisterBody({ ...valid, password: 12345678 }));
    expect(err.fields.password).toBe(MESSAGES.passwordWeak);
  });

  it.each(['abc', 'a@b', 'a b@c.com', '@b.com'])('email sai định dạng: %s', (email) => {
    const err = failure(() => validateRegisterBody({ ...valid, email }));
    expect(err.fields.email).toBe(MESSAGES.emailInvalid);
  });

  it('email quá dài (> 254) sai định dạng', () => {
    const email = `${'a'.repeat(250)}@b.co`;
    expect(failure(() => validateRegisterBody({ ...valid, email })).fields.email).toBe(
      MESSAGES.emailInvalid,
    );
  });

  it('confirmPassword thiếu hoặc khác -> lỗi (undefined === undefined không lọt)', () => {
    const missing = failure(() => validateRegisterBody({ email: valid.email, password: 'x' }));
    expect(missing.fields.confirmPassword).toBe(MESSAGES.confirmMismatch);
    const diff = failure(() => validateRegisterBody({ ...valid, confirmPassword: 'Other123' }));
    expect(diff.fields.confirmPassword).toBe(MESSAGES.confirmMismatch);
  });
});

describe('validateLoginBody', () => {
  it('chỉ cần email + password không rỗng (không áp độ mạnh mật khẩu)', () => {
    expect(validateLoginBody({ email: ' A@B.co ', password: 'x' })).toEqual({
      email: 'a@b.co',
      password: 'x',
    });
  });

  it('thiếu trường -> 400 VALIDATION_ERROR với fields', () => {
    const err = failure(() => validateLoginBody({ email: '', password: '' }));
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(Object.keys(err.fields).sort()).toEqual(['email', 'password']);
  });

  it('password không phải string -> lỗi', () => {
    const err = failure(() => validateLoginBody({ email: 'a@b.co', password: 123 }));
    expect(err.fields.password).toBe(MESSAGES.passwordRequired);
  });

  it('body không phải object -> BAD_REQUEST', () => {
    expect(failure(() => validateLoginBody(null))).toMatchObject({ code: 'BAD_REQUEST' });
  });
});
