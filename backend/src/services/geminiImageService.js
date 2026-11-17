import { GoogleGenAI } from '@google/genai';

// Port từ tut04_img_edit.py: models.generate_content(model, contents=[prompt, image]),
// rồi lấy ảnh từ part có inlineData (text nếu có thì trả kèm).
export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';

let client = null;

/** Khởi tạo lười để backend vẫn chạy khi chưa cấu hình GEMINI_API_KEY. */
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Thiếu biến môi trường GEMINI_API_KEY (xem backend/.env.example).');
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Chỉnh/sinh ảnh bằng Gemini.
 * @param {object} options
 * @param {string} options.prompt Câu lệnh chỉnh sửa.
 * @param {{ buffer: Buffer, mimeType: string }[]} options.images Ảnh đầu vào (>= 1).
 * @param {string} [options.model] Mặc định GEMINI_IMAGE_MODEL hoặc DEFAULT_GEMINI_IMAGE_MODEL.
 * @returns {Promise<{ images: { buffer: Buffer, mimeType: string }[], texts: string[] }>}
 */
export async function editImage({ prompt, images, model }) {
  if (!prompt?.trim()) throw new Error('prompt không được để trống.');
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Cần ít nhất một ảnh đầu vào.');
  }

  const response = await getClient().models.generateContent({
    model: model ?? (process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL),
    contents: [
      { text: prompt },
      ...images.map(({ buffer, mimeType }) => ({
        inlineData: { mimeType, data: buffer.toString('base64') },
      })),
    ],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const result = { images: [], texts: [] };
  for (const part of parts) {
    if (part.text) result.texts.push(part.text);
    else if (part.inlineData?.data) {
      result.images.push({
        buffer: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType ?? 'image/png',
      });
    }
  }
  return result;
}
