import {
  DEFAULT_GEMINI_IMAGE_MODEL,
  GeminiNotConfiguredError,
  editImage as defaultEditImage,
  isGeminiConfigured,
} from '../../geminiImageService.js';
import { ERROR_CODES, TryOnProviderError } from '../providerError.js';

/**
 * Prompt CỐ ĐỊNH ở backend (try-on-room.md mục 2.3): người dùng không nhập prompt và không có
 * dữ liệu người dùng nào được chèn vào đây. Ảnh 1 = người, ảnh 2 = sản phẩm (thứ tự cố định).
 * MỌI lần sửa nội dung prompt phải tăng PROMPT_VERSION để cache cũ tự mất hiệu lực (input_key).
 */
export const TRY_ON_PROMPT =
  'Image 1 is a photo of a person. Image 2 is a product photo of a garment or clothing item ' +
  '(ignore its background, text, hanger and mannequin). ' +
  'Edit image 1 so the person wears ONLY the item shown in image 2, replacing only the clothing it covers. ' +
  'Do not add or change any other clothing: keep every other item the person wears (such as trousers, skirt, shoes, belt, accessories) exactly as in image 1. ' +
  'Keep the person’s face, hair, body shape, skin tone, expression, background and lighting unchanged. ' +
  'Keep the exact same pose, including the position of both arms and hands, and the same framing and aspect ratio as image 1. ' +
  'Reproduce the item’s exact color shade, fabric, cut, pattern and details (such as collar, lapels, buttons, pockets, prints) faithfully, as they appear in image 2.';

export const PROMPT_VERSION = 'p2';

const SAFETY_FINISH_REASONS = new Set([
  'SAFETY',
  'PROHIBITED_CONTENT',
  'SPII',
  'BLOCKLIST',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
]);
const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const providerError = (code, extra) => new TryOnProviderError(code, extra);

function isAbortError(err, signal) {
  return (
    Boolean(signal?.aborted) || err?.name === 'AbortError' || err?.cause?.name === 'AbortError'
  );
}

function isNetworkError(err) {
  if (NETWORK_ERROR_CODES.has(err?.code) || NETWORK_ERROR_CODES.has(err?.cause?.code)) return true;
  return err instanceof TypeError && /fetch failed/i.test(err.message);
}

/**
 * Ánh xạ lỗi ném ra từ SDK/service Gemini sang TryOnProviderError (try-on-room.md mục 2.4).
 * Không bao giờ đưa message gốc của SDK vào kết quả (có thể chứa nội dung phản hồi thô).
 * @param {unknown} err
 * @param {AbortSignal} [signal] signal timeout đã truyền cho SDK
 */
export function mapGeminiError(err, signal) {
  if (err instanceof TryOnProviderError) return err;
  if (err instanceof GeminiNotConfiguredError) {
    return providerError(ERROR_CODES.PROVIDER_UNAVAILABLE, { permanent: true });
  }
  if (isAbortError(err, signal)) return providerError(ERROR_CODES.GENERATION_TIMEOUT);

  const status = Number.isInteger(err?.status) ? err.status : null;
  if (status !== null) {
    const extra = { status };
    if (status === 404 || status === 401 || status === 403) {
      return providerError(ERROR_CODES.PROVIDER_UNAVAILABLE, { ...extra, permanent: true });
    }
    if (status === 400) {
      // 400 do key sai (API_KEY_INVALID) khác 400 do ảnh đầu vào không hợp lệ.
      if (/API_KEY_INVALID/i.test(String(err.message))) {
        return providerError(ERROR_CODES.PROVIDER_UNAVAILABLE, { ...extra, permanent: true });
      }
      return providerError(ERROR_CODES.INPUT_REJECTED, extra);
    }
    if (status === 429 || status >= 500) {
      return providerError(ERROR_CODES.PROVIDER_UNAVAILABLE, extra);
    }
    return providerError(ERROR_CODES.GENERATION_FAILED, extra);
  }
  if (isNetworkError(err)) return providerError(ERROR_CODES.PROVIDER_UNAVAILABLE);
  return providerError(ERROR_CODES.GENERATION_FAILED);
}

/**
 * Ánh xạ kết quả Gemini (không ném lỗi) sang ảnh hoặc TryOnProviderError.
 * Chỉ lấy ảnh đầu tiên; text (nếu có) bị bỏ qua, không log.
 */
export function pickGeminiImage(result) {
  const providerJobId = result.responseId ?? null;
  const finishReason = result.finishReason ?? null;
  if (result.blockReason) {
    return { error: providerError(ERROR_CODES.INPUT_REJECTED, { providerJobId, finishReason }) };
  }
  const image = result.images?.[0];
  if (!image) {
    const code = SAFETY_FINISH_REASONS.has(finishReason)
      ? ERROR_CODES.INPUT_REJECTED
      : ERROR_CODES.GENERATION_FAILED;
    return { error: providerError(code, { providerJobId, finishReason }) };
  }
  return { image: { buffer: image.buffer, contentType: image.mimeType, providerJobId } };
}

/**
 * Provider thật: Google Gemini (qua geminiImageService.editImage).
 * `editImage` được inject để test bằng mock (không gọi API thật).
 */
export function createGeminiProvider({
  model,
  editImage = defaultEditImage,
  isConfigured = isGeminiConfigured,
  logger = console,
} = {}) {
  let unavailable = false;
  const resolvedModel = model || DEFAULT_GEMINI_IMAGE_MODEL;

  return {
    name: 'gemini',
    model: resolvedModel,
    promptVersion: PROMPT_VERSION,
    usesMeasurements: false,
    simulated: false,
    isAvailable: () => isConfigured() && !unavailable,
    markUnavailable(reason) {
      if (unavailable) return;
      unavailable = true;
      // Chỉ log tên model + lý do ngắn; không log key/phản hồi.
      logger.error(
        `[try-on] Gemini không khả dụng (${reason}). Kiểm tra GEMINI_API_KEY và GEMINI_IMAGE_MODEL (đang dùng "${resolvedModel}") rồi khởi động lại backend.`,
      );
    },
    async generate({ personImage, garmentImage, signal }) {
      let result;
      try {
        result = await editImage({
          prompt: TRY_ON_PROMPT,
          images: [
            { buffer: personImage.buffer, mimeType: personImage.contentType },
            { buffer: garmentImage.buffer, mimeType: garmentImage.contentType },
          ],
          model: resolvedModel,
          abortSignal: signal,
        });
      } catch (err) {
        throw mapGeminiError(err, signal);
      }
      const { image, error } = pickGeminiImage(result);
      if (error) throw error;
      return image;
    },
  };
}
