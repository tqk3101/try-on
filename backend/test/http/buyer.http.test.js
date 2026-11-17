import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import { userAuth } from '../helpers/auth.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const CAT = '44444444-4444-4444-8444-444444444444';
const catRow = (id, name, count) => ({
  id,
  name,
  slug: name.toLowerCase(),
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  products: [{ count }],
});

beforeEach(() => fake.reset());

describe('GET /api/categories (người mua)', () => {
  it('401 khi chưa đăng nhập', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('chỉ trả danh mục có >= 1 sản phẩm, chỉ { id, name, slug } (không productCount)', async () => {
    fake.on('categories', () => ({
      data: [catRow('a', 'Ao', 2), catRow('b', 'Quan', 0), catRow('c', 'Vay', 1)],
      error: null,
    }));
    const res = await request(app).get('/api/categories').set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([
      { id: 'a', name: 'Ao', slug: 'ao' },
      { id: 'c', name: 'Vay', slug: 'vay' },
    ]);
  });

  it('user thường (không cần admin) vào được; không gọi bảng profiles', async () => {
    fake.on('categories', () => ({ data: [], error: null }));
    const res = await request(app).get('/api/categories').set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(fake.queries('profiles')).toHaveLength(0);
  });
});

describe('GET /api/categories/:id/products (người mua)', () => {
  const product = (id, name, createdAt) => ({
    id,
    name,
    price: 100000,
    image_path: `${id}/flatlay-1.png`,
    created_at: createdAt,
    updated_at: createdAt,
    category: { id: CAT, name: 'Ao', slug: 'ao' },
  });

  it('404 CATEGORY_NOT_FOUND khi id không phải uuid, không gửi xuống DB', async () => {
    const res = await request(app)
      .get('/api/categories/abc/products')
      .set('Authorization', userAuth());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    expect(fake.calls).toHaveLength(0);
  });

  it('404 khi danh mục không tồn tại', async () => {
    fake.on('categories', () => ({ data: null, error: null }));
    const res = await request(app)
      .get(`/api/categories/${CAT}/products`)
      .set('Authorization', userAuth());
    expect(res.status).toBe(404);
  });

  it('200: sản phẩm cũ nhất trước (D24), chỉ { id, name, price, imageUrl }', async () => {
    fake.on('categories', () => ({ data: { id: CAT, name: 'Ao', slug: 'ao' }, error: null }));
    // DB trả created_at desc; service đảo lại thành cũ nhất trước
    fake.on('products', () => ({
      data: [product('p2', 'Moi', '2026-02-01'), product('p1', 'Cu', '2026-01-01')],
      error: null,
    }));
    const res = await request(app)
      .get(`/api/categories/${CAT}/products`)
      .set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.category).toEqual({ id: CAT, name: 'Ao', slug: 'ao' });
    expect(res.body.data.products.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(res.body.data.products[0]).toEqual({
      id: 'p1',
      name: 'Cu',
      price: 100000,
      imageUrl: 'https://signed.test/products/p1/flatlay-1.png',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/image_path|createdAt|category_id/);
  });

  it('danh mục tồn tại nhưng rỗng -> products: []', async () => {
    fake.on('categories', () => ({ data: { id: CAT, name: 'Ao', slug: 'ao' }, error: null }));
    fake.on('products', () => ({ data: [], error: null }));
    const res = await request(app)
      .get(`/api/categories/${CAT}/products`)
      .set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([]);
    expect(fake.storageApi.createSignedUrls).not.toHaveBeenCalled();
  });
});
