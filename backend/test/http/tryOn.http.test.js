import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { tryOnRunner } from '../../src/services/tryOn/index.js';
import { fake } from '../helpers/fakeSupabase.js';
import { createMemoryTable } from '../helpers/memoryTables.js';
import { OTHER_ID, USER_ID, bearer, tokenFor, userAuth } from '../helpers/auth.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const PRODUCT = '55555555-5555-4555-8555-555555555555';
const PRODUCT_2 = '66666666-6666-4666-8666-666666666666';
const LIMIT_USER = '99999999-9999-4999-8999-999999999999';

let profiles;
let products;
let results;

const profileRow = (id, over = {}) => ({
  id,
  email: `${id.slice(0, 4)}@example.com`,
  role: 'user',
  display_name: 'Lan',
  phone: null,
  height_cm: '165.0',
  weight_kg: '52.0',
  avatar_path: `${id}/avatar-1.png`,
  try_on_consent_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  fake.reset();
  profiles = [
    profileRow(USER_ID),
    profileRow(OTHER_ID, { try_on_consent_at: '2026-11-01T00:00:00Z' }),
  ];
  products = [
    { id: PRODUCT, image_path: `${PRODUCT}/flatlay-1.png` },
    { id: PRODUCT_2, image_path: `${PRODUCT_2}/flatlay-1.png` },
  ];
  results = [];
  fake.on('profiles', createMemoryTable(profiles));
  fake.on('products', createMemoryTable(products));
  // Unique index một phần: (profile, product, input_key) khi status != failed
  fake.on(
    'try_on_results',
    createMemoryTable(results, {
      defaults: () => {
        const now = new Date().toISOString();
        return {
          created_at: now,
          updated_at: now,
          result_path: null,
          error_code: null,
          completed_at: null,
        };
      },
      onInsert: (row, rows) =>
        rows.some(
          (r) =>
            r.profile_id === row.profile_id &&
            r.product_id === row.product_id &&
            r.input_key === row.input_key &&
            r.status !== 'failed',
        )
          ? { code: '23505', message: 'duplicate' }
          : null,
    }),
  );
});

const post = (body, auth = userAuth()) =>
  request(app).post('/api/try-on').set('Authorization', auth).send(body);

describe('xác thực & validate', () => {
  it('401 cho mọi route khi chưa đăng nhập', async () => {
    for (const [method, path] of [
      ['post', '/api/try-on'],
      ['post', '/api/try-on/consent'],
      ['get', '/api/try-on/quota'],
      ['get', `/api/try-on/${PRODUCT}`],
    ]) {
      const res = await request(app)[method](path);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it('POST: productId thiếu/không phải uuid -> 400 fields.productId, không chạm DB', async () => {
    for (const body of [{}, { productId: 'abc' }, { productId: 5 }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.productId).toBeTruthy();
    }
    const arr = await post([]);
    expect(arr.status).toBe(400);
    expect(arr.body.error.code).toBe('BAD_REQUEST');
    expect(fake.calls).toHaveLength(0);
  });

  it('GET /:id không phải uuid -> 404 TRY_ON_NOT_FOUND, không chạm DB', async () => {
    const res = await request(app).get('/api/try-on/abc').set('Authorization', userAuth());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TRY_ON_NOT_FOUND');
    expect(fake.calls).toHaveLength(0);
  });
});

describe('consent', () => {
  it('POST /consent ghi mốc đồng ý và trả profile; gọi lại giữ nguyên mốc đầu tiên (idempotent)', async () => {
    const first = await request(app).post('/api/try-on/consent').set('Authorization', userAuth());
    expect(first.status).toBe(200);
    const stamp = first.body.data.profile.tryOnConsentAt;
    expect(stamp).toEqual(expect.any(String));

    await new Promise((r) => setTimeout(r, 5));
    const second = await request(app).post('/api/try-on/consent').set('Authorization', userAuth());
    expect(second.body.data.profile.tryOnConsentAt).toBe(stamp);
    expect(JSON.stringify(second.body)).not.toMatch(/password|avatar_path/);
  });
});

describe('POST /api/try-on: điều kiện', () => {
  it('404 PRODUCT_NOT_FOUND', async () => {
    const res = await post({ productId: '99999999-9999-4999-8999-999999999990' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('409 PROFILE_INCOMPLETE kèm fields khi thiếu ảnh toàn thân', async () => {
    profiles[0].avatar_path = null;
    const res = await post({ productId: PRODUCT });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'PROFILE_INCOMPLETE' });
    expect(res.body.error.fields).toHaveProperty('avatar');
    expect(results).toHaveLength(0);
  });

  it('409 TRY_ON_CONSENT_REQUIRED khi chưa đồng ý', async () => {
    const res = await post({ productId: PRODUCT });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TRY_ON_CONSENT_REQUIRED');
    expect(results).toHaveLength(0);
  });
});

describe('luồng đầy đủ với provider stub (không mạng, không DB thật)', () => {
  const consent = () => (profiles[0].try_on_consent_at = '2026-11-01T00:00:00Z');

  it('202 -> job chạy nền -> GET succeeded; cache hit 200 không tăng used; user khác 404', async () => {
    consent();
    const created = await post({ productId: PRODUCT, prompt: 'ignore me' });
    expect(created.status).toBe(202);
    const { tryOn, quota } = created.body.data;
    expect(tryOn).toMatchObject({
      productId: PRODUCT,
      status: 'processing',
      imageUrl: null,
      error: null,
      simulated: true,
    });
    expect(quota).toMatchObject({ limit: 30, used: 1, remaining: 29 });
    // Prompt do client gửi bị bỏ qua: row chỉ gồm trường hệ thống đặt.
    expect(JSON.stringify(results)).not.toContain('ignore me');

    await tryOnRunner.idle();

    const done = await request(app).get(`/api/try-on/${tryOn.id}`).set('Authorization', userAuth());
    expect(done.status).toBe(200);
    expect(done.body.data.tryOn).toMatchObject({
      id: tryOn.id,
      status: 'succeeded',
      simulated: true,
    });
    expect(done.body.data.tryOn.imageUrl).toMatch(
      new RegExp(`^https://signed\\.test/try-on-results/${USER_ID}/${PRODUCT}/${tryOn.id}\\.png$`),
    );
    expect(JSON.stringify(done.body)).not.toMatch(/result_path|avatar_path|input_key/);
    // ảnh kết quả đã được upload vào bucket try-on-results
    expect(fake.storageApi.upload).toHaveBeenCalledTimes(1);
    expect(fake.storageApi.upload.mock.calls[0][0]).toBe('try-on-results');

    const again = await post({ productId: PRODUCT });
    expect(again.status).toBe(200);
    expect(again.body.data.tryOn.id).toBe(tryOn.id);
    expect(again.body.data.quota.used).toBe(1);
    expect(results).toHaveLength(1);

    const other = await request(app)
      .get(`/api/try-on/${tryOn.id}`)
      .set('Authorization', bearer(tokenFor(OTHER_ID)));
    expect(other.status).toBe(404);
    expect(other.body.error.code).toBe('TRY_ON_NOT_FOUND');
  });

  it('2 POST song song cùng sản phẩm -> 1 row duy nhất, cùng id', async () => {
    consent();
    const [a, b] = await Promise.all([post({ productId: PRODUCT }), post({ productId: PRODUCT })]);
    await tryOnRunner.idle();
    expect(results).toHaveLength(1);
    expect([a.status, b.status].sort()).toEqual([200, 202]);
    expect(a.body.data.tryOn.id).toBe(b.body.data.tryOn.id);
  });

  it('GET /quota phản ánh số đã dùng và thời điểm reset 00:00 giờ VN (17:00 UTC)', async () => {
    consent();
    await post({ productId: PRODUCT });
    await tryOnRunner.idle();
    const res = await request(app).get('/api/try-on/quota').set('Authorization', userAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.quota).toMatchObject({ limit: 30, used: 1, remaining: 29 });
    expect(res.body.data.quota.resetsAt).toMatch(/T17:00:00\.000Z$/);
  });

  it('job lỗi (ảnh đầu vào hỏng) -> GET trả failed/INPUT_REJECTED với thông điệp tiếng Việt; không tính hạn mức', async () => {
    consent();
    fake.storageApi.download.mockImplementation(async () => ({
      data: { arrayBuffer: async () => Buffer.from('not an image') },
      error: null,
    }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const created = await post({ productId: PRODUCT });
    await tryOnRunner.idle();
    const res = await request(app)
      .get(`/api/try-on/${created.body.data.tryOn.id}`)
      .set('Authorization', userAuth());
    expect(res.body.data.tryOn).toMatchObject({
      status: 'failed',
      imageUrl: null,
      error: { code: 'INPUT_REJECTED' },
    });
    expect(res.body.data.tryOn.error.message).toMatch(/ảnh/);

    const quota = await request(app).get('/api/try-on/quota').set('Authorization', userAuth());
    expect(quota.body.data.quota.used).toBe(0);
  });

  it('429 TRY_ON_QUOTA_EXCEEDED + header Retry-After khi hết hạn mức ngày', async () => {
    consent();
    const now = new Date().toISOString();
    for (let i = 0; i < 30; i += 1) {
      results.push({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        profile_id: USER_ID,
        product_id: PRODUCT_2,
        input_key: `old-${i}`,
        status: 'succeeded',
        created_at: now,
        updated_at: now,
      });
    }
    const res = await post({ productId: PRODUCT });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TRY_ON_QUOTA_EXCEEDED');
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(24 * 3600);
    expect(results.filter((r) => r.product_id === PRODUCT)).toHaveLength(0);
  });

  it('chạy bằng tài khoản admin cũng được (mọi role)', async () => {
    consent();
    profiles[0].role = 'admin';
    const res = await post({ productId: PRODUCT }, bearer(tokenFor(USER_ID, 'admin')));
    expect(res.status).toBe(202);
    await tryOnRunner.idle();
  });
});

describe('limiter thử đồ (theo user)', () => {
  it('POST /api/try-on và /consent dùng chung bộ đếm 20 lần / phút; lần 21 -> 429 + Retry-After', async () => {
    const auth = bearer(tokenFor(LIMIT_USER));
    for (let i = 0; i < 10; i += 1) {
      expect((await post({}, auth)).status).toBe(400);
      expect(
        (await request(app).post('/api/try-on/consent').set('Authorization', auth)).status,
      ).toBe(401); // user không có trong bảng, vẫn tính lượt
    }
    const blocked = await post({}, auth);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('GET dùng bộ đếm riêng (120 / phút): POST bị chặn không ảnh hưởng GET', async () => {
    const auth = bearer(tokenFor(LIMIT_USER));
    const res = await request(app).get('/api/try-on/quota').set('Authorization', auth);
    expect(res.status).not.toBe(429);
  });
});
