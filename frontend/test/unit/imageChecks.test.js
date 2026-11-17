import { beforeEach, describe, expect, it, vi } from 'vitest';

// loadDimensions dùng Image (jsdom không giải mã ảnh): thay bằng stub, giữ nguyên phần còn lại.
vi.mock('../../src/utils/imageFile.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadDimensions: vi.fn(),
}));

const { loadDimensions } = await import('../../src/utils/imageFile.js');
const { AVATAR_MESSAGES, checkAvatarFile, isRecommendedSize } =
  await import('../../src/utils/avatarCheck.js');
const { PRODUCT_IMAGE_MESSAGES, checkProductImageFile } =
  await import('../../src/utils/productImageCheck.js');

const png = (name = 'a.png') => ({ name, type: 'image/png', size: 1000 });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('isRecommendedSize', () => {
  it.each([
    [720, 960, true], // 3:4
    [1080, 1920, true], // 9:16
    [725, 960, true], // trong dung sai 0.05
    [960, 720, false], // ảnh ngang
    [500, 667, false], // cạnh ngắn < 720
    [720, 720, false], // vuông
    [720, 1600, false], // lệch tỉ lệ
  ])('%i x %i -> %s', (w, h, expected) => {
    expect(isRecommendedSize(w, h)).toBe(expected);
  });
});

describe('checkAvatarFile', () => {
  it('sai loại file -> chặn, không tạo preview', async () => {
    const result = await checkAvatarFile({ name: 'a.gif', type: 'image/gif', size: 1 });
    expect(result.ok).toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('không đọc được ảnh -> chặn và thu hồi preview URL', async () => {
    loadDimensions.mockResolvedValue(null);
    const result = await checkAvatarFile(png());
    expect(result).toEqual({ ok: false, error: AVATAR_MESSAGES.unreadable });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('ảnh đạt chuẩn -> ok, không cảnh báo; người gọi sở hữu previewUrl', async () => {
    loadDimensions.mockResolvedValue({ width: 720, height: 960 });
    const result = await checkAvatarFile(png());
    expect(result).toEqual({ ok: true, previewUrl: 'blob:preview', warning: '' });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('ảnh sai tỉ lệ -> vẫn ok nhưng có cảnh báo (không chặn)', async () => {
    loadDimensions.mockResolvedValue({ width: 960, height: 720 });
    const result = await checkAvatarFile(png());
    expect(result.ok).toBe(true);
    expect(result.warning).toBe(AVATAR_MESSAGES.warning);
  });
});

describe('checkProductImageFile', () => {
  it('cạnh ngắn < 400px -> chặn, thu hồi URL', async () => {
    loadDimensions.mockResolvedValue({ width: 399, height: 1000 });
    const result = await checkProductImageFile(png());
    expect(result).toEqual({ ok: false, error: PRODUCT_IMAGE_MESSAGES.tooSmall });
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('đúng 400x400 -> ok (biên)', async () => {
    loadDimensions.mockResolvedValue({ width: 400, height: 400 });
    const result = await checkProductImageFile(png());
    expect(result).toEqual({ ok: true, previewUrl: 'blob:preview' });
  });

  it('không đọc được kích thước -> lỗi unreadable', async () => {
    loadDimensions.mockResolvedValue(null);
    const result = await checkProductImageFile(png());
    expect(result.error).toBe(PRODUCT_IMAGE_MESSAGES.unreadable);
  });
});
