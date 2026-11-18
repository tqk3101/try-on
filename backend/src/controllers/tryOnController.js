import { HttpError } from '../middlewares/httpError.js';
import { tryOnService } from '../services/tryOn/index.js';
import { giveTryOnConsent } from '../services/userService.js';
import { isUuid, isPlainObject } from '../validators/common.js';

/** Body chỉ nhận { productId }; mọi trường khác (kể cả "prompt") bị bỏ qua. */
function validateTryOnBody(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  }
  if (!isUuid(body.productId)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', {
      productId: 'Sản phẩm không hợp lệ.',
    });
  }
  return body.productId;
}

export async function postTryOn(req, res) {
  const productId = validateTryOnBody(req.body);
  const { statusCode, tryOn, quota } = await tryOnService.requestTryOn(req.user.id, productId);
  res.status(statusCode).json({ success: true, data: { tryOn, quota } });
}

export async function getTryOnById(req, res) {
  // :id không phải uuid -> 404 ngay (không gửi xuống DB).
  if (!isUuid(req.params.id)) {
    throw new HttpError(404, 'TRY_ON_NOT_FOUND', 'Không tìm thấy kết quả thử đồ.');
  }
  const tryOn = await tryOnService.getTryOn(req.user.id, req.params.id);
  res.json({ success: true, data: { tryOn } });
}

export async function getTryOnQuota(req, res) {
  res.json({ success: true, data: { quota: await tryOnService.getQuota(req.user.id) } });
}

export async function postTryOnConsent(req, res) {
  const profile = await giveTryOnConsent(req.user.id);
  res.json({ success: true, data: { profile } });
}
