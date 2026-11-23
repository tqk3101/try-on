import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import {
  ADMIN_ID,
  OTHER_ID,
  USER_ID,
  adminAuth,
  bearer,
  tokenFor,
  userAuth,
} from '../helpers/auth.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

// Limiter chỉ bật trong test riêng của nó (bộ đếm theo user lưu trong bộ nhớ, dùng chung cả file).
const limiterState = vi.hoisted(() => ({ enabled: false }));
vi.mock('../../src/middlewares/rateLimiters.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    orderLimiter: (req, res, next) =>
      limiterState.enabled ? original.orderLimiter(req, res, next) : next(),
  };
});

const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const P2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const KEY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const KEY2 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';
const MISSING = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAT = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Váy' };

const products = new Map();
let cartRows;
let orders; // dòng orders đã có dạng PostgREST (kèm profile_id, idempotency_key)
let orderItems;
let orderNumber;
let rpcCalls;

function addProduct(id, price, name) {
  products.set(id, { id, name, price, image_path: `${id}/flatlay-1.png`, category: CAT });
}
const addToCart = (profileId, productId, quantity, tick = 0) =>
  cartRows.push({
    profile_id: profileId,
    product_id: productId,
    quantity,
    created_at: new Date(2026, 0, 1, 0, 0, tick).toISOString(),
  });

/** Mô phỏng hàm Postgres place_order (JS đồng bộ nên mỗi lần gọi là nguyên tử, như khoá profile). */
function placeOrderHandler(query) {
  const a = query.payload;
  rpcCalls.push(a);
  const existing = orders.find(
    (o) => o.profile_id === a.p_profile_id && o.idempotency_key === a.p_idempotency_key,
  );
  if (existing) return { data: [{ out_order_id: existing.id, out_created: false }], error: null };

  const lines = cartRows.filter(
    (r) => r.profile_id === a.p_profile_id && products.has(r.product_id),
  );
  if (lines.length === 0) return { data: null, error: { code: 'P0001', message: 'CART_EMPTY' } };
  const total = lines.reduce((s, r) => s + products.get(r.product_id).price * r.quantity, 0);
  if (total !== a.p_expected_total) {
    return { data: null, error: { code: 'P0001', message: 'CART_CHANGED' } };
  }

  orderNumber += 1;
  const id = `0000000${orderNumber}-0000-4000-8000-000000000000`.slice(-36);
  const sorted = [...lines].sort((x, y) => y.created_at.localeCompare(x.created_at));
  orders.push({
    id,
    order_number: orderNumber,
    profile_id: a.p_profile_id,
    idempotency_key: a.p_idempotency_key,
    status: 'pending',
    payment_method: 'cod',
    recipient_name: a.p_recipient_name,
    phone: a.p_phone,
    shipping_address: a.p_shipping_address,
    note: a.p_note,
    item_count: lines.reduce((s, r) => s + r.quantity, 0),
    total_amount: total,
    created_at: new Date(2026, 0, 2, 0, 0, orderNumber).toISOString(),
  });
  sorted.forEach((r, position) => {
    const p = products.get(r.product_id);
    orderItems.push({
      order_id: id,
      product_id: p.id,
      product_name: p.name,
      category_name: p.category.name,
      unit_price: p.price,
      quantity: r.quantity,
      line_total: p.price * r.quantity,
      position,
    });
  });
  cartRows = cartRows.filter((r) => r.profile_id !== a.p_profile_id);
  return { data: [{ out_order_id: id, out_created: true }], error: null };
}

const profiles = {
  [USER_ID]: { id: USER_ID, email: 'member@tryon.dev', display_name: 'Lan Anh' },
  [OTHER_ID]: { id: OTHER_ID, email: 'other@tryon.dev', display_name: null },
};

function withEmbeds(row) {
  return {
    ...row,
    items: orderItems
      .filter((i) => i.order_id === row.id)
      .map((i) => ({ ...i, product: products.get(i.product_id) ?? null })),
    customer: profiles[row.profile_id] ?? null,
  };
}

const matches = (row, query) =>
  query.filters.every((f) => f.type !== 'eq' || row[f.column] === f.value);

/** Bảng orders giả: eq, order created_at desc/id desc, range + count exact, head count. */
function ordersHandler(query) {
  const hits = orders.filter((row) => matches(row, query));
  if (query.options?.head) return { data: null, count: hits.length, error: null };
  if (query.terminal) {
    const row = hits[0];
    if (query.columns === 'id') return { data: row ? { id: row.id } : null, error: null };
    return { data: row ? withEmbeds(row) : null, error: null };
  }
  const sorted = [...hits].sort(
    (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  );
  const { from, to } = query.range ?? { from: 0, to: sorted.length - 1 };
  if (from >= sorted.length && sorted.length > 0) {
    return { data: null, count: null, error: { code: 'PGRST103', message: 'range' } };
  }
  return {
    data: sorted.slice(from, to + 1).map(withEmbeds),
    count: query.options?.count ? sorted.length : null,
    error: null,
  };
}

/** Mô phỏng FK: xoá sản phẩm -> cart_items cascade, order_items.product_id SET NULL. */
function deleteProduct(id) {
  products.delete(id);
  cartRows = cartRows.filter((r) => r.product_id !== id);
  orderItems.forEach((i) => {
    if (i.product_id === id) i.product_id = null;
  });
}

const VALID = {
  idempotencyKey: KEY,
  recipientName: '  Lan   Anh ',
  phone: '+84 912 345 678',
  shippingAddress: '12 Lê Lợi, Quận 1, TP.HCM',
  note: '  Giao giờ hành chính ',
  expectedTotal: 890000 * 2 + 250000,
};

const place = (body = VALID, auth = userAuth()) =>
  request(app).post('/api/orders').set('Authorization', auth).send(body);

beforeEach(() => {
  fake.reset();
  products.clear();
  cartRows = [];
  orders = [];
  orderItems = [];
  orderNumber = 0;
  rpcCalls = [];
  limiterState.enabled = false;
  addProduct(P1, 890000, 'Váy lụa');
  addProduct(P2, 250000, 'Áo thun');
  addToCart(USER_ID, P1, 2, 1);
  addToCart(USER_ID, P2, 1, 2);
  fake.on('rpc:place_order', placeOrderHandler);
  fake.on('orders', ordersHandler);
  fake.on('profiles', (q) => {
    const id = q.filters.find((f) => f.column === 'id')?.value;
    return { data: { role: id === ADMIN_ID ? 'admin' : 'user' }, error: null };
  });
});

describe('xác thực và phân quyền', () => {
  it.each([
    ['post', '/api/orders'],
    ['get', `/api/orders/${P1}`],
    ['get', '/api/admin/orders'],
    ['get', `/api/admin/orders/${P1}`],
  ])('401 khi chưa đăng nhập: %s %s', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('user thường gọi API admin đơn hàng -> 403', async () => {
    const list = await request(app).get('/api/admin/orders').set('Authorization', userAuth());
    const one = await request(app).get(`/api/admin/orders/${P1}`).set('Authorization', userAuth());
    expect(list.status).toBe(403);
    expect(one.status).toBe(403);
    expect(list.body.error.code).toBe('FORBIDDEN');
  });

  it('admin cũng đặt hàng được (Q31)', async () => {
    addToCart(ADMIN_ID, P2, 1);
    const res = await place({ ...VALID, expectedTotal: 250000 }, adminAuth());
    expect(res.status).toBe(201);
  });
});

describe('POST /api/orders', () => {
  it('201: tạo đúng 1 đơn + dòng snapshot, giỏ trống, dữ liệu chuẩn hoá, shape đúng contract', async () => {
    const res = await place();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order).toEqual({
      id: expect.any(String),
      code: 'DH000001',
      status: 'pending',
      paymentMethod: 'cod',
      recipientName: 'Lan Anh',
      phone: '0912345678',
      shippingAddress: '12 Lê Lợi, Quận 1, TP.HCM',
      note: 'Giao giờ hành chính',
      items: [
        {
          productId: P2,
          name: 'Áo thun',
          categoryName: 'Váy',
          unitPrice: 250000,
          quantity: 1,
          lineTotal: 250000,
          imageUrl: `https://signed.test/products/${P2}/flatlay-1.png`,
        },
        {
          productId: P1,
          name: 'Váy lụa',
          categoryName: 'Váy',
          unitPrice: 890000,
          quantity: 2,
          lineTotal: 1780000,
          imageUrl: `https://signed.test/products/${P1}/flatlay-1.png`,
        },
      ],
      itemCount: 3,
      total: 2030000,
      createdAt: expect.any(String),
    });
    expect(orders).toHaveLength(1);
    expect(orderItems).toHaveLength(2);
    expect(cartRows.filter((r) => r.profile_id === USER_ID)).toHaveLength(0);
    expect(JSON.stringify(res.body)).not.toMatch(
      /profile_id|idempotency_key|image_path|order_number|customer/,
    );
  });

  it('RPC nhận đúng tham số đã chuẩn hoá (không có giá/tổng do client tự đặt)', async () => {
    await place({ ...VALID, total: 1, price: 1, status: 'completed' });
    expect(rpcCalls).toEqual([
      {
        p_profile_id: USER_ID,
        p_idempotency_key: KEY,
        p_recipient_name: 'Lan Anh',
        p_phone: '0912345678',
        p_shipping_address: '12 Lê Lợi, Quận 1, TP.HCM',
        p_note: 'Giao giờ hành chính',
        p_expected_total: 2030000,
      },
    ]);
    expect(orders[0].status).toBe('pending');
  });

  it('note thiếu / rỗng -> null', async () => {
    const rest = { ...VALID };
    delete rest.note;
    const res = await place(rest);
    expect(res.status).toBe(201);
    expect(res.body.data.order.note).toBeNull();
    expect(rpcCalls[0].p_note).toBeNull();
  });

  it('cùng khoá gửi lại -> 200 đúng đơn cũ, không tạo đơn thứ hai', async () => {
    const first = await place();
    const second = await place();
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.order.id).toBe(first.body.data.order.id);
    expect(orders).toHaveLength(1);
  });

  it('2 request song song cùng khoá -> 1 đơn (201 + 200)', async () => {
    const [a, b] = await Promise.all([place(), place()]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.order.id).toBe(b.body.data.order.id);
    expect(orders).toHaveLength(1);
  });

  it('khoá khác khi giỏ đã trống (tab khác vừa đặt) -> 409 CART_EMPTY', async () => {
    await place();
    const res = await place({ ...VALID, idempotencyKey: KEY2 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CART_EMPTY', message: 'Giỏ hàng đang trống.' });
    expect(orders).toHaveLength(1);
  });

  it('đổi giá sau khi mở checkout -> 409 CART_CHANGED, giỏ còn nguyên, không có đơn', async () => {
    products.get(P1).price = 500000;
    const res = await place();
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'CART_CHANGED',
      message:
        'Giỏ hàng vừa thay đổi (giá hoặc sản phẩm). Vui lòng kiểm tra lại trước khi đặt hàng.',
    });
    expect(orders).toHaveLength(0);
    expect(cartRows.filter((r) => r.profile_id === USER_ID)).toHaveLength(2);
  });

  it('sản phẩm bị xoá khỏi giỏ sau khi mở checkout -> 409 CART_CHANGED', async () => {
    deleteProduct(P2);
    const res = await place();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_CHANGED');
  });

  it('PROFILE_NOT_FOUND -> 401 INVALID_TOKEN', async () => {
    fake.on('rpc:place_order', () => ({
      data: null,
      error: { code: 'P0001', message: 'PROFILE_NOT_FOUND' },
    }));
    const res = await place();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('23505 (dự phòng) -> đọc lại đơn theo khoá -> 200', async () => {
    const first = await place();
    fake.on('rpc:place_order', () => ({ data: null, error: { code: '23505', message: 'dup' } }));
    const res = await place();
    expect(res.status).toBe(200);
    expect(res.body.data.order.id).toBe(first.body.data.order.id);
  });

  it('23505 nhưng không tìm thấy đơn -> 500', async () => {
    fake.on('rpc:place_order', () => ({ data: null, error: { code: '23505', message: 'dup' } }));
    const res = await place();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('lỗi RPC khác (23514, P0001 lạ) -> 500, không lộ chi tiết DB, log không chứa SĐT/địa chỉ', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const error of [
      { code: '23514', message: 'violates check orders_phone_format 0912345678' },
      { code: 'P0001', message: 'SOMETHING_ELSE' },
    ]) {
      fake.on('rpc:place_order', () => ({ data: null, error }));
      const res = await place();
      expect(res.status).toBe(500);
      expect(res.body.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/orders_phone_format|SOMETHING/);
    }
    const logged = JSON.stringify(spy.mock.calls.map((c) => c.map(String)));
    expect(logged).not.toMatch(/0912345678|Lê Lợi|Lan Anh|Giao giờ/);
    spy.mockRestore();
  });

  describe('validate', () => {
    const cases = [
      ['idempotencyKey', { idempotencyKey: 'abc' }],
      ['idempotencyKey', { idempotencyKey: undefined }],
      ['recipientName', { recipientName: '   ' }],
      ['recipientName', { recipientName: 'a'.repeat(101) }],
      ['recipientName', { recipientName: 'Lan\u0007Anh' }],
      ['recipientName', { recipientName: 123 }],
      ['phone', { phone: undefined }],
      ['phone', { phone: '' }],
      ['phone', { phone: '12345' }],
      ['phone', { phone: '0212345678' }],
      ['shippingAddress', { shippingAddress: 'ngắn quá' }],
      ['shippingAddress', { shippingAddress: 'a'.repeat(501) }],
      ['shippingAddress', { shippingAddress: undefined }],
      ['note', { note: 'x'.repeat(501) }],
      ['note', { note: 5 }],
      ['expectedTotal', { expectedTotal: '2030000' }],
      ['expectedTotal', { expectedTotal: -1 }],
      ['expectedTotal', { expectedTotal: 1.5 }],
      ['expectedTotal', { expectedTotal: undefined }],
    ];
    it.each(cases)('400 fields.%s khi %j', async (field, patch) => {
      const res = await place({ ...VALID, ...patch });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(res.body.error.fields)).toContain(field);
      expect(rpcCalls).toHaveLength(0);
    });

    it('gom lỗi nhiều trường', async () => {
      const res = await place({});
      expect(Object.keys(res.body.error.fields).sort()).toEqual([
        'expectedTotal',
        'idempotencyKey',
        'phone',
        'recipientName',
        'shippingAddress',
      ]);
    });

    it('body không phải object -> 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', userAuth())
        .set('Content-Type', 'application/json')
        .send('[1]');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('chấp nhận note nhiều dòng và expectedTotal = 0 vẫn tới được RPC', async () => {
      const res = await place({ ...VALID, note: 'Dòng 1\nDòng 2', expectedTotal: 0 });
      expect(res.status).toBe(409); // tổng thật ≠ 0
      expect(rpcCalls[0].p_note).toBe('Dòng 1\nDòng 2');
    });
  });

  it('orderLimiter: lần thứ 11 trong 15 phút -> 429, theo user (user khác không bị ảnh hưởng)', async () => {
    limiterState.enabled = true;
    const results = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await place({
        ...VALID,
        idempotencyKey: `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, '0')}`,
      });
      results.push(res.status);
    }
    expect(results.slice(0, 10).every((s) => s !== 429)).toBe(true);
    expect(results[10]).toBe(429);
    const other = await place(VALID, bearer(tokenFor(OTHER_ID)));
    expect(other.status).not.toBe(429);
  });
});

describe('GET /api/orders/:id', () => {
  it('200 cho chủ đơn', async () => {
    const created = await place();
    const res = await request(app)
      .get(`/api/orders/${created.body.data.order.id}`)
      .set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.order).toEqual(created.body.data.order);
  });

  it('đơn của user khác / không tồn tại / id không phải uuid -> 404 ORDER_NOT_FOUND', async () => {
    const created = await place();
    const other = bearer(tokenFor(OTHER_ID));
    for (const [id, auth] of [
      [created.body.data.order.id, other],
      [MISSING, userAuth()],
      ['not-a-uuid', userAuth()],
    ]) {
      const res = await request(app).get(`/api/orders/${id}`).set('Authorization', auth);
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({
        code: 'ORDER_NOT_FOUND',
        message: 'Không tìm thấy đơn hàng.',
      });
    }
    // id không phải uuid không được gửi xuống DB
    expect(
      fake.queries('orders').every((q) => q.filters.every((f) => f.value !== 'not-a-uuid')),
    ).toBe(true);
  });

  it('regression: xoá sản phẩm có trong đơn -> đơn còn nguyên, productId null, imageUrl null, giữ snapshot', async () => {
    const created = await place();
    deleteProduct(P1);
    const res = await request(app)
      .get(`/api/orders/${created.body.data.order.id}`)
      .set('Authorization', userAuth());
    expect(res.status).toBe(200);
    const removed = res.body.data.order.items.find((i) => i.name === 'Váy lụa');
    expect(removed).toEqual({
      productId: null,
      name: 'Váy lụa',
      categoryName: 'Váy',
      unitPrice: 890000,
      quantity: 2,
      lineTotal: 1780000,
      imageUrl: null,
    });
    const kept = res.body.data.order.items.find((i) => i.name === 'Áo thun');
    expect(kept.productId).toBe(P2);
    expect(kept.imageUrl).toContain(P2);
    expect(res.body.data.order.total).toBe(2030000);
  });

  it('ký URL lỗi -> imageUrl null, vẫn 200', async () => {
    const created = await place();
    fake.storageApi.createSignedUrls.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const res = await request(app)
      .get(`/api/orders/${created.body.data.order.id}`)
      .set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.order.items.every((i) => i.imageUrl === null)).toBe(true);
  });
});

describe('GET /api/admin/orders', () => {
  const seedOrders = (count, status = 'pending', profileId = USER_ID) => {
    for (let i = 0; i < count; i += 1) {
      orderNumber += 1;
      orders.push({
        id: `1000000${String(orderNumber).padStart(4, '0')}-0000-4000-8000-000000000000`.slice(-36),
        order_number: orderNumber,
        profile_id: profileId,
        idempotency_key: `ffffffff-ffff-4fff-8fff-${String(orderNumber).padStart(12, '0')}`,
        status,
        payment_method: 'cod',
        recipient_name: `Người ${orderNumber}`,
        phone: '0912345678',
        shipping_address: 'Địa chỉ riêng tư số 1',
        note: 'ghi chú riêng tư',
        item_count: 2,
        total_amount: 1000000 + orderNumber,
        created_at: new Date(2026, 0, 2, 0, 0, orderNumber).toISOString(),
      });
    }
  };
  const list = (qs = '') =>
    request(app).get(`/api/admin/orders${qs}`).set('Authorization', adminAuth());

  it('danh sách rỗng: orders [], pagination total 0, totalPages 0', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      orders: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
  });

  it('shape AdminOrderSummary: không có SĐT/địa chỉ/ghi chú, mới nhất trước', async () => {
    seedOrders(2);
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.data.orders.map((o) => o.code)).toEqual(['DH000002', 'DH000001']);
    expect(res.body.data.orders[0]).toEqual({
      id: expect.any(String),
      code: 'DH000002',
      status: 'pending',
      itemCount: 2,
      total: 1000002,
      recipientName: 'Người 2',
      customer: { id: USER_ID, email: 'member@tryon.dev', displayName: 'Lan Anh' },
      createdAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toMatch(
      /0912345678|riêng tư|phone|shippingAddress|note|profile_id|order_number/,
    );
    const query = fake.queries('orders').at(-1);
    expect(query.columns).not.toMatch(/phone|shipping_address|note/);
  });

  it('phân trang: 57 đơn -> trang 1/2/3 đúng range, totalPages 3', async () => {
    seedOrders(57);
    const p1 = await list();
    const p3 = await list('?page=3');
    expect(p1.body.data.orders).toHaveLength(20);
    expect(p1.body.data.pagination).toEqual({ page: 1, pageSize: 20, total: 57, totalPages: 3 });
    expect(p3.body.data.orders).toHaveLength(17);
    expect(p3.body.data.orders.at(-1).code).toBe('DH000001');
    expect(fake.queries('orders').at(-1).range).toEqual({ from: 40, to: 59 });
    expect(fake.queries('orders').at(-1).options).toEqual({ count: 'exact' });
  });

  it('pageSize tuỳ chọn 1–50', async () => {
    seedOrders(12);
    const res = await list('?pageSize=5&page=3');
    expect(res.body.data.orders).toHaveLength(2);
    expect(res.body.data.pagination).toEqual({ page: 3, pageSize: 5, total: 12, totalPages: 3 });
  });

  it('page vượt totalPages -> 200 orders [] giữ total', async () => {
    seedOrders(3);
    const res = await list('?page=9');
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual([]);
    expect(res.body.data.pagination).toEqual({ page: 9, pageSize: 20, total: 3, totalPages: 1 });
  });

  it('lọc theo trạng thái', async () => {
    seedOrders(3, 'pending');
    seedOrders(2, 'completed');
    const res = await list('?status=completed');
    expect(res.body.data.orders).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.data.orders.every((o) => o.status === 'completed')).toBe(true);
    const none = await list('?status=cancelled');
    expect(none.body.data.orders).toEqual([]);
  });

  it.each([
    ['status=bogus', 'status'],
    ['status=', 'status'],
    ['status=pending&status=completed', 'status'],
    ['page=0', 'page'],
    ['page=-1', 'page'],
    ['page=abc', 'page'],
    ['page=1.5', 'page'],
    ['page=99999999999', 'page'],
    ['pageSize=0', 'pageSize'],
    ['pageSize=51', 'pageSize'],
    ['pageSize=x', 'pageSize'],
  ])('query sai ?%s -> 400 fields.%s', async (qs, field) => {
    const res = await list(`?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields)).toContain(field);
  });

  it('lỗi DB -> 500 không lộ chi tiết', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.on('orders', () => ({ data: null, error: { code: '57014', message: 'secret detail' } }));
    const res = await list();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/secret detail|57014/);
    spy.mockRestore();
  });
});

describe('GET /api/admin/orders/:id', () => {
  it('200: AdminOrder = Order + customer, đủ SĐT/địa chỉ/ghi chú; đơn của bất kỳ user', async () => {
    const created = await place();
    const res = await request(app)
      .get(`/api/admin/orders/${created.body.data.order.id}`)
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.order).toEqual({
      ...created.body.data.order,
      customer: { id: USER_ID, email: 'member@tryon.dev', displayName: 'Lan Anh' },
    });
    expect(res.body.data.order.phone).toBe('0912345678');
  });

  it('404 ORDER_NOT_FOUND khi không có / không phải uuid', async () => {
    for (const id of [MISSING, 'zzz']) {
      const res = await request(app)
        .get(`/api/admin/orders/${id}`)
        .set('Authorization', adminAuth());
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    }
  });
});
