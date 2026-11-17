import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import { OTHER_ID, bearer, tokenFor, userAuth } from '../helpers/auth.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

// Mỗi file test có bộ nhớ limiter riêng; test ở đây chạy tuần tự và dùng chung IP nên có thứ tự cố ý.

beforeEach(() => fake.reset());

describe('loginLimiter (common_errors 2.3: chỉ tính 401)', () => {
  const hash = bcrypt.hashSync('Abcdefg1', 4);
  const loginRow = {
    id: '1',
    email: 'a@b.co',
    role: 'user',
    display_name: null,
    password_hash: hash,
  };

  it('400 (thiếu trường) và 200 không bị tính lượt; chỉ 401 bị tính, lần 11 -> 429 + Retry-After', async () => {
    fake.on('profiles', () => ({ data: loginRow, error: null }));

    // 15 lần 400: nếu bị tính sẽ vượt ngưỡng 10
    for (let i = 0; i < 15; i += 1) {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    }
    // Đăng nhập thành công không tiêu hao lượt
    for (let i = 0; i < 12; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.co', password: 'Abcdefg1' });
      expect(res.status).toBe(200);
    }

    // 10 lần sai mật khẩu vẫn trả 401
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.co', password: 'Wrong123' });
      expect(res.status).toBe(401);
    }

    // Lần 11: 429 cùng envelope, kể cả khi mật khẩu đúng
    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'Abcdefg1' });
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, error: { code: 'TOO_MANY_REQUESTS' } });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('registerLimiter', () => {
  it('10 lần / giờ / IP, lần 11 -> 429 + Retry-After', async () => {
    fake.on('profiles', () => ({ data: { id: 'x' }, error: null })); // luôn 409, vẫn tính lượt
    const body = { email: 'a@b.co', password: 'Abcdefg1', confirmPassword: 'Abcdefg1' };
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/api/auth/register').send(body);
      expect(res.status).toBe(409);
    }
    const blocked = await request(app).post('/api/auth/register').send(body);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});

describe('avatarLimiter (theo user, PUT + DELETE chung bộ đếm)', () => {
  it('20 lần / 15 phút / user, lần 21 -> 429; user khác không bị ảnh hưởng', async () => {
    fake.on('profiles', () => ({
      data: { avatar_path: null, id: 'x', email: 'a@b.co', role: 'user' },
      error: null,
    }));
    for (let i = 0; i < 20; i += 1) {
      const res = await request(app)
        .delete('/api/user/profile/avatar')
        .set('Authorization', userAuth());
      expect(res.status).toBe(200);
    }
    const blocked = await request(app)
      .delete('/api/user/profile/avatar')
      .set('Authorization', userAuth());
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeDefined();

    const other = await request(app)
      .delete('/api/user/profile/avatar')
      .set('Authorization', bearer(tokenFor(OTHER_ID)));
    expect(other.status).toBe(200);
  });
});
