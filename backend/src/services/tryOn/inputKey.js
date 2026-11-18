import { createHash } from 'node:crypto';

/**
 * Khoá cache: sha256 hex của (provider, model, promptVersion, avatar_path, product image_path
 * [, số đo nếu provider dùng]). JSON mảng để không nhập nhằng ranh giới giữa các trường.
 * Đổi bất kỳ thành phần nào -> khoá mới -> tự sinh lại (try-on-room.md mục 1, 3).
 */
export function computeInputKey({ provider, avatarPath, productImagePath, heightCm, weightKg }) {
  const parts = [
    provider.name,
    provider.model,
    provider.promptVersion,
    avatarPath,
    productImagePath,
    provider.usesMeasurements ? [Number(heightCm), Number(weightKg)] : null,
  ];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
