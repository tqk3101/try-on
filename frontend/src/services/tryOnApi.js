import { apiClient } from './apiClient.js';

// API phòng thử đồ (design/flows/try-on-room.md mục 4). Mọi hàm nhận `{ signal }` (AbortController).

/** POST /api/try-on { productId } -> { tryOn, quota }. 200 (cache / job cùng khoá) hoặc 202 (job mới). */
export function requestTryOn(productId, { signal } = {}) {
  return apiClient.post('/try-on', { productId }, { signal });
}

/** GET /api/try-on/:id -> { tryOn } (imageUrl được ký lại mỗi lần khi succeeded). */
export function getTryOn(id, { signal } = {}) {
  return apiClient.get(`/try-on/${encodeURIComponent(id)}`, { signal });
}

/** GET /api/try-on/quota -> { quota: { limit, used, remaining, resetsAt } }. */
export function getQuota({ signal } = {}) {
  return apiClient.get('/try-on/quota', { signal });
}

/** POST /api/try-on/consent -> { profile } (idempotent). */
export function giveConsent({ signal } = {}) {
  return apiClient.post('/try-on/consent', undefined, { signal });
}
