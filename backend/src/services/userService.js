import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';

export const AVATAR_BUCKET = 'avatars';
const SIGNED_URL_TTL_SECONDS = 3600;
// Cột tường minh: không bao giờ select password_hash; avatar_path không trả ra client.
const PROFILE_COLUMNS =
  'id, email, role, display_name, phone, height_cm, weight_kg, avatar_path, created_at, updated_at';

const invalidToken = () => new HttpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');

function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'} ${error.message}`);
}

const toNumberOrNull = (value) => (value === null || value === undefined ? null : Number(value));

/** Ký URL ảnh (TTL 3600s). Lỗi chỉ log (không log URL/path), trả null. */
async function signAvatarUrl(avatarPath) {
  if (!avatarPath) return null;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(avatarPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('[storage] Ký signed URL avatar thất bại:', error?.message ?? 'no url');
    return null;
  }
  return data.signedUrl;
}

async function toProfile(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    phone: row.phone,
    heightCm: toNumberOrNull(row.height_cm),
    weightKg: toNumberOrNull(row.weight_kg),
    avatarUrl: await signAvatarUrl(row.avatar_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Cập nhật profiles theo id và trả Profile; 0 dòng -> 401 INVALID_TOKEN. */
async function updateProfileRow(userId, changes) {
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) throw dbError('update profiles', error);
  if (!data) throw invalidToken();
  return toProfile(data);
}

/** GET /api/user/profile: user không còn tồn tại -> 401 INVALID_TOKEN. */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw dbError('select profiles', error);
  if (!data) throw invalidToken();
  return toProfile(data);
}

/** PUT /api/user/profile: nhận dữ liệu đã validate/chuẩn hoá. */
export function updateProfile(userId, { displayName, phone, heightCm, weightKg }) {
  return updateProfileRow(userId, {
    display_name: displayName,
    phone,
    height_cm: heightCm,
    weight_kg: weightKg,
  });
}

/** Lấy avatar_path hiện tại (có thể null); không có dòng -> 401. */
export async function getAvatarPath(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw dbError('select profiles.avatar_path', error);
  if (!data) throw invalidToken();
  return data.avatar_path;
}

/** Đặt avatar_path (path mới hoặc null) và trả Profile. */
export function setAvatarPath(userId, avatarPath) {
  return updateProfileRow(userId, { avatar_path: avatarPath });
}

/** Xoá object khỏi Storage, best-effort: lỗi chỉ log (file mồ côi), không ném. */
export async function removeAvatarObject(path) {
  try {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (error) console.error('[storage] Xoá object avatar thất bại:', error.message);
  } catch (err) {
    console.error('[storage] Xoá object avatar thất bại:', err?.message ?? err);
  }
}

export async function uploadAvatarObject(path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) {
    console.error('[storage] Upload avatar thất bại:', error.message);
    throw new HttpError(502, 'UPLOAD_FAILED', 'Không thể tải ảnh lên lúc này. Vui lòng thử lại.');
  }
}
