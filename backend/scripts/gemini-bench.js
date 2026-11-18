// Đo thử đồ Gemini qua ĐÚNG createGeminiProvider (prompt production) trên bộ ảnh hư cấu.
//   node --env-file=.env scripts/gemini-bench.js <thư-mục-assets> <thư-mục-ra> [model] [ids,phân,cách,dấu,phẩy]
// Mỗi cặp = 1 lần gọi Gemini (tốn tiền). Không in key/base64. Ảnh ra lưu ở <thư-mục-ra>.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createGeminiProvider, PROMPT_VERSION } from '../src/services/tryOn/providers/gemini.js';

const [assetsDir, outDir, model, only] = process.argv.slice(2);
if (!assetsDir || !outDir) {
  console.error(
    'Cách dùng: node --env-file=.env scripts/gemini-bench.js <assets> <ra> [model] [ids]',
  );
  process.exit(1);
}

// [id, người, sản phẩm, loại]
const PAIRS = [
  ['01', 'person-1', 'g-tee', 'áo thun'],
  ['02', 'person-2', 'g-shirt', 'sơ mi'],
  ['03', 'person-3', 'g-dress', 'váy'],
  ['04', 'person-4', 'g-pants', 'quần'],
  ['05', 'person-1', 'g-pattern', 'hoa văn nhỏ'],
  ['06', 'person-2', 'g-jacket', 'áo khoác'],
  ['07', 'person-3', 'g-tee', 'áo thun'],
  ['08', 'person-4', 'g-shirt', 'sơ mi'],
  ['09', 'person-1', 'g-pants', 'quần'],
  ['10', 'person-3', 'g-jacket', 'áo khoác'],
  ['11', 'person-4', 'g-hoodie', 'áo hoodie'],
  ['12', 'person-1', 'g-dress', 'váy'],
  ['13', 'person-2', 'g-pattern', 'hoa văn nhỏ'],
];

function magic(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return 'unknown';
}
function size(buf) {
  if (magic(buf) === 'png') return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
  return '?';
}

const provider = createGeminiProvider({ model, logger: { error() {} } });
const ids = only ? only.split(',') : null;
const tag = `${provider.model}_${PROMPT_VERSION}`;
await mkdir(outDir, { recursive: true });
const rows = [];
let calls = 0;
for (const [id, person, garment, kind] of PAIRS) {
  if (ids && !ids.includes(id)) continue;
  const load = async (n) => ({
    buffer: await readFile(path.join(assetsDir, `${n}.png`)),
    contentType: 'image/png',
  });
  const started = Date.now();
  calls += 1;
  const row = { id, person, garment, kind };
  try {
    const out = await provider.generate({
      personImage: await load(person),
      garmentImage: await load(garment),
      signal: AbortSignal.timeout(90000),
    });
    row.ms = Date.now() - started;
    row.ok = true;
    row.mime = out.contentType;
    row.magic = magic(out.buffer);
    row.size = size(out.buffer);
    row.bytes = out.buffer.length;
    await writeFile(
      path.join(outDir, `${tag}_${id}_${person}_${garment}.${row.magic}`),
      out.buffer,
    );
  } catch (err) {
    row.ms = Date.now() - started;
    row.ok = false;
    row.code = err.code ?? err.name;
    row.status = err.status ?? null;
  }
  rows.push(row);
  console.log(JSON.stringify(row));
}
const ok = rows
  .filter((r) => r.ok)
  .map((r) => r.ms)
  .sort((a, b) => a - b);
const pct = (p) => ok[Math.min(ok.length - 1, Math.ceil(p * ok.length) - 1)];
console.log(`tag=${tag} calls=${calls} ok=${ok.length} p50=${pct(0.5)}ms p95=${pct(0.95)}ms`);
await writeFile(path.join(outDir, `${tag}_summary.json`), JSON.stringify(rows, null, 1));
