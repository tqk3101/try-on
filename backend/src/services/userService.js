import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';
import { signUrl } from './storageService.js';

export const AVATAR_BUCKET = 'avatars';
// Cột tường minh: không bao giờ select password_hash; avatar_path không trả ra client.
const PROFILE_COLUMNS =
  'id, email, role, display_name, phone, height_cm, weight_kg, avatar_path, created_at, updated_at';

const invalidToken = () => new HttpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');

function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'} ${error.message}`);
}

const toNumberOrNull = (value) => (value === null || value === undefined ? null : Number(value));

async function toProfile(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    phone: row.phone,
    heightCm: toNumberOrNull(row.height_cm),
    weightKg: toNumberOrNull(row.weight_kg),
    avatarUrl: await signUrl(AVATAR_BUCKET, row.avatar_path),
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
