/**
 * Lỗi nghiệp vụ có status và code để error handler trả về client.
 * `fields` (tuỳ chọn) chỉ dùng cho VALIDATION_ERROR: { tênTrường: message }.
 */
export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
