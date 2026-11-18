import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import { USER_ID, adminAuth, bearer, tokenFor, userAuth } from '../helpers/auth.js';
import { jpegBuffer as jpgBuf, pngBuffer as pngBuf } from '../helpers/images.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

/** requireAdmin đọc role hiện tại từ DB: giả lập bằng handler bảng profiles. */
const dbRole = (role) => fake.on('profiles', () => ({ data: role ? { role } : null, error: null }));

beforeEach(() => fake.reset());

describe('phân quyền /api/admin (requireAuth + requireAdmin)', () => {
  it('401 cho khách (không token)', async () => {
    const res = await request(app).get('/api/admin/ping');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('403 FORBIDDEN cho user thường', async () => {
    dbRole('user');
    const res = await request(app).get('/api/admin/ping').set('Authorization', userAuth());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('200 cho admin', async () => {
    dbRole('admin');
    const res = await request(app).get('/api/admin/ping').set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { ok: true } });
  });

  it('role lấy từ DB, không tin JWT: JWT admin nhưng DB là user -> 403', async () => {
    dbRole('user');
    const res = await request(app).get('/api/admin/ping').set('Authorization', adminAuth());
    expect(res.status).toBe(403);
  });

  it('role lấy từ DB: JWT user nhưng DB đã nâng admin -> 200', async () => {
    dbRole('admin');
    const res = await request(app).get('/api/admin/ping').set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(fake.queries('profiles')[0].filters).toContainEqual({
      type: 'eq',
      column: 'id',
      value: USER_ID,
    });
  });

  it('401 INVALID_TOKEN khi user đã bị xoá khỏi DB', async () => {
    dbRole(null);
    const res = await request(app).get('/api/admin/ping').set('Authorization', adminAuth());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('500 khi DB lỗi (không cho qua)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.on('profiles', () => ({ data: null, error: { code: 'XX000', message: 'x' } }));
    const res = await request(app).get('/api/admin/ping').set('Authorization', adminAuth());
    expect(res.status).toBe(500);
  });

  it('mọi route admin bị chặn với user thường, kể cả khi gửi file (multer không chạy)', async () => {
    dbRole('user');
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', bearer(tokenFor(USER_ID, 'user')))
      .field('name', 'x');
    expect(res.status).toBe(403);
    for (const [method, path] of [
      ['get', '/api/admin/categories'],
      ['post', '/api/admin/categories'],
      ['put', '/api/admin/categories/x'],
      ['delete', '/api/admin/categories/x'],
      ['get', '/api/admin/products'],
      ['delete', '/api/admin/products/x'],
    ]) {
      const r = await request(app)[method](path).set('Authorization', userAuth());
      expect(r.status, `${method} ${path}`).toBe(403);
    }
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });
});

describe('admin: danh mục', () => {
  const CAT = '44444444-4444-4444-8444-444444444444';
  const catRow = (over = {}) => ({
    id: CAT,
    name: 'Áo thun',
    slug: 'ao-thun',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    products: [{ count: 2 }],
    ...over,
  });
  const admin = () => ({ Authorization: adminAuth() });

  beforeEach(() => dbRole('admin'));

  it('GET: danh sách kèm productCount, sắp theo created_at asc', async () => {
    fake.on('categories', () => ({
      data: [catRow(), catRow({ id: 'x', products: [] })],
      error: null,
    }));
    const res = await request(app).get('/api/admin/categories').set(admin());
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(2);
    expect(res.body.data.categories[0]).toMatchObject({
      id: CAT,
      productCount: 2,
      slug: 'ao-thun',
    });
    expect(res.body.data.categories[1].productCount).toBe(0);
    expect(fake.queries('categories')[0].orders[0]).toMatchObject({ column: 'created_at' });
  });

  it('POST 201: slug sinh từ tên, bỏ qua slug do client gửi', async () => {
    fake.on('categories', () => ({ data: catRow({ name: 'Đầm', slug: 'dam' }), error: null }));
    const res = await request(app)
      .post('/api/admin/categories')
      .set(admin())
      .send({ name: ' Đầm ', slug: 'hack' });
    expect(res.status).toBe(201);
    expect(fake.queries('categories', 'insert')[0].payload).toEqual({ name: 'Đầm', slug: 'dam' });
  });

  it('POST 400 khi tên trống', async () => {
    const res = await request(app).post('/api/admin/categories').set(admin()).send({ name: ' ' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.name).toBeTruthy();
  });

  it('POST 409 CATEGORY_EXISTS khi trùng (23505)', async () => {
    fake.on('categories', () => ({ data: null, error: { code: '23505' } }));
    const res = await request(app).post('/api/admin/categories').set(admin()).send({ name: 'Áo' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_EXISTS');
  });

  it('PUT 200 sinh lại slug; 404 khi id không phải uuid (không gửi xuống DB); 404 khi không có dòng', async () => {
    fake.on('categories', () => ({ data: catRow({ name: 'Quần', slug: 'quan' }), error: null }));
    const ok = await request(app)
      .put(`/api/admin/categories/${CAT}`)
      .set(admin())
      .send({ name: 'Quần' });
    expect(ok.status).toBe(200);
    expect(fake.queries('categories', 'update')[0].payload).toEqual({ name: 'Quần', slug: 'quan' });

    fake.calls.length = 0;
    const bad = await request(app)
      .put('/api/admin/categories/abc')
      .set(admin())
      .send({ name: 'Q' });
    expect(bad.status).toBe(404);
    expect(bad.body.error.code).toBe('CATEGORY_NOT_FOUND');
    expect(fake.queries('categories')).toHaveLength(0);

    fake.on('categories', () => ({ data: null, error: null }));
    const missing = await request(app)
      .put(`/api/admin/categories/${CAT}`)
      .set(admin())
      .send({ name: 'Q' });
    expect(missing.status).toBe(404);
  });

  it('DELETE 409 CATEGORY_NOT_EMPTY khi còn sản phẩm (không xoá)', async () => {
    fake.on('products', () => ({ data: null, count: 3, error: null }));
    const res = await request(app).delete(`/api/admin/categories/${CAT}`).set(admin());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_NOT_EMPTY');
    expect(fake.queries('categories', 'delete')).toHaveLength(0);
  });

  it('DELETE 409 khi race: FK 23503 lúc xoá', async () => {
    fake.on('products', () => ({ data: null, count: 0, error: null }));
    fake.on('categories', () => ({ data: null, error: { code: '23503' } }));
    const res = await request(app).delete(`/api/admin/categories/${CAT}`).set(admin());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_NOT_EMPTY');
  });

  it('DELETE 200 khi rỗng; 404 khi không có dòng nào bị xoá', async () => {
    fake.on('products', () => ({ data: null, count: 0, error: null }));
    fake.on('categories', () => ({ data: [{ id: CAT }], error: null }));
    const ok = await request(app).delete(`/api/admin/categories/${CAT}`).set(admin());
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ success: true, data: { id: CAT } });

    fake.on('categories', () => ({ data: [], error: null }));
    const missing = await request(app).delete(`/api/admin/categories/${CAT}`).set(admin());
    expect(missing.status).toBe(404);
  });
});

describe('admin: sản phẩm', () => {
  const CAT = '44444444-4444-4444-8444-444444444444';
  const PID = '55555555-5555-4555-8555-555555555555';
  const IMG = `${PID}/flatlay-1.png`;
  const prodRow = (over = {}) => ({
    id: PID,
    name: 'Áo thun',
    price: 199000,
    image_path: IMG,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    category: { id: CAT, name: 'Áo', slug: 'ao' },
    ...over,
  });
  const admin = () => ({ Authorization: adminAuth() });
  const png = () => pngBuf(800, 1000);

  beforeEach(() => dbRole('admin'));

  function mockProducts({ category = true, insert, update, existing = { image_path: IMG } } = {}) {
    fake.on('categories', () => ({ data: category ? { id: CAT } : null, error: null }));
    fake.on('products', (q) => {
      if (q.op === 'insert')
        return insert ?? { data: prodRow({ image_path: q.payload.image_path }), error: null };
      if (q.op === 'update')
        return (
          update ?? { data: prodRow({ image_path: q.payload.image_path ?? IMG }), error: null }
        );
      if (q.op === 'delete') return { data: { image_path: IMG }, error: null };
      if (q.columns === 'image_path') return { data: existing, error: null };
      return { data: [prodRow()], error: null };
    });
  }

  const form = (r, over = {}) => {
    const fields = { name: 'Áo thun', price: '199000', categoryId: CAT, ...over };
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) r.field(k, v);
    return r;
  };
  const attach = (r, buf, filename = 'a.png', contentType = 'image/png') =>
    r.attach('image', buf, { filename, contentType });

  it('GET danh sách: ký URL theo lô một lần, không lộ image_path; lọc theo categoryId', async () => {
    mockProducts();
    const res = await request(app).get(`/api/admin/products?categoryId=${CAT}`).set(admin());
    expect(res.status).toBe(200);
    expect(res.body.data.products[0]).toMatchObject({
      id: PID,
      price: 199000,
      category: { id: CAT, slug: 'ao' },
      imageUrl: `https://signed.test/products/${IMG}`,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/image_path|imagePath/);
    expect(fake.storageApi.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(fake.queries('products')[0].filters).toContainEqual({
      type: 'eq',
      column: 'category_id',
      value: CAT,
    });
  });

  it('GET danh sách: categoryId sai định dạng -> 400', async () => {
    const res = await request(app).get('/api/admin/products?categoryId=zzz').set(admin());
    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toBeTruthy();
  });

  it('GET danh sách: ký URL lỗi -> vẫn 200, imageUrl null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockProducts();
    fake.storageApi.createSignedUrls.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await request(app).get('/api/admin/products').set(admin());
    expect(res.status).toBe(200);
    expect(res.body.data.products[0].imageUrl).toBeNull();
  });

  it('GET một sản phẩm: 404 khi id không phải uuid / không có', async () => {
    mockProducts();
    const bad = await request(app).get('/api/admin/products/abc').set(admin());
    expect(bad.status).toBe(404);
    expect(bad.body.error.code).toBe('PRODUCT_NOT_FOUND');
    fake.on('products', () => ({ data: null, error: null }));
    const missing = await request(app).get(`/api/admin/products/${PID}`).set(admin());
    expect(missing.status).toBe(404);
  });

  it('POST 400 gom lỗi text + thiếu ảnh, không upload', async () => {
    mockProducts();
    const res = await request(app)
      .post('/api/admin/products')
      .set(admin())
      .field('name', '')
      .field('price', '0');
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'categoryId',
      'image',
      'name',
      'price',
    ]);
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('POST 415 khi nội dung không phải ảnh', async () => {
    mockProducts();
    const res = await attach(
      form(request(app).post('/api/admin/products').set(admin())),
      Buffer.from('not an image'),
    );
    expect(res.status).toBe(415);
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('POST 400: ảnh nhỏ hơn 400px và danh mục không tồn tại cùng lúc', async () => {
    mockProducts({ category: false });
    const res = await attach(
      form(request(app).post('/api/admin/products').set(admin())),
      pngBuf(399, 1000),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.fields.image).toMatch(/400/);
    expect(res.body.error.fields.categoryId).toBeTruthy();
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('POST 400 khi ảnh có header hỏng (không đọc được kích thước)', async () => {
    mockProducts();
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(10)]);
    const res = await attach(
      form(request(app).post('/api/admin/products').set(admin())),
      broken,
      'a.jpg',
      'image/jpeg',
    );
    expect(res.status).toBe(400);
    expect(res.body.error.fields.image).toBeTruthy();
  });

  it('POST 413 khi ảnh vượt 5MB', async () => {
    mockProducts();
    const big = Buffer.concat([png(), Buffer.alloc(5 * 1024 * 1024 + 1)]);
    const res = await attach(form(request(app).post('/api/admin/products').set(admin())), big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('POST 201: upload path {id}/flatlay-{ms}.{ext} rồi insert cùng id; không lộ image_path', async () => {
    mockProducts();
    const res = await attach(
      form(request(app).post('/api/admin/products').set(admin())),
      jpgBuf(800, 800),
      'a.jpg',
      'image/jpeg',
    );
    expect(res.status).toBe(201);
    const [bucket, path] = fake.storageApi.upload.mock.calls[0];
    expect(bucket).toBe('products');
    expect(path).toMatch(/^[0-9a-f-]{36}\/flatlay-\d+\.jpg$/);
    const [insert] = fake.queries('products', 'insert');
    expect(insert.payload).toMatchObject({
      id: path.split('/')[0],
      category_id: CAT,
      name: 'Áo thun',
      price: 199000,
      image_path: path,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/image_path/);
  });

  it('POST: INSERT lỗi -> xoá object vừa upload; 23503 -> 400 fields.categoryId', async () => {
    mockProducts({ insert: { data: null, error: { code: '23503' } } });
    const res = await attach(form(request(app).post('/api/admin/products').set(admin())), png());
    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toBeTruthy();
    const uploaded = fake.storageApi.upload.mock.calls[0][1];
    expect(fake.storageApi.remove).toHaveBeenCalledWith('products', [uploaded]);
  });

  it('PUT chỉ text: không đụng Storage', async () => {
    mockProducts();
    const res = await form(request(app).put(`/api/admin/products/${PID}`).set(admin()), {
      name: 'Tên mới',
    });
    expect(res.status).toBe(200);
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
    expect(fake.storageApi.remove).not.toHaveBeenCalled();
    expect(fake.queries('products', 'update')[0].payload).toEqual({
      name: 'Tên mới',
      price: 199000,
      category_id: CAT,
    });
  });

  it('PUT có ảnh mới: upload -> update -> xoá ảnh cũ', async () => {
    mockProducts();
    const res = await attach(
      form(request(app).put(`/api/admin/products/${PID}`).set(admin())),
      png(),
    );
    expect(res.status).toBe(200);
    const newPath = fake.storageApi.upload.mock.calls[0][1];
    expect(newPath).toMatch(new RegExp(`^${PID}/flatlay-\\d+\\.png$`));
    expect(fake.storageApi.remove).toHaveBeenCalledWith('products', [IMG]);
  });

  it('PUT: UPDATE trả 0 dòng (bị xoá giữa chừng) -> 404 và xoá ảnh mới, giữ ảnh cũ', async () => {
    mockProducts({ update: { data: null, error: null } });
    const res = await attach(
      form(request(app).put(`/api/admin/products/${PID}`).set(admin())),
      png(),
    );
    expect(res.status).toBe(404);
    const newPath = fake.storageApi.upload.mock.calls[0][1];
    expect(fake.storageApi.remove).toHaveBeenCalledTimes(1);
    expect(fake.storageApi.remove).toHaveBeenCalledWith('products', [newPath]);
  });

  it('PUT 404 khi sản phẩm không tồn tại (không upload)', async () => {
    mockProducts({ existing: null });
    const res = await attach(
      form(request(app).put(`/api/admin/products/${PID}`).set(admin())),
      png(),
    );
    expect(res.status).toBe(404);
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('DELETE: xoá row trước, object sau; 404 khi không có', async () => {
    mockProducts();
    const ok = await request(app).delete(`/api/admin/products/${PID}`).set(admin());
    expect(ok.status).toBe(200);
    expect(ok.body.data).toEqual({ id: PID });
    expect(fake.storageApi.remove).toHaveBeenCalledWith('products', [IMG]);

    fake.on('products', () => ({ data: null, error: null }));
    const missing = await request(app).delete(`/api/admin/products/${PID}`).set(admin());
    expect(missing.status).toBe(404);
  });

  it('DELETE: xoá object lỗi (best-effort) vẫn 200', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockProducts();
    fake.storageApi.remove.mockRejectedValue(new Error('storage down'));
    const res = await request(app).delete(`/api/admin/products/${PID}`).set(admin());
    expect(res.status).toBe(200);
  });
});
