// Mock đơn hàng (Sprint 4, Task 2). Shape đúng design/flows/cart-and-orders.md mục 2 (Order, AdminOrder,
// AdminOrderSummary, Pagination). XOÁ file này khi nối API thật (Task 5).
import { ApiError } from '../services/apiClient.js';
import {
  bumpFirstLinePrice,
  emptyCartAfterOrder,
  MOCK_PRODUCTS,
  takeCartForOrder,
} from './cartMock.js';
import { hasMockFlag, mockDelay, mockForever } from './mockFlags.js';

const STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

const CUSTOMERS = [
  { id: 'c1000000-0000-4000-8000-000000000001', email: 'member@tryon.dev', displayName: 'Lan Anh' },
  { id: 'c1000000-0000-4000-8000-000000000002', email: 'minh.tran@example.com', displayName: 'Minh Trần' },
  { id: 'c1000000-0000-4000-8000-000000000003', email: 'thu.ha@example.com', displayName: null },
  {
    id: 'c1000000-0000-4000-8000-000000000004',
    email: 'khach.hang.co.email.rat.dai.de.thu.tran.layout@example.com',
    displayName: 'Nguyễn Thị Phương Thảo',
  },
];

const pad = (n) => String(n).padStart(6, '0');

function toOrderItem(product, quantity, { deleted = false } = {}) {
  return {
    productId: deleted ? null : product.id,
    name: product.name,
    categoryName: product.category.name,
    unitPrice: product.price,
    quantity,
    lineTotal: product.price * quantity,
    imageUrl: deleted ? null : product.imageUrl,
  };
}

function makeOrder({ number, status, items, customer, createdAt, recipientName, note = null }) {
  return {
    id: `0d000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    code: `DH${pad(number)}`,
    status,
    paymentMethod: 'cod',
    recipientName: recipientName ?? customer.displayName ?? 'Khách hàng',
    phone: '0912345678',
    shippingAddress: '12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    note,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    createdAt: new Date(createdAt).toISOString(),
    customer,
  };
}

// 23 đơn (> 20 để có 2 trang). Mới nhất trước. Không có đơn "cancelled" -> lọc "Đã huỷ" ra danh sách rỗng.
function seedOrders() {
  const now = Date.now();
  const orders = [];
  for (let i = 0; i < 23; i += 1) {
    const number = 1023 - i;
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const first = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length];
    const second = MOCK_PRODUCTS[(i + 3) % MOCK_PRODUCTS.length];
    const items = [toOrderItem(first, 1 + (i % 3), { deleted: i === 2 })];
    if (i % 2 === 0) items.push(toOrderItem(second, 1));
    // Đơn mới nhất là "Chờ xử lý", đơn cũ dần sang trạng thái sau (không dùng "cancelled").
    const status = STATUSES[Math.min(3, Math.floor(i / 4))];
    orders.push(
      makeOrder({
        number,
        status,
        items,
        customer,
        createdAt: now - (i + 1) * 5 * 3_600_000,
        note: i === 1 ? 'Giao giờ hành chính, gọi trước khi đến.' : null,
      }),
    );
  }
  return orders;
}

let orders = hasMockFlag('admin-empty') ? [] : seedOrders();
let nextNumber = 1024;
const byKey = new Map(); // idempotencyKey -> order
let placeChangedUsed = false;
let placeErrorUsed = false;

const serverError = () =>
  new ApiError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
const notFound = () => new ApiError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');

/** Chủ đơn: bỏ `customer` (chỉ API admin có). */
function toBuyerOrder(order) {
  const rest = { ...order };
  delete rest.customer;
  return rest;
}

function toSummary(order) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    itemCount: order.itemCount,
    total: order.total,
    recipientName: order.recipientName,
    customer: order.customer,
    createdAt: order.createdAt,
  };
}

/** `body` đúng POST /api/orders. Cùng idempotencyKey -> trả đơn cũ, không tạo thêm. */
export async function mockPlaceOrder(body) {
  await mockDelay(700);
  const existing = byKey.get(body.idempotencyKey);
  if (existing) return { order: toBuyerOrder(existing) };

  if (hasMockFlag('place-error') && !placeErrorUsed) {
    placeErrorUsed = true;
    throw serverError();
  }
  if (hasMockFlag('place-empty')) {
    emptyCartAfterOrder();
    throw new ApiError(409, 'CART_EMPTY', 'Giỏ hàng đang trống.');
  }
  if (hasMockFlag('place-changed') && !placeChangedUsed) {
    placeChangedUsed = true;
    bumpFirstLinePrice();
    throw new ApiError(
      409,
      'CART_CHANGED',
      'Giỏ hàng vừa thay đổi (giá hoặc sản phẩm). Vui lòng kiểm tra lại trước khi đặt hàng.',
    );
  }

  const cart = takeCartForOrder();
  if (cart.items.length === 0) throw new ApiError(409, 'CART_EMPTY', 'Giỏ hàng đang trống.');
  if (cart.total !== body.expectedTotal) {
    throw new ApiError(
      409,
      'CART_CHANGED',
      'Giỏ hàng vừa thay đổi (giá hoặc sản phẩm). Vui lòng kiểm tra lại trước khi đặt hàng.',
    );
  }

  const items = cart.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    categoryName: item.category.name,
    unitPrice: item.price,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    imageUrl: item.imageUrl,
  }));
  const order = {
    id: crypto.randomUUID(),
    code: `DH${pad(nextNumber)}`,
    status: 'pending',
    paymentMethod: 'cod',
    recipientName: body.recipientName,
    phone: body.phone,
    shippingAddress: body.shippingAddress,
    note: body.note ?? null,
    items,
    itemCount: cart.itemCount,
    total: cart.total,
    createdAt: new Date().toISOString(),
    customer: CUSTOMERS[0],
  };
  nextNumber += 1;
  orders = [order, ...orders];
  byKey.set(body.idempotencyKey, order);
  emptyCartAfterOrder();
  return { order: toBuyerOrder(order) };
}

export async function mockGetOrder(id, { signal } = {}) {
  await mockDelay(400, signal);
  if (hasMockFlag('order-error')) throw serverError();
  const order = hasMockFlag('order-404') ? null : orders.find((item) => item.id === id);
  if (!order) throw notFound();
  return { order: toBuyerOrder(order) };
}

/** Query đúng GET /api/admin/orders: { status?, page?, pageSize? }. */
export async function mockAdminListOrders({ status, page = 1, pageSize = 20, signal } = {}) {
  if (hasMockFlag('admin-loading')) await mockForever(signal);
  await mockDelay(400, signal);
  if (hasMockFlag('admin-error')) throw serverError();

  const fields = {};
  if (status && !STATUSES.includes(status)) fields.status = 'Trạng thái không hợp lệ.';
  if (!Number.isInteger(page) || page < 1) fields.page = 'Trang phải là số nguyên từ 1.';
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    fields.pageSize = 'Số đơn mỗi trang phải từ 1 đến 50.';
  }
  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', fields);
  }

  const filtered = hasMockFlag('admin-empty')
    ? []
    : orders.filter((order) => !status || order.status === status);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    orders: filtered.slice(start, start + pageSize).map(toSummary),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function mockAdminGetOrder(id, { signal } = {}) {
  await mockDelay(400, signal);
  if (hasMockFlag('admin-error')) throw serverError();
  const order = hasMockFlag('admin-detail-404') ? null : orders.find((item) => item.id === id);
  if (!order) throw notFound();
  return { order };
}
