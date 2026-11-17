import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { verifyToken } from '../../src/config/jwt.js';
import { fake } from '../helpers/fakeSupabase.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const ID = '11111111-1111-4111-8111-111111111111';
const PASSWORD = 'Abcdefg1';
const registerBody = { email: 'New@Example.com', password: PASSWORD, confirmPassword: PASSWORD };

// Lưu ý: limiter in-memory theo IP được chia sẻ trong cả file này (register 10/giờ, login 10 lần sai/15').
// File này dùng tối đa 8 register và 6 lần login sai. Test limiter nằm ở file riêng.

beforeEach(() => fake.reset());

describe('POST /api/auth/register', () => {
  it('201: tạo tài khoản, chuẩn hoá email, hash bcrypt, không lộ password/hash, không phát JWT', async () => {
    fake.on('profiles', (q) => {
      if (q.op === 'select') return { data: null, error: null };
      return {
        data: { id: ID, email: q.payload.email, role: 'user', display_name: null },
        error: null,
      };
    });

    const res = await request(app).post('/api/auth/register').send(registerBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: { user: { id: ID, email: 'new@example.com', role: 'user', displayName: null } },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash|token/i);

    const [insert] = fake.queries('profiles', 'insert');
    expect(insert.payload.email).toBe('new@example.com');
    expect(insert.payload.password_hash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, insert.payload.password_hash)).toBe(true);
    // Không cho client tự đặt role
    expect(insert.payload).not.toHaveProperty('role');
  });

  it('bỏ qua role=admin trong body', async () => {
    fake.on('profiles', (q) =>
      q.op === 'select'
        ? { data: null, error: null }
        : { data: { id: ID, email: 'a@b.co', role: 'user', display_name: null }, error: null },
    );
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...registerBody, role: 'admin' });
    expect(res.status).toBe(201);
    expect(fake.queries('profiles', 'insert')[0].payload).not.toHaveProperty('role');
  });

  it('409 EMAIL_EXISTS khi email đã có (không insert)', async () => {
    fake.on('profiles', () => ({ data: { id: ID }, error: null }));
    const res = await request(app).post('/api/auth/register').send(registerBody);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'Email này đã được đăng ký.' },
    });
    expect(fake.queries('profiles', 'insert')).toHaveLength(0);
  });

  it('409 EMAIL_EXISTS khi race: INSERT dính unique violation 23505', async () => {
    fake.on('profiles', (q) =>
      q.op === 'select'
        ? { data: null, error: null }
        : { data: null, error: { code: '23505', message: 'dup' } },
    );
    const res = await request(app).post('/api/auth/register').send(registerBody);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('400 VALIDATION_ERROR kèm fields, không chạm DB', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x', password: 'weak', confirmPassword: 'other' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'confirmPassword',
      'email',
      'password',
    ]);
    expect(fake.calls).toHaveLength(0);
  });

  it('400 BAD_REQUEST khi JSON sai cú pháp (envelope chung)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'BAD_REQUEST' } });
  });

  it('500 INTERNAL_ERROR khi DB lỗi: không lộ chi tiết nội bộ', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.on('profiles', () => ({
      data: null,
      error: { code: 'XX000', message: 'secret db detail' },
    }));
    const res = await request(app).post('/api/auth/register').send(registerBody);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/secret db detail|XX000|stack/);
  });
});

describe('POST /api/auth/login', () => {
  const row = (role = 'user') => ({
    id: ID,
    email: 'user@example.com',
    role,
    display_name: 'Lan',
    password_hash: bcrypt.hashSync(PASSWORD, 4),
  });

  it('200: trả token JWT (sub, role) và user, không có password_hash', async () => {
    fake.on('profiles', () => ({ data: row('admin'), error: null }));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ' User@Example.com ', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toEqual({
      id: ID,
      email: 'user@example.com',
      role: 'admin',
      displayName: 'Lan',
    });
    const payload = verifyToken(res.body.data.token);
    expect(payload).toMatchObject({ sub: ID, role: 'admin' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    // email được chuẩn hoá trước khi truy vấn
    expect(fake.queries('profiles')[0].filters).toContainEqual({
      type: 'eq',
      column: 'email',
      value: 'user@example.com',
    });
  });

  it('401 INVALID_CREDENTIALS khi sai mật khẩu', async () => {
    fake.on('profiles', () => ({ data: row(), error: null }));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Wrong123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('401 cùng thông điệp khi email không tồn tại (không lộ email nào đã đăng ký)', async () => {
    fake.on('profiles', () => ({ data: row(), error: null }));
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Wrong123' });
    fake.on('profiles', () => ({ data: null, error: null }));
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD });
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('401 khi mật khẩu > 72 byte dù khớp tiền tố 72 byte', async () => {
    const long = `${PASSWORD}${'x'.repeat(80)}`;
    fake.on('profiles', () => ({
      data: { ...row(), password_hash: bcrypt.hashSync(long, 4) },
      error: null,
    }));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: long });
    expect(res.status).toBe(401);
  });

  it('400 khi thiếu trường (không chạm DB)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(fake.calls).toHaveLength(0);
  });
});
