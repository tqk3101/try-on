import { HttpError } from './httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên yêu cầu.' },
  });
}

// Phải khai báo đủ 4 tham số để Express nhận diện là error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }) },
    });
  }

  // body-parser (JSON sai cú pháp, body quá lớn...) gắn status 4xx
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Yêu cầu không hợp lệ.' },
    });
  }

  console.error('[error]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' },
  });
}
