// Thử đồ bằng Gemini từ dòng lệnh (thử nghiệm chất lượng cho Sprint 3):
//   node --env-file=.env scripts/gemini-try-on.js <ảnh-người> <ảnh-áo-flat-lay> [ảnh-ra.png]
// Ảnh người = ảnh toàn thân (như avatar), ảnh áo = ảnh flat lay của sản phẩm.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { editImage } from '../src/services/geminiImageService.js';
// Dùng đúng prompt cố định của adapter thử đồ để thử nghiệm khớp với hành vi thật.
import { TRY_ON_PROMPT } from '../src/services/tryOn/providers/gemini.js';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

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
    prompt: TRY_ON_PROMPT,
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
