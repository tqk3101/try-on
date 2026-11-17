import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  validateCategoryFilter,
  validateProductFields,
} from '../../src/validators/productValidator.js';

const CAT = '44444444-4444-4444-8444-444444444444';
const file = { buffer: Buffer.from('x') };
const good = { name: 'Áo thun', price: '199000', categoryId: CAT };
const post = { requireImage: true };

describe('validateProductFields', () => {
  it('hợp lệ: chuẩn hoá tên, giá -> number, categoryId lowercase', () => {
    const { values, fields } = validateProductFields(
      { name: '  Áo   thun ', price: ' 199000 ', categoryId: CAT.toUpperCase() },
      file,
      post,
    );
    expect(fields).toEqual({});
    expect(values).toEqual({ name: 'Áo thun', price: 199000, categoryId: CAT });
  });

  it('gom mọi lỗi cùng lúc, thiếu ảnh khi POST', () => {
    const { fields } = validateProductFields({}, undefined, post);
    expect(fields).toEqual({
      name: MESSAGES.nameRequired,
      price: MESSAGES.priceRequired,
      categoryId: MESSAGES.categoryRequired,
      image: MESSAGES.imageRequired,
    });
  });

  it('PUT không bắt buộc ảnh; body undefined không crash', () => {
    const { fields } = validateProductFields(undefined, undefined, { requireImage: false });
    expect(fields).not.toHaveProperty('image');
  });

  it.each(['0', '-5', '12.5', '1,000', 'abc', '012'])('giá sai định dạng: %s', (price) => {
    const { fields } = validateProductFields({ ...good, price }, file, post);
    expect(fields.price).toBe(MESSAGES.priceFormat);
  });

  it('giá tối đa 100.000.000', () => {
    expect(validateProductFields({ ...good, price: '100000000' }, file, post).values.price).toBe(
      100_000_000,
    );
    expect(validateProductFields({ ...good, price: '100000001' }, file, post).fields.price).toBe(
      MESSAGES.priceTooHigh,
    );
    expect(validateProductFields({ ...good, price: '9'.repeat(20) }, file, post).fields.price).toBe(
      MESSAGES.priceTooHigh,
    );
  });

  it('tên: tối đa 100 ký tự, ký tự điều khiển bị chặn', () => {
    expect(validateProductFields({ ...good, name: 'a'.repeat(101) }, file, post).fields.name).toBe(
      MESSAGES.nameTooLong,
    );
    expect(
      validateProductFields({ ...good, name: 'a\u0000b' }, file, post).fields.name,
    ).toBeTruthy();
  });

  it('categoryId sai định dạng coi như không tồn tại', () => {
    const { fields } = validateProductFields({ ...good, categoryId: 'abc' }, file, post);
    expect(fields.categoryId).toBe(MESSAGES.categoryNotFound);
  });
});

describe('validateCategoryFilter', () => {
  it('không có / rỗng -> null', () => {
    expect(validateCategoryFilter(undefined)).toBeNull();
    expect(validateCategoryFilter({})).toBeNull();
    expect(validateCategoryFilter({ categoryId: '' })).toBeNull();
  });

  it('uuid hợp lệ -> lowercase; sai -> 400 fields.categoryId', () => {
    expect(validateCategoryFilter({ categoryId: CAT.toUpperCase() })).toBe(CAT);
    let err;
    try {
      validateCategoryFilter({ categoryId: 'xyz' });
    } catch (e) {
      err = e;
    }
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(err.fields.categoryId).toBe(MESSAGES.categoryInvalidQuery);
  });
});
