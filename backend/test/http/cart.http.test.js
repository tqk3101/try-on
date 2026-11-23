import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import { OTHER_ID, USER_ID, adminAuth, bearer, tokenFor, userAuth } from '../helpers/auth.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const P2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const MISSING = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaff';
const CAT = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Váy' };

const products = new Map();
let cartRows;
let tick;

function addProduct(id, price, name = `SP ${id.slice(-1)}`) {
  products.set(id, { id, name, price, image_path: `${id}/flatlay-1.png`, category: CAT });
}

const filterValue = (query, column) => query.filters.find((f) => f.column === column)?.value;
const matchRows = (query) =>
  cartRows.filter((row) =>
    query.filters.every((f) => f.type !== 'eq' || row[f.column] === f.value),
  );

/** Bảng cart_items giả có trạng thái, mô phỏng PK + CHECK + FK của migration 010. */
function cartHandler(query) {
  if (query.op === 'insert') {
    const row = query.payload;
    if (!products.has(row.product_id)) return { data: null, error: { code: '23503' } };
    if (cartRows.some((r) => r.profile_id === row.profile_id && r.product_id === row.product_id)) {
      return { data: null, error: { code: '23505' } };
    }
    if (row.quantity < 1 || row.quantity > 10) return { data: null, error: { code: '23514' } };
    tick += 1;
    cartRows.push({ ...row, created_at: new Date(2026, 0, 1, 0, 0, tick).toISOString() });
    return { data: null, error: null };
  }
  if (query.op === 'update') {
    const hits = matchRows(query);
    hits.forEach((row) => Object.assign(row, query.payload));
    return { data: hits.map((row) => ({ quantity: row.quantity })), error: null };
  }
  if (query.op === 'delete') {
    matchRows(query).forEach((row) => cartRows.splice(cartRows.indexOf(row), 1));
    return { data: null, error: null };
  }
  const hits = matchRows(query);
  if (query.options?.head) return { data: null, count: hits.length, error: null };
  if (query.terminal) return { data: hits[0] ? { quantity: hits[0].quantity } : null, error: null };
  const sorted = [...hits].sort(
    (a, b) => b.created_at.localeCompare(a.created_at) || a.product_id.localeCompare(b.product_id),
  );
  return {
    data: sorted.map((row) => ({
      product_id: row.product_id,
      quantity: row.quantity,
      created_at: row.created_at,
      product: products.get(row.product_id) ?? null,
    })),
    error: null,
  };
}

function seedLines(count, profileId = USER_ID) {
  for (let i = 0; i < count; i += 1) {
    const id = `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`;
    addProduct(id, 1000, `Bulk ${i}`);
    tick += 1;
    cartRows.push({
      profile_id: profileId,
      product_id: id,
      quantity: 1,
      created_at: new Date(2026, 0, 1, 0, 0, tick).toISOString(),
    });
  }
}

beforeEach(() => {
  fake.reset();
  products.clear();
  cartRows = [];
  tick = 0;
  addProduct(P1, 890000, 'Váy lụa');
  addProduct(P2, 250000, 'Áo thun');
  fake.on('cart_items', cartHandler);
  fake.on('products', (query) => {
    const id = filterValue(query, 'id');
    return { data: products.has(id) ? { id } : null, error: null };
  });
});

const post = (body, auth = userAuth()) =>
  request(app).post('/api/cart/items').set('Authorization', auth).send(body);

describe('xác thực', () => {
  it.each([
    ['get', '/api/cart'],
    ['post', '/api/cart/items'],
    ['put', `/api/cart/items/${P1}`],
    ['delete', `/api/cart/items/${P1}`],
  ])('401 khi chưa đăng nhập: %s %s', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('admin cũng dùng được giỏ (Q31) và không phải truy vấn bảng profiles', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(fake.queries('profiles')).toHaveLength(0);
  });
});

describe('GET /api/cart', () => {
  it('giỏ trống: items [], total 0, kèm limits', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        cart: {
          items: [],
          lineCount: 0,
          itemCount: 0,
          total: 0,
          limits: { maxLines: 50, maxQuantity: 10 },
        },
      },
    });
  });

  it('shape đúng contract, tổng tính từ giá hiện tại, ký URL theo lô, không lộ image_path', async () => {
    await post({ productId: P1, quantity: 2 });
    await post({ productId: P2 });
    fake.storageApi.createSignedUrls.mockClear();

    const res = await request(app).get('/api/cart').set('Authorization', userAuth());
    const { cart } = res.body.data;
    expect(cart.items.map((i) => i.productId)).toEqual([P2, P1]); // thêm sau lên đầu
    expect(cart.items[1]).toEqual({
      productId: P1,
      name: 'Váy lụa',
      price: 890000,
      imageUrl: `https://signed.test/products/${P1}/flatlay-1.png`,
      category: { id: CAT.id, name: 'Váy' },
      quantity: 2,
      lineTotal: 1780000,
      addedAt: expect.any(String),
    });
    expect(cart).toMatchObject({ lineCount: 2, itemCount: 3, total: 1780000 + 250000 });
    expect(fake.storageApi.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(res.body)).not.toMatch(/image_path|profile_id/);
  });

  it('đổi giá sản phẩm phản ánh ở lần GET sau (giỏ không lưu giá)', async () => {
    await post({ productId: P1 });
    products.get(P1).price = 500000;
    const res = await request(app).get('/api/cart').set('Authorization', userAuth());
    expect(res.body.data.cart.total).toBe(500000);
  });

  it('ký URL lỗi -> imageUrl null, vẫn 200', async () => {
    await post({ productId: P1 });
    fake.storageApi.createSignedUrls.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const res = await request(app).get('/api/cart').set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items[0].imageUrl).toBeNull();
  });

  it('chỉ trả giỏ của chính user (user khác không chạm được)', async () => {
    await post({ productId: P1 });
    const other = bearer(tokenFor(OTHER_ID));
    const res = await request(app).get('/api/cart').set('Authorization', other);
    expect(res.body.data.cart.items).toEqual([]);
    const del = await request(app).delete(`/api/cart/items/${P1}`).set('Authorization', other);
    expect(del.status).toBe(200);
    const put = await request(app)
      .put(`/api/cart/items/${P1}`)
      .set('Authorization', other)
      .send({ quantity: 5 });
    expect(put.status).toBe(404);
    expect(put.body.error.code).toBe('CART_ITEM_NOT_FOUND');
    expect(cartRows).toHaveLength(1);
    expect(cartRows[0].quantity).toBe(1);
  });
});

describe('POST /api/cart/items', () => {
  it('201 khi tạo dòng mới (quantity mặc định 1), trả cart + item', async () => {
    const res = await post({ productId: P1 });
    expect(res.status).toBe(201);
    expect(res.body.data.item).toMatchObject({ productId: P1, quantity: 1, lineTotal: 890000 });
    expect(res.body.data.cart.itemCount).toBe(1);
  });

  it('200 khi sản phẩm đã có: cộng dồn', async () => {
    await post({ productId: P1, quantity: 2 });
    const res = await post({ productId: P1, quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.item.quantity).toBe(5);
    expect(cartRows).toHaveLength(1);
  });

  it('cộng dồn > 10 -> 409 CART_QUANTITY_LIMIT, giỏ không đổi', async () => {
    await post({ productId: P1, quantity: 10 });
    const res = await post({ productId: P1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'CART_QUANTITY_LIMIT',
      message: 'Mỗi sản phẩm chỉ đặt tối đa 10 chiếc.',
    });
    expect(cartRows[0].quantity).toBe(10);
  });

  it('dòng thứ 51 -> 409 CART_FULL; thêm lại dòng đã có vẫn được', async () => {
    seedLines(50);
    const res = await post({ productId: P1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'CART_FULL',
      message: 'Giỏ hàng đã có 50 sản phẩm. Vui lòng bớt sản phẩm trước khi thêm.',
    });
    expect(cartRows).toHaveLength(50);
    const existing = await post({ productId: cartRows[0].product_id });
    expect(existing.status).toBe(200);
  });

  it('sản phẩm không tồn tại -> 404 PRODUCT_NOT_FOUND', async () => {
    const res = await post({ productId: MISSING });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('INSERT lỗi 23503 (sản phẩm bị xoá giữa chừng) -> 404 PRODUCT_NOT_FOUND', async () => {
    fake.on('cart_items', (q) =>
      q.op === 'insert' ? { data: null, error: { code: '23503' } } : cartHandler(q),
    );
    const res = await post({ productId: P1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('2 POST song song cùng sản phẩm -> 1 dòng quantity 2 (23505 chuyển sang cộng dồn)', async () => {
    const [a, b] = await Promise.all([post({ productId: P1 }), post({ productId: P1 })]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(cartRows).toHaveLength(1);
    expect(cartRows[0].quantity).toBe(2);
  });

  it('optimistic: UPDATE trượt điều kiện thì đọc lại và thử lại', async () => {
    await post({ productId: P1, quantity: 1 });
    let updates = 0;
    fake.on('cart_items', (q) => {
      if (q.op === 'update') {
        updates += 1;
        if (updates === 1) {
          cartRows[0].quantity = 4; // tab khác vừa đổi
          return { data: [], error: null };
        }
      }
      return cartHandler(q);
    });
    const res = await post({ productId: P1 });
    expect(res.status).toBe(200);
    expect(updates).toBe(2);
    expect(cartRows[0].quantity).toBe(5);
  });

  it('optimistic: trượt 3 lần liên tiếp -> 500, không lộ chi tiết', async () => {
    await post({ productId: P1 });
    fake.on('cart_items', (q) => (q.op === 'update' ? { data: [], error: null } : cartHandler(q)));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ productId: P1 });
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it.each([
    ['productId thiếu', {}, 'productId'],
    ['productId không phải uuid', { productId: 'abc' }, 'productId'],
    ['quantity 0', { productId: P1, quantity: 0 }, 'quantity'],
    ['quantity 11', { productId: P1, quantity: 11 }, 'quantity'],
    ['quantity số thập phân', { productId: P1, quantity: 1.5 }, 'quantity'],
    ['quantity là chuỗi', { productId: P1, quantity: '2' }, 'quantity'],
    ['quantity null', { productId: P1, quantity: null }, 'quantity'],
  ])('400 VALIDATION_ERROR: %s', async (_name, body, field) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty(field);
    expect(cartRows).toHaveLength(0);
  });

  it('quantity sai có message đúng bảng validate', async () => {
    const res = await post({ productId: P1, quantity: 11 });
    expect(res.body.error.fields.quantity).toBe('Số lượng phải từ 1 đến 10.');
  });

  it('body không phải object -> 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', userAuth())
      .send([1, 2]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('trường lạ (giá do client gửi) bị bỏ qua', async () => {
    const res = await post({ productId: P1, price: 1, profile_id: OTHER_ID });
    expect(res.status).toBe(201);
    expect(cartRows[0]).toMatchObject({ profile_id: USER_ID });
    expect(res.body.data.item.price).toBe(890000);
  });
});

describe('PUT /api/cart/items/:productId', () => {
  it('đặt số lượng tuyệt đối, gửi lại cho cùng kết quả', async () => {
    await post({ productId: P1 });
    const put = () =>
      request(app)
        .put(`/api/cart/items/${P1}`)
        .set('Authorization', userAuth())
        .send({ quantity: 7 });
    const first = await put();
    expect(first.status).toBe(200);
    expect(first.body.data.cart.items[0].quantity).toBe(7);
    expect(first.body.data.cart.total).toBe(7 * 890000);
    expect((await put()).body.data.cart.items[0].quantity).toBe(7);
  });

  it('dòng không có trong giỏ -> 404 CART_ITEM_NOT_FOUND đúng message', async () => {
    const res = await request(app)
      .put(`/api/cart/items/${P1}`)
      .set('Authorization', userAuth())
      .send({ quantity: 2 });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: 'CART_ITEM_NOT_FOUND',
      message: 'Sản phẩm này không còn trong giỏ hàng.',
    });
  });

  it.each([0, 11, 2.5, '3', null])('400 khi quantity = %j', async (quantity) => {
    await post({ productId: P1 });
    const res = await request(app)
      .put(`/api/cart/items/${P1}`)
      .set('Authorization', userAuth())
      .send({ quantity });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('quantity');
    expect(cartRows[0].quantity).toBe(1);
  });

  it('400 khi :productId không phải uuid', async () => {
    const res = await request(app)
      .put('/api/cart/items/abc')
      .set('Authorization', userAuth())
      .send({ quantity: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('productId');
  });
});

describe('DELETE /api/cart/items/:productId', () => {
  it('xoá dòng, trả cart mới; xoá lại vẫn 200 (idempotent)', async () => {
    await post({ productId: P1 });
    await post({ productId: P2 });
    const del = () => request(app).delete(`/api/cart/items/${P1}`).set('Authorization', userAuth());
    const first = await del();
    expect(first.status).toBe(200);
    expect(first.body.data.cart.items.map((i) => i.productId)).toEqual([P2]);
    const again = await del();
    expect(again.status).toBe(200);
    expect(again.body.data.cart.lineCount).toBe(1);
  });

  it('400 khi :productId không phải uuid', async () => {
    const res = await request(app).delete('/api/cart/items/abc').set('Authorization', userAuth());
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('admin xoá sản phẩm đang trong giỏ (cascade ở DB)', () => {
  it('dòng biến khỏi giỏ; PUT -> 404 CART_ITEM_NOT_FOUND; POST -> 404 PRODUCT_NOT_FOUND', async () => {
    await post({ productId: P1 });
    await post({ productId: P2 });
    products.delete(P1);
    cartRows.splice(
      cartRows.findIndex((r) => r.product_id === P1),
      1,
    );

    const cart = await request(app).get('/api/cart').set('Authorization', userAuth());
    expect(cart.body.data.cart.items.map((i) => i.productId)).toEqual([P2]);
    const put = await request(app)
      .put(`/api/cart/items/${P1}`)
      .set('Authorization', userAuth())
      .send({ quantity: 2 });
    expect(put.body.error.code).toBe('CART_ITEM_NOT_FOUND');
    expect((await post({ productId: P1 })).body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('lỗi hạ tầng', () => {
  it('lỗi DB khi đọc giỏ -> 500 INTERNAL_ERROR, không lộ chi tiết', async () => {
    fake.on('cart_items', () => ({ data: null, error: { code: 'XX000', message: 'secret' } }));
    const res = await request(app).get('/api/cart').set('Authorization', userAuth());
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|XX000/);
  });
});

describe('cartLimiter / cartReadLimiter (theo user)', () => {
  // User riêng để không dùng chung bộ đếm với các test ở trên (limiter lưu trong bộ nhớ theo file).
  const LIMIT_ID = '44444444-4444-4444-8444-444444444444';
  const READ_ID = '55555555-5555-4555-8555-555555555555';
  const limitAuth = () => bearer(tokenFor(LIMIT_ID));

  it('ghi: lần 61 trong 1 phút -> 429 + Retry-After; user khác và đọc không bị ảnh hưởng', async () => {
    const del = (auth) => request(app).delete(`/api/cart/items/${P1}`).set('Authorization', auth);
    for (let i = 0; i < 60; i += 1) {
      expect((await del(limitAuth())).status).toBe(200);
    }
    const blocked = await del(limitAuth());
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeDefined();

    expect((await del(bearer(tokenFor(OTHER_ID)))).status).toBe(200);
    const read = await request(app).get('/api/cart').set('Authorization', limitAuth());
    expect(read.status).toBe(200);
  });

  it('đọc: lần 121 trong 1 phút -> 429', async () => {
    const get = () =>
      request(app)
        .get('/api/cart')
        .set('Authorization', bearer(tokenFor(READ_ID)));
    for (let i = 0; i < 120; i += 1) {
      expect((await get()).status).toBe(200);
    }
    expect((await get()).status).toBe(429);
  });
});
