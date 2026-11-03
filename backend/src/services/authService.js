import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';
import { signToken } from '../config/jwt.js';

// Khớp cost của dữ liệu seed (migrations/003).
const BCRYPT_COST = 10;
const UNIQUE_VIOLATION = '23505';

const emailExistsError = () => new HttpError(409, 'EMAIL_EXISTS', 'Email này đã được đăng ký.');

function toAuthUser(row) {
  return { id: row.id, email: row.email, role: row.role, displayName: row.display_name };
}

/** Lỗi Supabase không phải Error: bọc lại để errorHandler log (chỉ code/message, không dữ liệu). */
function toInternalError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'} ${error.message}`);
}

/**
 * Tạo tài khoản mới. `email` đã chuẩn hoá (trim + lowercase), `password` đã validate.
 * Không phát JWT (design/flows/README.md D3).
 */
export async function registerUser({ email, password }) {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (selectError) throw toInternalError('select profiles', selectError);
  if (existing) throw emailExistsError();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const { data, error: insertError } = await supabase
    .from('profiles')
    .insert({ email, password_hash: passwordHash })
    .select('id, email, role, display_name')
    .single();

  if (insertError) {
    // Race: request khác vừa tạo cùng email giữa lúc SELECT và INSERT.
    if (insertError.code === UNIQUE_VIOLATION) throw emailExistsError();
    throw toInternalError('insert profiles', insertError);
  }

  return toAuthUser(data);
}

// Hash bcrypt hợp lệ (cost 10) của một chuỗi ngẫu nhiên, sinh sẵn: so sánh khi email không tồn tại
// để thời gian phản hồi không lộ email nào đã đăng ký.
const DUMMY_HASH = '$2b$10$rKAeUL.Y5/UBq92tWomO6.CA2n2KsfkMgQrxkYD5jYnqvp9oh/E/a';
const PASSWORD_MAX_BYTES = 72;

/**
 * Đăng nhập. `email` đã chuẩn hoá. Sai email/mật khẩu cùng trả 401 INVALID_CREDENTIALS.
 * Trả { token, user } (không chứa password_hash).
 */
export async function loginUser({ email, password }) {
  const { data: row, error } = await supabase
    .from('profiles')
    .select('id, email, role, display_name, password_hash')
    .eq('email', email)
    .maybeSingle();
  if (error) throw toInternalError('select profiles', error);

  const tooLong = Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES;
  // Luôn chạy bcrypt.compare (kể cả khi không có user) để thời gian phản hồi như nhau.
  const matches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || tooLong || !matches) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
  }

  return { token: signToken({ sub: row.id, role: row.role }), user: toAuthUser(row) };
}
