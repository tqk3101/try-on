import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';

function toUser(row) {
  return { id: row.id, email: row.email, role: row.role, displayName: row.display_name };
}

/**
 * Lấy hồ sơ theo id trong token. Không có dòng (user đã bị xoá) -> 401 INVALID_TOKEN
 * (design/flows/logout-protected-routes.md mục 1). Task 7 mở rộng thêm cột.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Supabase select profiles thất bại: ${error.code ?? 'unknown'} ${error.message}`,
    );
  }
  if (!data) throw new HttpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');
  return toUser(data);
}
