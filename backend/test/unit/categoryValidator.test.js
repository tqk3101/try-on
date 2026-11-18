import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  normalizeCategoryName,
  slugifyCategoryName,
  validateCategoryBody,
} from '../../src/validators/categoryValidator.js';

function failure(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('Mong đợi ném lỗi nhưng không có');
}

describe('slugifyCategoryName', () => {
  it.each([
    ['Áo thun', 'ao-thun'],
    ['Đầm & Váy', 'dam-vay'],
    ['  Quần   Jeans  ', 'quan-jeans'],
    ['Đồ-Lót 2024', 'do-lot-2024'],
    ['!!!', ''],
  ])('%s -> %s', (name, slug) => {
    expect(slugifyCategoryName(name)).toBe(slug);
  });

  it('cắt 60 ký tự và không để dấu - ở cuối', () => {
    const slug = slugifyCategoryName(`${'a'.repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('normalizeCategoryName', () => {
  it('NFC + trim + gộp khoảng trắng', () => {
    expect(normalizeCategoryName('  A \t  B ')).toBe('A B');
    expect(normalizeCategoryName('é')).toBe('é');
  });
});

describe('validateCategoryBody', () => {
  it('trả { name, slug }, bỏ qua trường thừa', () => {
    expect(validateCategoryBody({ name: ' Áo  khoác ', slug: 'hack' })).toEqual({
      name: 'Áo khoác',
      slug: 'ao-khoac',
    });
  });

  it('thiếu / không phải string / rỗng -> nameRequired', () => {
    for (const body of [{}, { name: 5 }, { name: '   ' }]) {
      expect(failure(() => validateCategoryBody(body)).fields.name).toBe(MESSAGES.nameRequired);
    }
  });

  it('tối đa 50 ký tự', () => {
    expect(validateCategoryBody({ name: 'a'.repeat(50) }).name).toHaveLength(50);
    expect(failure(() => validateCategoryBody({ name: 'a'.repeat(51) })).fields.name).toBe(
      MESSAGES.nameTooLong,
    );
  });

  it('không có chữ/số nào -> nameNoAlnum', () => {
    expect(failure(() => validateCategoryBody({ name: '---' })).fields.name).toBe(
      MESSAGES.nameNoAlnum,
    );
  });

  it('ký tự điều khiển / U+FFFD bị chặn', () => {
    expect(failure(() => validateCategoryBody({ name: 'a\u0007b' })).code).toBe('VALIDATION_ERROR');
    expect(failure(() => validateCategoryBody({ name: 'a�b' })).code).toBe('VALIDATION_ERROR');
  });

  it('body không phải object -> BAD_REQUEST', () => {
    expect(failure(() => validateCategoryBody(null)).code).toBe('BAD_REQUEST');
  });
});
