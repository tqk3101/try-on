import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import { USER_ID, adminAuth, userAuth } from '../helpers/auth.js';
import { pngBuffer } from '../helpers/images.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const CAT = '44444444-4444-4444-8444-444444444444';
const PID = '55555555-5555-4555-8555-555555555555';
const OLD_IMG = `${PID}/flatlay-1.png`;
const RESULT_BUCKET = 'try-on-results';

const profileRow = (over = {}) => ({
  id: USER_ID,
  email: 'a@b.co',
  role: 'user',
  display_name: null,
  phone: null,
  height_cm: null,
  weight_kg: null,
  avatar_path: null,
  try_on_consent_at: null,
  created_at: 't',
  updated_at: 't',
  ...over,
});

const prodRow = (over = {}) => ({
  id: PID,
  name: 'Áo',
  price: 1000,
  image_path: OLD_IMG,
  created_at: 't',
  updated_at: 't',
  category: { id: CAT, name: 'Áo', slug: 'ao' },
  ...over,
});

/** Thứ tự các thao tác ghi để kiểm tra "rows trước, object sau". */
let events;

beforeEach(() => {
  fake.reset();
  events = [];
  fake.storageApi.remove.mockImplementation(async (bucket, paths) => {
    events.push(`remove:${bucket}:${paths.join(',')}`);
    return { error: null };
  });
});

describe('dọn kết quả thử đồ khi thay/xoá ảnh toàn thân (US-05/06 mục dọn dữ liệu)', () => {
  const putAvatar = () =>
    request(app)
      .put('/api/user/profile/avatar')
      .set('Authorization', userAuth())
      .attach('avatar', pngBuffer(), { filename: 'a.png', contentType: 'image/png' });

  function mockProfile(avatarPath) {
    fake.on('profiles', (q) =>
      q.op === 'update'
        ? { data: profileRow({ avatar_path: q.payload.avatar_path }), error: null }
        : { data: profileRow({ avatar_path: avatarPath }), error: null },
    );
    fake.on('try_on_results', (q) => {
      events.push(`delete-rows:${q.filters.map((f) => `${f.column}=${f.value}`).join(',')}`);
      return {
        data: [
          { result_path: `${USER_ID}/${PID}/r1.png` },
          { result_path: `${USER_ID}/${PID}/r2.png` },
        ],
        error: null,
      };
    });
  }

  it('thay ảnh: xoá rows try_on_results của user TRƯỚC, rồi xoá object trong bucket try-on-results', async () => {
    mockProfile(`${USER_ID}/avatar-old.png`);
    const res = await putAvatar();
    expect(res.status).toBe(200);

    const deletes = fake.queries('try_on_results', 'delete');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].filters).toContainEqual({ type: 'eq', column: 'profile_id', value: USER_ID });

    const rowsIdx = events.findIndex((e) => e.startsWith('delete-rows'));
    const objIdx = events.findIndex((e) => e.startsWith(`remove:${RESULT_BUCKET}`));
    expect(rowsIdx).toBeGreaterThanOrEqual(0);
    expect(objIdx).toBeGreaterThan(rowsIdx);
    expect(events[objIdx]).toBe(
      `remove:${RESULT_BUCKET}:${USER_ID}/${PID}/r1.png,${USER_ID}/${PID}/r2.png`,
    );
  });

  it('xoá ảnh (có ảnh) cũng dọn; xoá khi chưa có ảnh thì không đụng try_on_results', async () => {
    mockProfile(`${USER_ID}/avatar-old.png`);
    const res = await request(app)
      .delete('/api/user/profile/avatar')
      .set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(fake.queries('try_on_results', 'delete')).toHaveLength(1);

    fake.calls.length = 0;
    mockProfile(null);
    await request(app).delete('/api/user/profile/avatar').set('Authorization', userAuth());
    expect(fake.queries('try_on_results')).toHaveLength(0);
  });

  it('dọn dữ liệu lỗi (best-effort) KHÔNG làm hỏng API avatar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockProfile(`${USER_ID}/avatar-old.png`);
    fake.on('try_on_results', () => ({ data: null, error: { code: 'XX', message: 'db down' } }));
    const res = await putAvatar();
    expect(res.status).toBe(200);
  });

  it('không có kết quả nào -> không gọi Storage remove cho bucket try-on-results', async () => {
    mockProfile(`${USER_ID}/avatar-old.png`);
    fake.on('try_on_results', () => ({ data: [], error: null }));
    await putAvatar();
    expect(events.some((e) => e.includes(RESULT_BUCKET))).toBe(false);
  });
});

describe('dọn kết quả thử đồ theo sản phẩm', () => {
  const form = (r) => r.field('name', 'Áo').field('price', '1000').field('categoryId', CAT);

  function mockProducts() {
    fake.on('profiles', () => ({ data: { role: 'admin' }, error: null }));
    fake.on('categories', () => ({ data: { id: CAT }, error: null }));
    fake.on('products', (q) => {
      if (q.op === 'update') {
        return { data: prodRow({ image_path: q.payload.image_path ?? OLD_IMG }), error: null };
      }
      if (q.op === 'delete') {
        events.push('delete-product');
        return { data: { image_path: OLD_IMG }, error: null };
      }
      return { data: { image_path: OLD_IMG }, error: null };
    });
    fake.on('try_on_results', (q) => {
      if (q.op === 'delete') {
        events.push('delete-results');
        return { data: [{ result_path: 'u/p/r1.png' }], error: null };
      }
      events.push('list-results');
      return { data: [{ result_path: 'u/p/r1.png' }, { result_path: 'u/p/r2.png' }], error: null };
    });
  }

  it('thay ảnh flat lay: xoá kết quả cũ của sản phẩm (rows + object)', async () => {
    mockProducts();
    const res = await form(
      request(app).put(`/api/admin/products/${PID}`).set('Authorization', adminAuth()),
    ).attach('image', pngBuffer(800, 800), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const [del] = fake.queries('try_on_results', 'delete');
    expect(del.filters).toContainEqual({ type: 'eq', column: 'product_id', value: PID });
    expect(events).toContain(`remove:${RESULT_BUCKET}:u/p/r1.png`);
  });

  it('chỉ sửa text (không đổi ảnh): KHÔNG xoá kết quả thử đồ', async () => {
    mockProducts();
    const res = await form(
      request(app).put(`/api/admin/products/${PID}`).set('Authorization', adminAuth()),
    );
    expect(res.status).toBe(200);
    expect(fake.queries('try_on_results')).toHaveLength(0);
  });

  it('xoá sản phẩm: lấy result_path TRƯỚC khi xoá (FK CASCADE), xoá object SAU', async () => {
    mockProducts();
    const res = await request(app)
      .delete(`/api/admin/products/${PID}`)
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);

    expect(events.indexOf('list-results')).toBeLessThan(events.indexOf('delete-product'));
    const removeResults = events.find((e) => e.startsWith(`remove:${RESULT_BUCKET}`));
    expect(removeResults).toBe(`remove:${RESULT_BUCKET}:u/p/r1.png,u/p/r2.png`);
    expect(events.indexOf(removeResults)).toBeGreaterThan(events.indexOf('delete-product'));
  });

  it('đọc danh sách kết quả lỗi vẫn xoá được sản phẩm (best-effort)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockProducts();
    fake.on('try_on_results', () => ({ data: null, error: { code: 'XX', message: 'x' } }));
    const res = await request(app)
      .delete(`/api/admin/products/${PID}`)
      .set('Authorization', adminAuth());
    expect(res.status).toBe(200);
  });
});
