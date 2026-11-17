const PROVIDERS = new Set(['stub', 'gemini']);
const STUB_MODES = new Set(['success', 'fail', 'slow']);

function positiveInt(source, name, fallback) {
  const raw = source[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} phải là số nguyên dương.`);
  }
  return value;
}

/**
 * Đọc cấu hình thử đồ từ env (có thể truyền nguồn khác process.env để test).
 * Không bắt buộc biến nào: mặc định provider `stub`, nên backend luôn khởi động được;
 * `gemini` thiếu GEMINI_API_KEY chỉ khiến POST /api/try-on trả 503 (xem providers/index.js).
 */
export function readTryOnConfig(source = process.env) {
  const provider = source.TRY_ON_PROVIDER?.trim().toLowerCase() || 'stub';
  if (!PROVIDERS.has(provider)) {
    throw new Error(`TRY_ON_PROVIDER không hợp lệ (chỉ hỗ trợ: ${[...PROVIDERS].join(', ')}).`);
  }
  const stubMode = source.TRY_ON_STUB_MODE?.trim().toLowerCase() || 'success';
  if (!STUB_MODES.has(stubMode)) {
    throw new Error(`TRY_ON_STUB_MODE không hợp lệ (chỉ hỗ trợ: ${[...STUB_MODES].join(', ')}).`);
  }
  return Object.freeze({
    provider,
    dailyLimit: positiveInt(source, 'TRY_ON_DAILY_LIMIT', 30),
    timeoutMs: positiveInt(source, 'TRY_ON_TIMEOUT_MS', 90_000),
    maxConcurrency: positiveInt(source, 'TRY_ON_MAX_CONCURRENCY', 3),
    stubMode,
    stubDelayMs: positiveInt(source, 'TRY_ON_STUB_DELAY_MS', 2000),
    geminiApiKey: source.GEMINI_API_KEY?.trim() || '',
    geminiModel: source.GEMINI_IMAGE_MODEL?.trim() || '',
  });
}

export const tryOnConfig = readTryOnConfig();
