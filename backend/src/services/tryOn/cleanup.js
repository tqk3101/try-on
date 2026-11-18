import { removeObjects } from '../storageService.js';
import { RESULT_BUCKET } from './jobRunner.js';
import { createTryOnRepository } from './tryOnRepository.js';

const repo = createTryOnRepository();

/**
 * Dọn kết quả thử đồ của user (khi thay/xoá ảnh toàn thân): xoá rows trước, object sau.
 * Best-effort: lỗi chỉ log để không làm hỏng API avatar (cache cũ vô hiệu nhờ input_key đổi).
 */
export async function deleteTryOnResultsOfProfile(profileId) {
  try {
    await removeObjects(RESULT_BUCKET, await repo.deleteByProfile(profileId));
  } catch (err) {
    console.error('[try-on] Dọn kết quả theo user thất bại:', err.message);
  }
}

/** Dọn kết quả theo sản phẩm (admin thay ảnh flat lay): xoá rows trước, object sau. */
export async function deleteTryOnResultsOfProduct(productId) {
  try {
    await removeObjects(RESULT_BUCKET, await repo.deleteByProduct(productId));
  } catch (err) {
    console.error('[try-on] Dọn kết quả theo sản phẩm thất bại:', err.message);
  }
}

/**
 * Lấy result_path của sản phẩm TRƯỚC khi xoá sản phẩm (FK CASCADE sẽ xoá rows nên không còn
 * đường dẫn để dọn object). Trả [] nếu lỗi (chỉ log).
 */
export async function listTryOnResultPathsOfProduct(productId) {
  try {
    return await repo.listResultPathsByProduct(productId);
  } catch (err) {
    console.error('[try-on] Đọc kết quả theo sản phẩm thất bại:', err.message);
    return [];
  }
}

/** Xoá object kết quả theo danh sách path (sau khi row đã bị xoá). */
export function removeTryOnResultObjects(paths) {
  return removeObjects(RESULT_BUCKET, paths);
}
