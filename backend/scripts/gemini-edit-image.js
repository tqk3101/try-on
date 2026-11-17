// Chạy thử editImage từ dòng lệnh (tương đương tut04_img_edit.py, không có GUI):
//   node --env-file=.env scripts/gemini-edit-image.js <ảnh-vào.png> "<prompt>" [ảnh-ra.png]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { editImage } from '../src/services/geminiImageService.js';

const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const [inputPath, prompt, outputPath = 'generated_image.png'] = process.argv.slice(2);
if (!inputPath || !prompt) {
  console.error(
    'Cách dùng: node --env-file=.env scripts/gemini-edit-image.js <ảnh-vào> "<prompt>" [ảnh-ra]',
  );
  process.exit(1);
}

const mimeType = MIME_BY_EXT[path.extname(inputPath).toLowerCase()];
if (!mimeType) {
  console.error('Chỉ hỗ trợ ảnh .png, .jpg, .jpeg.');
  process.exit(1);
}

try {
  const { images, texts } = await editImage({
    prompt,
    images: [{ buffer: await readFile(inputPath), mimeType }],
  });
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
