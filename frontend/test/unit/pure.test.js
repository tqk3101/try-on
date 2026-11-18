import { describe, expect, it } from 'vitest';
import { isTokenExpired } from '../../src/auth/token.js';
import { safeRedirect } from '../../src/routes/safeRedirect.js';
import {
  getPasswordStrength,
  validateConfirmPassword,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
  MESSAGES,
} from '../../src/utils/authValidation.js';
import { formatDigitsWithDots, formatVnd, sanitizePrice } from '../../src/utils/format.js';
import { checkTypeAndSize, IMAGE_MESSAGES } from '../../src/utils/imageFile.js';
import {
  isFormDirty,
  MESSAGES as PROFILE_MESSAGES,
  normalizePhone,
  parseDecimal,
  toFormValues,
  validateProfileForm,
} from '../../src/utils/profileValidation.js';
import { adminProductEditPath, withCategoryFilter } from '../../src/routes/paths.js';

describe('safeRedirect (chống open redirect, D11)', () => {
  it.each([
    ['/profile', '/profile'],
    ['/admin/products?categoryId=abc', '/admin/products?categoryId=abc'],
    ['/profile#top', '/profile#top'],
  ])('chấp nhận đường dẫn nội bộ %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    42,
    'profile',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/login',
    '/login?redirect=/x',
    '/register#a',
  ])('từ chối %s', (input) => {
    expect(safeRedirect(input)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  const jwtWith = (payload) => {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
  };

  it('token còn hạn -> false; hết hạn -> true', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTokenExpired(jwtWith({ exp: now + 3600 }))).toBe(false);
    expect(isTokenExpired(jwtWith({ exp: now - 1 }))).toBe(true);
  });

  it('thiếu exp / hỏng -> coi như hết hạn', () => {
    expect(isTokenExpired(jwtWith({}))).toBe(true);
    expect(isTokenExpired('abc')).toBe(true);
    expect(isTokenExpired('a.%%%.c')).toBe(true);
  });
});

describe('format', () => {
  it('formatVnd', () => {
    expect(formatVnd(199000)).toMatch(/^199\.000\s₫$/);
    expect(formatVnd(0)).toMatch(/^0\s₫$/);
  });

  it('formatDigitsWithDots', () => {
    expect(formatDigitsWithDots('')).toBe('');
    expect(formatDigitsWithDots('1500000')).toBe('1.500.000');
  });

  it('sanitizePrice: chỉ giữ chữ số, bỏ số 0 đầu, tối đa 9 chữ số', () => {
    expect(sanitizePrice('199,000đ')).toBe('199000');
    expect(sanitizePrice('0012')).toBe('12');
    expect(sanitizePrice('abc')).toBe('');
    expect(sanitizePrice('1234567890123')).toBe('123456789');
  });
});

describe('authValidation', () => {
  it('validateEmail', () => {
    expect(validateEmail('  ')).toBe(MESSAGES.emailRequired);
    expect(validateEmail('abc')).toBe(MESSAGES.emailInvalid);
    expect(validateEmail('a b@c.co')).toBe(MESSAGES.emailInvalid);
    expect(validateEmail(' A@B.co ')).toBe('');
  });

  it('validatePassword: bắt buộc + chữ thường/hoa/số + 8-72 ký tự', () => {
    expect(validatePassword('')).toBe(MESSAGES.passwordRequired);
    for (const weak of ['abcdefg1', 'ABCDEFG1', 'Abcdefgh', 'Abc1', `Aa1${'x'.repeat(70)}`]) {
      expect(validatePassword(weak)).toBe(MESSAGES.passwordWeak);
    }
    expect(validatePassword('Abcdefg1')).toBe('');
  });

  it('mật khẩu vượt 72 byte (đa byte) bị từ chối, khớp backend', () => {
    expect(validatePassword(`Aa1${'é'.repeat(40)}`)).toBe(MESSAGES.passwordWeak);
  });

  it('validateConfirmPassword: rỗng không được coi là khớp', () => {
    expect(validateConfirmPassword('', '')).toBe(MESSAGES.confirmMismatch);
    expect(validateConfirmPassword('a', 'b')).toBe(MESSAGES.confirmMismatch);
    expect(validateConfirmPassword('Abcdefg1', 'Abcdefg1')).toBe('');
  });

  it('validateRegisterForm: chỉ trả các trường lỗi', () => {
    expect(
      validateRegisterForm({ email: 'a@b.co', password: 'Abcdefg1', confirmPassword: 'Abcdefg1' }),
    ).toEqual({});
    expect(
      Object.keys(validateRegisterForm({ email: '', password: 'x', confirmPassword: '' })).sort(),
    ).toEqual(['confirmPassword', 'email', 'password']);
  });

  it('validateLoginForm: không áp độ mạnh mật khẩu', () => {
    expect(validateLoginForm({ email: 'a@b.co', password: 'x' })).toEqual({});
    expect(validateLoginForm({ email: 'abc', password: '' })).toEqual({
      email: MESSAGES.emailInvalid,
      password: MESSAGES.passwordRequired,
    });
  });

  it('getPasswordStrength', () => {
    expect(getPasswordStrength('')).toEqual({ score: 0, label: '' });
    expect(getPasswordStrength('abc').label).toBe('Yếu');
    expect(getPasswordStrength('Abcdefg1').label).toBe('Trung bình');
    expect(getPasswordStrength('Abcdefg1!xyz').label).toBe('Mạnh');
  });
});

describe('profileValidation', () => {
  const values = {
    displayName: ' Lan ',
    phone: '+84 912 345 678',
    heightCm: '165,5',
    weightKg: '52',
  };

  it('normalizePhone / parseDecimal', () => {
    expect(normalizePhone('+84 912-345-678')).toBe('0912345678');
    expect(normalizePhone('(091) 234.5678')).toBe('0912345678');
    expect(parseDecimal('50,55')).toBe(50.6);
    expect(Number.isNaN(parseDecimal('abc'))).toBe(true);
    expect(Number.isNaN(parseDecimal('1.2.3'))).toBe(true);
  });

  it('validateProfileForm: payload chuẩn hoá khi hợp lệ', () => {
    const { errors, payload } = validateProfileForm(values);
    expect(errors).toEqual({});
    expect(payload).toEqual({
      displayName: 'Lan',
      phone: '0912345678',
      heightCm: 165.5,
      weightKg: 52,
    });
  });

  it('trường tuỳ chọn rỗng -> null; số đo bắt buộc và đúng khoảng', () => {
    const empty = validateProfileForm({ displayName: '', phone: '', heightCm: '', weightKg: '' });
    expect(empty.errors).toEqual({
      heightCm: PROFILE_MESSAGES.heightRequired,
      weightKg: PROFILE_MESSAGES.weightRequired,
    });
    expect(empty.payload).toMatchObject({ displayName: null, phone: null });

    const range = validateProfileForm({ ...values, heightCm: '99', weightKg: '251' });
    expect(range.errors).toEqual({
      heightCm: PROFILE_MESSAGES.heightRange,
      weightKg: PROFILE_MESSAGES.weightRange,
    });
  });

  it('SĐT sai và tên quá dài', () => {
    const { errors } = validateProfileForm({
      ...values,
      phone: '0212345678',
      displayName: 'a'.repeat(51),
    });
    expect(errors).toEqual({
      displayName: PROFILE_MESSAGES.displayNameTooLong,
      phone: PROFILE_MESSAGES.phoneInvalid,
    });
  });

  it('toFormValues và isFormDirty', () => {
    const profile = { displayName: 'Lan', phone: '0912345678', heightCm: 165, weightKg: 52 };
    expect(
      toFormValues({ displayName: null, phone: null, heightCm: null, weightKg: null }),
    ).toEqual({
      displayName: '',
      phone: '',
      heightCm: '',
      weightKg: '',
    });
    expect(isFormDirty(toFormValues(profile), profile)).toBe(false);
    expect(isFormDirty({ ...toFormValues(profile), displayName: 'Mai' }, profile)).toBe(true);
    // đang nhập sai vẫn tính là đã thay đổi
    expect(isFormDirty({ ...toFormValues(profile), heightCm: '9' }, profile)).toBe(true);
    // khác định dạng nhưng cùng giá trị: không dirty
    expect(
      isFormDirty({ ...toFormValues(profile), phone: '+84912345678', heightCm: '165,0' }, profile),
    ).toBe(false);
  });
});

describe('checkTypeAndSize', () => {
  const file = (name, type, size = 100) => ({ name, type, size });

  it('chấp nhận jpg/jpeg/png (không phân biệt hoa thường)', () => {
    expect(checkTypeAndSize(file('A.JPG', 'image/jpeg'))).toBe('');
    expect(checkTypeAndSize(file('a.png', 'image/png'))).toBe('');
  });

  it('từ chối sai MIME hoặc sai đuôi file', () => {
    expect(checkTypeAndSize(file('a.gif', 'image/gif'))).toBe(IMAGE_MESSAGES.type);
    expect(checkTypeAndSize(file('a.png', 'application/pdf'))).toBe(IMAGE_MESSAGES.type);
    expect(checkTypeAndSize(file('a.exe', 'image/png'))).toBe(IMAGE_MESSAGES.type);
  });

  it('5MB đúng thì qua, vượt thì lỗi', () => {
    expect(checkTypeAndSize(file('a.png', 'image/png', 5 * 1024 * 1024))).toBe('');
    expect(checkTypeAndSize(file('a.png', 'image/png', 5 * 1024 * 1024 + 1))).toBe(
      IMAGE_MESSAGES.size,
    );
  });
});

describe('paths helpers', () => {
  it('adminProductEditPath mã hoá id; withCategoryFilter giữ bộ lọc', () => {
    expect(adminProductEditPath('a/b')).toBe('/admin/products/a%2Fb/edit');
    expect(withCategoryFilter('/admin/products', 'x y')).toBe('/admin/products?categoryId=x%20y');
    expect(withCategoryFilter('/admin/products', '')).toBe('/admin/products');
  });
});
