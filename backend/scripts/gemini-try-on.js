// Thử đồ bằng Gemini từ dòng lệnh (thử nghiệm chất lượng cho Sprint 3):
//   node --env-file=.env scripts/gemini-try-on.js <ảnh-người> <ảnh-áo-flat-lay> [ảnh-ra.png]
// Ảnh người = ảnh toàn thân (như avatar), ảnh áo = ảnh flat lay của sản phẩm.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { editImage } from '../src/services/geminiImageService.js';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const PROMPT =
  'Image 1 is a photo of a person. Image 2 is a product photo of a garment (ignore its background, text and mannequin). ' +
  'Edit image 1 so the person wears ONLY the garment shown in image 2, replacing only the clothing it covers. ' +
  'Do not add or change any other clothing: keep every other item the person wears (trousers, shoes, belt, accessories) exactly as in image 1. ' +
  'Keep the person’s face, hair, body shape, skin tone, expression, background and lighting unchanged. ' +
  'Keep the exact same pose, including the position of both arms and hands, and the same framing and aspect ratio as image 1. ' +
  'Reproduce the garment’s color, fabric, cut, lapels, buttons and pockets faithfully.';

const [personPath, garmentPath, outputPath = 'try_on_result.png'] = process.argv.slice(2);
if (!personPath || !garmentPath) {
  console.error(
    'Cách dùng: node --env-file=.env scripts/gemini-try-on.js <ảnh-người> <ảnh-áo> [ảnh-ra.png]',
  );
  process.exit(1);
}

async function loadImage(file) {
  const mimeType = MIME_BY_EXT[path.extname(file).toLowerCase()];
  if (!mimeType) throw new Error(`Định dạng không hỗ trợ: ${file} (chỉ png, jpg, jpeg, webp).`);
  return { buffer: await readFile(file), mimeType };
}

try {
  const started = Date.now();
  const { images, texts } = await editImage({
    prompt: PROMPT,
    images: [await loadImage(personPath), await loadImage(garmentPath)],
  });
  console.log(`Thời gian: ${((Date.now() - started) / 1000).toFixed(1)}s`);
  texts.forEach((text) => console.log(text));
  if (images.length === 0) {
    console.error('Model không trả ảnh nào.');
    process.exit(2);
  }
  await writeFile(outputPath, images[0].buffer);
  console.log(`Đã lưu ${outputPath}`);
} catch (err) {
  console.error('Gọi Gemini thất bại:', err.message);
  process.exit(3);
}
