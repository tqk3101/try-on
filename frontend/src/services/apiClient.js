const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const TOKEN_KEY = 'tryon_token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* localStorage không khả dụng: bỏ qua */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* localStorage không khả dụng: bỏ qua */
    }
  },
};

/**
 * Lỗi trả về từ API hoặc lỗi mạng, với message thân thiện hiển thị được cho người dùng.
 * `fields` ({ tênTrường: message }) chỉ có khi code = VALIDATION_ERROR.
 */
export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let unauthorizedHandler = null;

/**
 * Đăng ký callback khi gặp 401 cho request ĐÃ gửi token (token hết hạn / không hợp lệ).
 * Được gọi với `{ code }`; AuthProvider dùng để chuyển về guest và tới /login.
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/**
 * Gọi API dùng chung: gắn base URL, JWT, parse JSON; 401 xử lý tập trung (xóa token).
 * Trả về `data` của response thành công, ném ApiError nếu thất bại.
 */
export async function apiRequest(
  path,
  { method = 'GET', body, headers, signal, auth = true } = {},
) {
  if (!API_URL) {
    throw new ApiError(0, 'CONFIG_ERROR', 'Thiếu cấu hình VITE_API_URL.');
  }

  // `auth: false` (đăng nhập/đăng ký): không gửi token cũ để 401 INVALID_CREDENTIALS không bị coi là hết hạn.
  const token = auth ? tokenStorage.get() : null;
  const isFormData = body instanceof FormData;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined || isFormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }

  const payload = await response.json().catch(() => null);

  if (response.status === 401 && token) {
    tokenStorage.clear();
    unauthorizedHandler?.({ code: payload?.error?.code });
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'UNKNOWN_ERROR',
      payload?.error?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
      payload?.error?.fields,
    );
  }

  return payload?.data;
}

export const apiClient = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
