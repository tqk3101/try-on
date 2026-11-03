import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';

export const SIGNED_URL_TTL_SECONDS = 3600;

/** Upload object vào bucket (không ghi đè). Lỗi Storage -> 502 UPLOAD_FAILED (không lộ chi tiết). */
export async function uploadObject(bucket, path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) {
    console.error(`[storage] Upload ${bucket} thất bại:`, error.message);
    throw new HttpError(502, 'UPLOAD_FAILED', 'Không thể tải ảnh lên lúc này. Vui lòng thử lại.');
  }
}

/** Xoá object khỏi bucket, best-effort: lỗi chỉ log (file mồ côi), không ném. */
export async function removeObject(bucket, path) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.error(`[storage] Xoá object ${bucket} thất bại:`, error.message);
  } catch (err) {
    console.error(`[storage] Xoá object ${bucket} thất bại:`, err?.message ?? err);
  }
}

/** Ký URL một object (TTL 3600s). Lỗi chỉ log (không log URL/path), trả null. */
export async function signUrl(bucket, path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error(`[storage] Ký signed URL ${bucket} thất bại:`, error?.message ?? 'no url');
    return null;
  }
  return data.signedUrl;
}

/**
 * Ký URL theo lô bằng một lời gọi. Trả Map path -> url|null; lỗi cả lô hoặc từng path -> null
 * (chỉ log, không fail request).
 */
export async function signUrls(bucket, paths) {
  const result = new Map();
  const unique = [...new Set(paths.filter(Boolean))];
  unique.forEach((path) => result.set(path, null));
  if (unique.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !Array.isArray(data)) {
    console.error(`[storage] Ký signed URL lô ${bucket} thất bại:`, error?.message ?? 'no data');
    return result;
  }
  for (const item of data) {
    if (item.signedUrl && !item.error) result.set(item.path, item.signedUrl);
    else console.error(`[storage] Ký signed URL ${bucket} thất bại cho 1 object.`);
  }
  return result;
}
