// Sinh bộ ảnh đo Task 6 hoàn toàn bằng Gemini (người HƯ CẤU + ảnh flat lay), không dùng ảnh thật.
//   node --env-file=.env scripts/gemini-bench-assets.js <thư-mục-ra>
// Mỗi mục = 1 lần gọi Gemini (tốn tiền). Bỏ qua mục đã có file.
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { getGeminiImageModel } from '../src/services/geminiImageService.js';

const outDir = process.argv[2];
if (!outDir) {
  console.error('Cách dùng: node --env-file=.env scripts/gemini-bench-assets.js <thư-mục-ra>');
  process.exit(1);
}

const PERSON_SUFFIX =
  'Full-length photo of an entirely fictional adult, standing straight facing the camera, arms relaxed at sides, whole body visible from head to feet with shoes, plain light-gray studio background, soft even lighting, vertical portrait framing. Not a real person.';
const GARMENT_SUFFIX =
  'Product flat lay photo of a single garment laid flat, seen from the front, centered, on a plain white background, no model, no mannequin, no hanger, no text, soft even lighting.';

const ASSETS = [
  [
    'person-1',
    `A fictional woman with shoulder-length black hair wearing a plain white tank top, blue jeans and white sneakers. ${PERSON_SUFFIX}`,
  ],
  [
    'person-2',
    `A fictional man with short brown hair wearing a plain gray crew-neck t-shirt, black jeans and brown shoes. ${PERSON_SUFFIX}`,
  ],
  [
    'person-3',
    `A fictional woman with long curly red hair wearing a plain beige long-sleeve top, tan shorts and black sandals. ${PERSON_SUFFIX}`,
  ],
  [
    'person-4',
    `A fictional man with a shaved head and short beard wearing a plain black t-shirt, dark gray shorts and gray sneakers. ${PERSON_SUFFIX}`,
  ],
  ['g-tee', `A solid mustard-yellow short-sleeve crew-neck cotton t-shirt. ${GARMENT_SUFFIX}`],
  [
    'g-shirt',
    `A light-blue and white thin-striped long-sleeve button-up dress shirt with collar. ${GARMENT_SUFFIX}`,
  ],
  [
    'g-dress',
    `A knee-length solid emerald-green sleeveless dress with a fitted waist and flared skirt. ${GARMENT_SUFFIX}`,
  ],
  ['g-pants', `A pair of solid olive-green straight-leg chino trousers. ${GARMENT_SUFFIX}`],
  [
    'g-pattern',
    `A short-sleeve blouse in deep navy with small white polka dots (small repeating pattern all over). ${GARMENT_SUFFIX}`,
  ],
  [
    'g-jacket',
    `A solid burgundy-red zip-up bomber jacket with ribbed cuffs and collar. ${GARMENT_SUFFIX}`,
  ],
  [
    'g-hoodie',
    `A solid sky-blue pullover hoodie with a front pocket and drawstrings. ${GARMENT_SUFFIX}`,
  ],
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
await mkdir(outDir, { recursive: true });
let calls = 0;
for (const [name, prompt] of ASSETS) {
  const file = path.join(outDir, `${name}.png`);
  if (existsSync(file)) continue;
  const started = Date.now();
  calls += 1;
  try {
    const res = await ai.models.generateContent({
      model: getGeminiImageModel(),
      contents: [{ text: prompt }],
      config: { imageConfig: { aspectRatio: name.startsWith('person') ? '2:3' : '1:1' } },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error(`no image (finishReason=${res.candidates?.[0]?.finishReason})`);
    await writeFile(file, Buffer.from(part.inlineData.data, 'base64'));
    console.log(`${name} ok ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`${name} FAIL status=${err?.status ?? '-'} ${String(err.message).slice(0, 120)}`);
  }
}
console.log(`Số lần gọi Gemini: ${calls}`);
