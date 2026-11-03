import { checkTypeAndSize, IMAGE_MESSAGES, loadDimensions } from './imageFile.js';

// Phải khớp MIN_IMAGE_SIDE ở backend (validators/productValidator.js). Q10: không kiểm tra tỷ lệ.
export const PRODUCT_IMAGE_MIN_SIDE = 400;

export const PRODUCT_IMAGE_MESSAGES = {
  ...IMAGE_MESSAGES,
  tooSmall: `Ảnh quá nhỏ, cần tối thiểu ${PRODUCT_IMAGE_MIN_SIDE}×${PRODUCT_IMAGE_MIN_SIDE} px.`,
};

/**
 * Kiểm tra ảnh flat lay: loại, dung lượng, kích thước tối thiểu (cả hai cạnh).
 * Trả { ok: false, error } hoặc { ok: true, previewUrl }.
 * NGƯỜI GỌI sở hữu `previewUrl` và phải gọi URL.revokeObjectURL khi đổi ảnh / bỏ ảnh / unmount.
 */
export async function checkProductImageFile(file) {
  const basicError = checkTypeAndSize(file);
  if (basicError) return { ok: false, error: basicError };

  const previewUrl = URL.createObjectURL(file);
  const size = await loadDimensions(previewUrl);
  if (!size) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: PRODUCT_IMAGE_MESSAGES.unreadable };
  }
  if (Math.min(size.width, size.height) < PRODUCT_IMAGE_MIN_SIDE) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: PRODUCT_IMAGE_MESSAGES.tooSmall };
  }
  return { ok: true, previewUrl };
}
