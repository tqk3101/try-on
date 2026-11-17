/** Mã lỗi job thử đồ (cột try_on_results.error_code, trả client qua tryOn.error.code). */
export const ERROR_CODES = Object.freeze({
  GENERATION_FAILED: 'GENERATION_FAILED',
  GENERATION_TIMEOUT: 'GENERATION_TIMEOUT',
  INPUT_REJECTED: 'INPUT_REJECTED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
});

/** Thông điệp tiếng Việt hiển thị nguyên văn cho người dùng (try-on-room.md mục 7). */
export const ERROR_MESSAGES = Object.freeze({
  GENERATION_FAILED: 'Chưa tạo được ảnh thử đồ. Vui lòng thử lại.',
  GENERATION_TIMEOUT: 'Tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại.',
  INPUT_REJECTED:
    'Không tạo được ảnh từ ảnh toàn thân hiện tại. Hãy thử ảnh rõ hơn: đứng thẳng, thấy từ đầu tới chân, nền đơn giản.',
  PROVIDER_UNAVAILABLE: 'Dịch vụ thử đồ đang tạm gián đoạn. Vui lòng thử lại sau.',
});

/**
 * Lỗi của provider đã được ánh xạ về mã job.
 * `permanent`: provider không dùng được tới khi sửa cấu hình (model 404, key sai) -> đánh dấu
 * không khả dụng, các POST sau trả 503 TRY_ON_UNAVAILABLE.
 */
export class TryOnProviderError extends Error {
  constructor(code, { permanent = false, providerJobId = null, cause } = {}) {
    super(code, cause ? { cause } : undefined);
    this.name = 'TryOnProviderError';
    this.code = code;
    this.permanent = permanent;
    this.providerJobId = providerJobId;
  }
}
