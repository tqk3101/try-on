// Mock giỏ hàng (Sprint 4, Task 2). Shape đúng design/flows/cart-and-orders.md mục 2 để Task 5 chỉ thay
// `features/cart/cartApi.js` bằng apiClient. XOÁ file này khi nối API thật (Task 5).
import { ApiError } from '../services/apiClient.js';
import { hasMockFlag, mockDelay, mockForever } from './mockFlags.js';

export const CART_LIMITS = { maxLines: 50, maxQuantity: 10 };

const CATEGORIES = {
  dress: { id: '5d3c1a10-0000-4000-8000-000000000001', name: 'Váy' },
  top: { id: '5d3c1a10-0000-4000-8000-000000000002', name: 'Áo' },
  bottom: { id: '5d3c1a10-0000-4000-8000-000000000003', name: 'Quần' },
};

/** Ảnh flat lay giả (SVG, tỉ lệ 3:4) để không phụ thuộc mạng. */
function flatLay(color, label) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">` +
    `<rect width="300" height="400" fill="#efe8dd"/>` +
    `<path d="M95 70 L130 55 Q150 85 170 55 L205 70 L255 120 L225 155 L205 140 L205 345 L95 345 L95 140 L75 155 L45 120 Z" fill="${color}"/>` +
    `<text x="150" y="385" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#4b4650">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Danh mục sản phẩm mock (cũng được orderMock dùng). */
export const MOCK_PRODUCTS = [
  { id: '9a000000-0000-4000-8000-000000000001', name: 'Váy lụa', price: 890000, category: CATEGORIES.dress, color: '#d98aa0' },
  { id: '9a000000-0000-4000-8000-000000000002', name: 'Váy hoa nhí tay phồng', price: 650000, category: CATEGORIES.dress, color: '#c9a66b' },
  { id: '9a000000-0000-4000-8000-000000000003', name: 'Áo sơ mi lụa trắng', price: 420000, category: CATEGORIES.top, color: '#e9e4da' },
  { id: '9a000000-0000-4000-8000-000000000004', name: 'Áo thun oversize', price: 250000, category: CATEGORIES.top, color: '#6b7a8f' },
  { id: '9a000000-0000-4000-8000-000000000005', name: 'Quần ống rộng', price: 540000, category: CATEGORIES.bottom, color: '#4b4650' },
  { id: '9a000000-0000-4000-8000-000000000006', name: 'Quần jeans ống đứng', price: 780000, category: CATEGORIES.bottom, color: '#5b7fa6' },
  { id: '9a000000-0000-4000-8000-000000000007', name: 'Áo khoác blazer', price: 1290000, category: CATEGORIES.top, color: '#8f1a3e' },
  {
    id: '9a000000-0000-4000-8000-000000000008',
    name: 'Áo khoác dạ dáng dài phối cổ lông cao cấp mùa đông bản giới hạn',
    price: 2490000,
    category: CATEGORIES.top,
    color: '#a58a6a',
  },
].map((p) => ({ ...p, imageUrl: flatLay(p.color, p.name.slice(0, 18)) }));

// Sản phẩm không thuộc mock (vd. sản phẩm thật ở phòng thử đồ khi chạy cùng backend): nhớ theo `hint`.
const extraProducts = new Map();

const findProduct = (id) => MOCK_PRODUCTS.find((p) => p.id === id) ?? extraProducts.get(id) ?? null;

let initialised = false;
// Nguồn sự thật của mock: { productId, quantity, addedAt }.
let lines = [];
let priceBump = 0;

function ensureInit() {
  if (initialised) return;
  initialised = true;
  if (hasMockFlag('cart-empty')) return;
  const now = Date.now();
  lines = [
    { productId: MOCK_PRODUCTS[0].id, quantity: 2, addedAt: now - 60_000 },
    { productId: MOCK_PRODUCTS[2].id, quantity: 1, addedAt: now - 120_000 },
    { productId: MOCK_PRODUCTS[7].id, quantity: 1, addedAt: now - 180_000 },
  ];
}

/** Giá hiện tại của sản phẩm (mock: dòng đầu cộng thêm `priceBump` sau kịch bản place-changed). */
export function currentPrice(productId) {
  const product = findProduct(productId);
  if (!product) return 0;
  const first = [...lines].sort((a, b) => b.addedAt - a.addedAt)[0];
  return product.price + (first?.productId === productId ? priceBump : 0);
}

export function buildCart() {
  ensureInit();
  const items = [...lines]
    .sort((a, b) => b.addedAt - a.addedAt || a.productId.localeCompare(b.productId))
    .map((line) => {
      const product = findProduct(line.productId);
      const price = currentPrice(line.productId);
      return {
        productId: line.productId,
        name: product.name,
        price,
        imageUrl: product.imageUrl ?? null,
        category: product.category,
        quantity: line.quantity,
        lineTotal: price * line.quantity,
        addedAt: new Date(line.addedAt).toISOString(),
      };
    });
  return {
    items,
    lineCount: items.length,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    limits: { ...CART_LIMITS },
  };
}

/** Dùng bởi orderMock. */
export function takeCartForOrder() {
  ensureInit();
  return buildCart();
}
export function emptyCartAfterOrder() {
  lines = [];
  priceBump = 0;
}
export function bumpFirstLinePrice() {
  priceBump += 10000;
}
export function clearMockCart() {
  lines = [];
}

const serverError = () =>
  new ApiError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi. Vui lòng thử lại sau.');

export async function mockGetCart({ signal } = {}) {
  if (hasMockFlag('cart-loading')) await mockForever(signal);
  await mockDelay(350, signal);
  if (hasMockFlag('cart-error')) throw serverError();
  return { cart: buildCart() };
}

/** `hint` ({ name, price, imageUrl, category }) chỉ để mock biết sản phẩm lạ; API thật bỏ qua. */
export async function mockAddItem(productId, quantity = 1, hint) {
  ensureInit();
  await mockDelay(450);
  if (hasMockFlag('add-error')) throw serverError();
  if (hasMockFlag('add-missing')) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không còn tồn tại.');
  }
  if (hasMockFlag('add-limit')) {
    throw new ApiError(409, 'CART_QUANTITY_LIMIT', 'Mỗi sản phẩm chỉ đặt tối đa 10 chiếc.');
  }
  if (hasMockFlag('add-full')) {
    throw new ApiError(
      409,
      'CART_FULL',
      'Giỏ hàng đã có 50 sản phẩm. Vui lòng bớt sản phẩm trước khi thêm.',
    );
  }
  if (!findProduct(productId)) {
    if (!hint) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không còn tồn tại.');
    extraProducts.set(productId, {
      id: productId,
      name: hint.name,
      price: hint.price,
      imageUrl: hint.imageUrl ?? null,
      category: hint.category ?? { id: 'unknown', name: 'Sản phẩm' },
    });
  }
  const existing = lines.find((line) => line.productId === productId);
  if (existing) {
    if (existing.quantity + quantity > CART_LIMITS.maxQuantity) {
      throw new ApiError(409, 'CART_QUANTITY_LIMIT', 'Mỗi sản phẩm chỉ đặt tối đa 10 chiếc.');
    }
    existing.quantity += quantity;
  } else {
    if (lines.length >= CART_LIMITS.maxLines) {
      throw new ApiError(
        409,
        'CART_FULL',
        'Giỏ hàng đã có 50 sản phẩm. Vui lòng bớt sản phẩm trước khi thêm.',
      );
    }
    lines.push({ productId, quantity, addedAt: Date.now() });
  }
  const cart = buildCart();
  return { cart, item: cart.items.find((item) => item.productId === productId) };
}

export async function mockUpdateItem(productId, quantity) {
  ensureInit();
  await mockDelay(400);
  if (hasMockFlag('update-error')) throw serverError();
  if (hasMockFlag('update-missing')) {
    lines = lines.filter((line) => line.productId !== productId);
  }
  const line = lines.find((item) => item.productId === productId);
  if (!line) {
    throw new ApiError(404, 'CART_ITEM_NOT_FOUND', 'Sản phẩm này không còn trong giỏ hàng.');
  }
  line.quantity = quantity;
  return { cart: buildCart() };
}

/** Idempotent: không có dòng vẫn thành công. */
export async function mockRemoveItem(productId) {
  ensureInit();
  await mockDelay(350);
  if (hasMockFlag('update-error')) throw serverError();
  lines = lines.filter((line) => line.productId !== productId);
  return { cart: buildCart() };
}
