// MOCK phòng thử đồ (Sprint 3 – Task 2). Giả lập backend để UI chạy không cần API/DB.
//
// TODO(Task4): xoá file này khi nối API thật. Thay các hàm export bên dưới bằng `services/tryOnApi.js`
// (requestTryOn, getTryOn, getQuota, giveConsent) + `services/categoryApi.js` (fetchCategories,
// fetchCategoryProducts) + `services/userApi.fetchProfile`, sửa DUY NHẤT `features/tryOn/tryOnApi.js`.
// Shape mọi response khớp design/flows/README.md mục 3 và design/flows/try-on-room.md mục 4.
//
// Chọn kịch bản để thử các trạng thái: thêm `?mock=<tên>` vào bất kỳ URL nào (vd. /try-on?mock=quota).
// Kịch bản được nhớ trong sessionStorage cho tới khi gọi `?mock=ok` (hoặc `?mock=reset`). Mặc định `ok`.
//   ok                 mọi thứ thành công, ảnh sinh sau ~2 s, simulated: true (nhãn "Ảnh mô phỏng")
//   gemini             như ok nhưng simulated: false (không có nhãn)
//   slow               ảnh sinh sau ~12 s (giống Gemini)
//   hang               job không bao giờ xong (client phải tự timeout sau 120 s)
//   fail               mọi job thất bại GENERATION_FAILED
//   fail-once          mỗi sản phẩm thất bại lần đầu, bấm Thử lại thì thành công
//   timeout            job thất bại GENERATION_TIMEOUT
//   rejected           job thất bại INPUT_REJECTED (có link đổi ảnh toàn thân)
//   provider           job thất bại PROVIDER_UNAVAILABLE
//   unavailable        POST /api/try-on trả 503 TRY_ON_UNAVAILABLE
//   network            POST /api/try-on lỗi mạng (NETWORK_ERROR)
//   quota              còn 2 lượt hôm nay; từ lượt thứ 3 POST trả 429 TRY_ON_QUOTA_EXCEEDED
//   expired-url        lần đầu lấy ảnh kết quả, signed URL hỏng (kiểm tra <img onError> -> GET lại 1 lần)
//   profile-incomplete hồ sơ thiếu ảnh toàn thân + cân nặng (màn "Hoàn thiện hồ sơ")
//   no-consent         chưa đồng ý xử lý ảnh (hộp thoại đồng ý)
//   consent-error      như no-consent, nhưng lần đồng ý đầu tiên lỗi 500, lần sau thành công
//   consent-409        hồ sơ báo đã đồng ý nhưng POST đầu trả 409 TRY_ON_CONSENT_REQUIRED
//   profile-409        hồ sơ báo đủ nhưng POST đầu trả 409 PROFILE_INCOMPLETE (fields.avatar)
//   categories-error   GET /api/categories lỗi lần đầu (Thử lại thì được)
//   products-error     GET /api/categories/:id/products lỗi lần đầu
//   empty-categories   không có danh mục nào
//   single             mỗi danh mục chỉ có 1 sản phẩm
// Danh mục rỗng: mở thẳng /try-on/00000000-0000-4000-8000-000000000212 (không hiện ở danh sách, giống API thật).

import { ApiError } from '../services/apiClient.js';

const SCENARIO_KEY = 'tryon_mock_scenario';
const SCENARIOS = new Set([
  'ok',
  'gemini',
  'slow',
  'hang',
  'fail',
  'fail-once',
  'timeout',
  'rejected',
  'provider',
  'unavailable',
  'network',
  'quota',
  'expired-url',
  'profile-incomplete',
  'no-consent',
  'consent-error',
  'consent-409',
  'profile-409',
  'categories-error',
  'products-error',
  'empty-categories',
  'single',
]);

function readScenario() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('mock');
    if (fromUrl === 'ok' || fromUrl === 'reset') sessionStorage.removeItem(SCENARIO_KEY);
    else if (fromUrl && SCENARIOS.has(fromUrl)) sessionStorage.setItem(SCENARIO_KEY, fromUrl);
    return sessionStorage.getItem(SCENARIO_KEY) || 'ok';
  } catch {
    return 'ok';
  }
}

const NETWORK_DELAY_MS = 250;
const DEFAULT_JOB_MS = 2000;
const SLOW_JOB_MS = 12000;
const DAILY_LIMIT = 30;

const ERROR_MESSAGES = {
  GENERATION_FAILED: 'Chưa tạo được ảnh thử đồ. Vui lòng thử lại.',
  GENERATION_TIMEOUT: 'Tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại.',
  INPUT_REJECTED:
    'Không tạo được ảnh từ ảnh toàn thân hiện tại. Hãy thử ảnh rõ hơn: đứng thẳng, thấy từ đầu tới chân, nền đơn giản.',
  PROVIDER_UNAVAILABLE: 'Dịch vụ thử đồ đang tạm gián đoạn. Vui lòng thử lại sau.',
};

// ---------- Ảnh minh hoạ (SVG data URI, không dùng ảnh ngoài) ----------

const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

function figureSvg({ top = '#d8d0c4', bottom = '#55606e', dress = null, bg = '#efe8dd' }) {
  const skin = '#e3b99a';
  const lower = dress
    ? `<path d="M112 168 L188 168 L214 318 L86 318 Z" fill="${dress}"/>`
    : `<rect x="112" y="165" width="76" height="14" fill="${bottom}"/>
       <path d="M112 175 L150 175 L146 340 L120 340 Z" fill="${bottom}"/>
       <path d="M150 175 L188 175 L180 340 L154 340 Z" fill="${bottom}"/>`;
  const legs = dress
    ? `<rect x="122" y="318" width="22" height="26" fill="${skin}"/><rect x="156" y="318" width="22" height="26" fill="${skin}"/>`
    : '';
  const upper = dress
    ? `<path d="M118 100 L182 100 L190 170 L110 170 Z" fill="${dress}"/>`
    : `<path d="M112 100 L188 100 L192 178 L108 178 Z" fill="${top}"/>`;
  const sleeve = dress ? skin : top;
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#e6dfd5"/></linearGradient></defs>
    <rect width="300" height="400" fill="url(#g)"/>
    ${lower}${legs}
    <rect x="124" y="340" width="26" height="12" rx="5" fill="#2a2630"/><rect x="152" y="340" width="26" height="12" rx="5" fill="#2a2630"/>
    <path d="M96 106 L112 100 L116 176 L98 176 Z" fill="${sleeve}"/><path d="M204 106 L188 100 L184 176 L202 176 Z" fill="${sleeve}"/>
    <rect x="92" y="170" width="16" height="30" rx="7" fill="${skin}"/><rect x="192" y="170" width="16" height="30" rx="7" fill="${skin}"/>
    ${upper}
    <rect x="140" y="78" width="20" height="26" fill="${skin}"/>
    <ellipse cx="150" cy="58" rx="24" ry="28" fill="${skin}"/>
    <path d="M124 56 Q126 24 150 26 Q176 24 176 56 Q166 40 150 40 Q134 40 124 56Z" fill="#2b2220"/>
  </svg>`);
}

const FLAT_PATHS = {
  tee: 'M92 92 L128 70 Q150 98 172 70 L208 92 L246 132 L214 156 L198 138 L198 318 L102 318 L102 138 L86 156 L54 132 Z',
  dress: 'M122 66 L137 66 Q150 92 163 66 L178 66 L190 150 L218 330 L82 330 L110 150 Z',
  jeans: 'M100 68 L200 68 L216 330 L160 330 L150 160 L140 330 L84 330 Z',
};

function flatLaySvg(shape, color) {
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect width="300" height="400" fill="#f4f0ea"/>
    <path d="${FLAT_PATHS[shape]}" fill="${color}" stroke="rgb(23 20 26 / 0.12)" stroke-width="2"/>
  </svg>`);
}

const AVATAR_URL = figureSvg({});
const BROKEN_IMAGE_URL = 'data:image/png;base64,AAAA';

// ---------- Dữ liệu mẫu ----------

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const CATEGORY_DEFS = [
  {
    id: uuid(101),
    name: 'Áo thun',
    slug: 'ao-thun',
    shape: 'tee',
    items: [
      ['Áo thun basic trắng', 199000, '#f7f5f0'],
      ['Áo thun oversize đen', 249000, '#26232a'],
      ['Áo thun sọc navy', 229000, '#2f3f66'],
      ['Áo polo xanh rêu', 279000, '#5d6b4a'],
    ],
  },
  {
    id: uuid(102),
    name: 'Váy',
    slug: 'vay',
    shape: 'dress',
    items: [
      ['Váy lụa hồng phấn', 890000, '#e7a9b6'],
      ['Váy midi hoa nhí', 650000, '#c0788a'],
      ['Váy suông màu kem', 520000, '#e8dcc4'],
      ['Đầm wrap đỏ rượu', 790000, '#8f1a3e'],
      ['Váy xếp ly xanh ngọc', 590000, '#2c8a85'],
      ['Đầm dạ hội đen', 1290000, '#1c1a20'],
    ],
  },
  {
    id: uuid(103),
    name: 'Quần jeans',
    slug: 'quan-jeans',
    shape: 'jeans',
    items: [
      ['Jeans ống suông xanh nhạt', 459000, '#8fa8c4'],
      ['Jeans skinny đen', 429000, '#2a2a30'],
      ['Jeans baggy wash', 499000, '#5f7596'],
    ],
  },
];
const EMPTY_CATEGORY = { id: uuid(212), name: 'Phụ kiện', slug: 'phu-kien' };

function buildProducts(def, single) {
  const items = single ? def.items.slice(0, 1) : def.items;
  return items.map(([name, price, color], i) => ({
    id: uuid(def.id.slice(-3) * 100 + i + 1),
    name,
    price,
    imageUrl: flatLaySvg(def.shape, color),
    // Chỉ dùng nội bộ mock để vẽ ảnh kết quả; bị bỏ khi trả ra ngoài.
    _color: color,
    _shape: def.shape,
  }));
}

const publicProduct = ({ id, name, price, imageUrl }) => ({ id, name, price, imageUrl });

// ---------- Trạng thái "server" giả (sống trong phiên trang) ----------

const state = {
  consentAt: null,
  consentInit: false,
  consentFailedOnce: false,
  forced409Done: false,
  failedOnce: new Set(),
  categoriesFailedOnce: false,
  productsFailedOnce: false,
  jobs: new Map(), // id -> job
  byProduct: new Map(), // productId -> jobId (job thành công/đang chạy mới nhất)
  seq: 0,
};

function ensureInit(scenario) {
  if (!state.consentInit) {
    state.consentInit = true;
    const noConsent = scenario === 'no-consent' || scenario === 'consent-error';
    state.consentAt = noConsent ? null : '2026-11-17T03:00:00.000Z';
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const allProducts = (single) => CATEGORY_DEFS.flatMap((def) => buildProducts(def, single));
const findProduct = (id, single) => allProducts(single).find((p) => p.id === id);

function quotaFor(scenario) {
  const base = scenario === 'quota' ? 28 : 4;
  const counted = [...state.jobs.values()].filter(
    (j) => j.outcome === 'success' || j.outcome === 'hang',
  );
  const used = Math.min(DAILY_LIMIT, base + counted.length);
  // 00:00 hôm sau theo giờ Việt Nam (UTC+7) quy ra UTC.
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 3600 * 1000);
  const resets = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + 1) - 7 * 3600 * 1000,
  );
  return {
    limit: DAILY_LIMIT,
    used,
    remaining: DAILY_LIMIT - used,
    resetsAt: resets.toISOString(),
  };
}

function toTryOn(job, scenario) {
  const finished = Date.now() >= job.readyAt && job.outcome !== 'hang';
  const base = {
    id: job.id,
    productId: job.productId,
    simulated: scenario !== 'gemini',
    createdAt: new Date(job.createdAt).toISOString(),
  };
  if (!finished) {
    return { ...base, status: 'processing', imageUrl: null, error: null, completedAt: null };
  }
  const completedAt = new Date(job.readyAt).toISOString();
  if (job.outcome === 'success') {
    let imageUrl = job.imageUrl;
    if (scenario === 'expired-url' && !job.urlServed) {
      job.urlServed = true;
      imageUrl = BROKEN_IMAGE_URL;
    }
    return { ...base, status: 'succeeded', imageUrl, error: null, completedAt };
  }
  return {
    ...base,
    status: 'failed',
    imageUrl: null,
    error: { code: job.outcome, message: ERROR_MESSAGES[job.outcome] },
    completedAt,
  };
}

// ---------- API giả (tên và chữ ký sẽ là tên hàm của services/tryOnApi.js) ----------

/** GET /api/user/profile -> { profile } (đủ trường Profile + tryOnConsentAt). */
export async function fetchProfile({ signal } = {}) {
  const scenario = readScenario();
  ensureInit(scenario);
  await sleep(NETWORK_DELAY_MS, signal);
  const incomplete = scenario === 'profile-incomplete';
  return {
    profile: {
      id: uuid(1),
      email: 'member@example.com',
      role: 'user',
      displayName: 'Lan Anh',
      phone: null,
      heightCm: 162,
      weightKg: incomplete ? null : 50.5,
      avatarUrl: incomplete ? null : AVATAR_URL,
      tryOnConsentAt: state.consentAt,
      createdAt: '2026-11-01T03:00:00.000Z',
      updatedAt: '2026-11-10T03:00:00.000Z',
    },
  };
}

/** GET /api/categories -> { categories: [{ id, name, slug }] } (chỉ danh mục có sản phẩm, Q8). */
export async function fetchCategories({ signal } = {}) {
  const scenario = readScenario();
  await sleep(NETWORK_DELAY_MS, signal);
  if (scenario === 'categories-error' && !state.categoriesFailedOnce) {
    state.categoriesFailedOnce = true;
    throw new ApiError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi. Vui lòng thử lại.');
  }
  if (scenario === 'empty-categories') return { categories: [] };
  return { categories: CATEGORY_DEFS.map(({ id, name, slug }) => ({ id, name, slug })) };
}

/** GET /api/categories/:id/products -> { category, products: [{ id, name, price, imageUrl }] } (cũ nhất trước). */
export async function fetchCategoryProducts(categoryId, { signal } = {}) {
  const scenario = readScenario();
  await sleep(NETWORK_DELAY_MS, signal);
  if (scenario === 'products-error' && !state.productsFailedOnce) {
    state.productsFailedOnce = true;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
  if (categoryId === EMPTY_CATEGORY.id) return { category: EMPTY_CATEGORY, products: [] };
  const def = CATEGORY_DEFS.find((c) => c.id === categoryId);
  if (!def) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
  const { id, name, slug } = def;
  return {
    category: { id, name, slug },
    products: buildProducts(def, scenario === 'single').map(publicProduct),
  };
}

/** GET /api/try-on/quota -> { quota }. */
export async function getQuota({ signal } = {}) {
  const scenario = readScenario();
  await sleep(NETWORK_DELAY_MS / 2, signal);
  return { quota: quotaFor(scenario) };
}

/** POST /api/try-on/consent -> { profile } (idempotent). */
export async function giveConsent({ signal } = {}) {
  const scenario = readScenario();
  ensureInit(scenario);
  await sleep(NETWORK_DELAY_MS, signal);
  if (scenario === 'consent-error' && !state.consentFailedOnce) {
    state.consentFailedOnce = true;
    throw new ApiError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi. Vui lòng thử lại.');
  }
  state.consentAt ??= new Date().toISOString();
  state.forced409Done = true;
  return fetchProfile({ signal });
}

/**
 * POST /api/try-on { productId } -> { tryOn, quota }.
 * Thật: 200 (cache / job đang chạy cùng khoá) hoặc 202 (job mới); client không phân biệt, chỉ đọc `tryOn.status`.
 */
export async function requestTryOn(productId, { signal } = {}) {
  const scenario = readScenario();
  ensureInit(scenario);
  await sleep(NETWORK_DELAY_MS, signal);

  if (scenario === 'network') {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
  if (scenario === 'unavailable') {
    throw new ApiError(
      503,
      'TRY_ON_UNAVAILABLE',
      'Tính năng thử đồ đang tạm ngưng. Vui lòng thử lại sau.',
    );
  }
  if (scenario === 'consent-409' && !state.forced409Done) {
    state.consentAt = null;
    throw new ApiError(
      409,
      'TRY_ON_CONSENT_REQUIRED',
      'Bạn cần đồng ý cho phép xử lý ảnh để dùng tính năng thử đồ.',
    );
  }
  if (scenario === 'profile-409' && !state.forced409Done) {
    state.forced409Done = true;
    throw new ApiError(
      409,
      'PROFILE_INCOMPLETE',
      'Bạn cần hoàn thiện hồ sơ (ảnh toàn thân, chiều cao, cân nặng) để thử đồ.',
      { avatar: 'Bạn cần tải ảnh toàn thân.' },
    );
  }

  const product = findProduct(productId, scenario === 'single');
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không tồn tại.');

  // Cache / job đang chạy: không tính lượt.
  const existingId = state.byProduct.get(productId);
  const existing = existingId && state.jobs.get(existingId);
  if (existing && toTryOn(existing, scenario).status !== 'failed') {
    return { tryOn: toTryOn(existing, scenario), quota: quotaFor(scenario) };
  }

  if (quotaFor(scenario).remaining <= 0) {
    throw new ApiError(
      429,
      'TRY_ON_QUOTA_EXCEEDED',
      'Bạn đã dùng hết lượt thử đồ hôm nay. Vui lòng quay lại vào ngày mai.',
    );
  }

  let outcome = 'success';
  let delay = DEFAULT_JOB_MS;
  if (scenario === 'slow') delay = SLOW_JOB_MS;
  if (scenario === 'hang') outcome = 'hang';
  if (scenario === 'fail') outcome = 'GENERATION_FAILED';
  if (scenario === 'timeout') outcome = 'GENERATION_TIMEOUT';
  if (scenario === 'rejected') outcome = 'INPUT_REJECTED';
  if (scenario === 'provider') outcome = 'PROVIDER_UNAVAILABLE';
  if (scenario === 'fail-once' && !state.failedOnce.has(productId)) {
    state.failedOnce.add(productId);
    outcome = 'GENERATION_FAILED';
  }

  state.seq += 1;
  const now = Date.now();
  const job = {
    id: uuid(9000 + state.seq),
    productId,
    createdAt: now,
    readyAt: now + delay,
    outcome,
    imageUrl:
      outcome === 'success'
        ? figureSvg(
            product._shape === 'dress'
              ? { dress: product._color }
              : product._shape === 'jeans'
                ? { bottom: product._color }
                : { top: product._color },
          )
        : null,
    urlServed: false,
  };
  state.jobs.set(job.id, job);
  state.byProduct.set(productId, job.id);
  return { tryOn: toTryOn(job, scenario), quota: quotaFor(scenario) };
}

/** GET /api/try-on/:id -> { tryOn } (poll mỗi 2 s). */
export async function getTryOn(id, { signal } = {}) {
  const scenario = readScenario();
  await sleep(NETWORK_DELAY_MS, signal);
  const job = state.jobs.get(id);
  if (!job) throw new ApiError(404, 'TRY_ON_NOT_FOUND', 'Không tìm thấy ảnh thử đồ.');
  return { tryOn: toTryOn(job, scenario) };
}
