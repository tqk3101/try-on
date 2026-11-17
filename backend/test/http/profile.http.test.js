import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';
import { OTHER_ID, USER_ID, bearer, tokenFor, userAuth } from '../helpers/auth.js';
import { jpegBuffer, pngBuffer } from '../helpers/images.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const row = (over = {}) => ({
  id: USER_ID,
  email: 'user@example.com',
  role: 'user',
  display_name: 'Lan',
  phone: '0912345678',
  height_cm: '165.0',
  weight_kg: '52.5',
  avatar_path: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  ...over,
});

beforeEach(() => fake.reset());

describe('requireAuth (qua GET /api/user/profile)', () => {
  it('401 AUTH_REQUIRED khi thiếu header hoặc sai scheme', async () => {
    for (const header of [undefined, 'Basic abc', 'Bearer', 'Bearer a b']) {
      const req = request(app).get('/api/user/profile');
      if (header) req.set('Authorization', header);
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('401 TOKEN_EXPIRED khi token hết hạn', async () => {
    const expired = jwt.sign({ sub: USER_ID, role: 'user' }, process.env.JWT_SECRET, {
      expiresIn: -10,
    });
    const res = await request(app).get('/api/user/profile').set('Authorization', bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('401 INVALID_TOKEN: chữ ký sai, alg none, sub không phải uuid, role lạ', async () => {
    const bad = [
      jwt.sign({ sub: USER_ID, role: 'user' }, 'wrong-secret'),
      `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
        JSON.stringify({ sub: USER_ID, role: 'admin' }),
      ).toString('base64url')}.`,
      jwt.sign({ sub: 'not-a-uuid', role: 'user' }, process.env.JWT_SECRET),
      jwt.sign({ sub: USER_ID, role: 'superuser' }, process.env.JWT_SECRET),
      'garbage',
    ];
    for (const token of bad) {
      const res = await request(app).get('/api/user/profile').set('Authorization', bearer(token));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    }
    expect(fake.calls).toHaveLength(0);
  });
});

describe('GET /api/user/profile', () => {
  it('200: map snake_case -> camelCase, số đo là number, ký signed URL, không lộ avatar_path/hash', async () => {
    fake.on('profiles', () => ({
      data: row({ avatar_path: `${USER_ID}/avatar-1.png`, password_hash: 'leak' }),
      error: null,
    }));
    const res = await request(app).get('/api/user/profile').set('Authorization', userAuth());

    expect(res.status).toBe(200);
    const { profile } = res.body.data;
    expect(profile).toMatchObject({
      id: USER_ID,
      email: 'user@example.com',
      displayName: 'Lan',
      heightCm: 165,
      weightKg: 52.5,
      avatarUrl: `https://signed.test/avatars/${USER_ID}/avatar-1.png`,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/avatar_path|avatarPath|password|leak/);
    // chỉ select cột tường minh, không select *
    expect(fake.queries('profiles')[0].columns).not.toMatch(/password_hash|\*/);
  });

  it('avatarUrl = null khi chưa có ảnh', async () => {
    fake.on('profiles', () => ({ data: row(), error: null }));
    const res = await request(app).get('/api/user/profile').set('Authorization', userAuth());
    expect(res.body.data.profile.avatarUrl).toBeNull();
  });

  it('401 INVALID_TOKEN khi user không còn tồn tại', async () => {
    fake.on('profiles', () => ({ data: null, error: null }));
    const res = await request(app).get('/api/user/profile').set('Authorization', userAuth());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('chỉ truy vấn theo id trong token (không cho xem profile người khác)', async () => {
    fake.on('profiles', () => ({ data: row({ id: OTHER_ID }), error: null }));
    await request(app)
      .get('/api/user/profile')
      .set('Authorization', bearer(tokenFor(OTHER_ID)));
    expect(fake.queries('profiles')[0].filters).toContainEqual({
      type: 'eq',
      column: 'id',
      value: OTHER_ID,
    });
  });
});

describe('PUT /api/user/profile', () => {
  const body = { displayName: ' Lan ', phone: '+84 912 345 678', heightCm: 165, weightKg: 52.46 };

  it('200: lưu dữ liệu đã chuẩn hoá; bỏ qua role/email trong body', async () => {
    fake.on('profiles', () => ({ data: row({ weight_kg: '52.5' }), error: null }));
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', userAuth())
      .send({ ...body, role: 'admin', email: 'evil@x.co' });

    expect(res.status).toBe(200);
    const [update] = fake.queries('profiles', 'update');
    expect(update.payload).toEqual({
      display_name: 'Lan',
      phone: '0912345678',
      height_cm: 165,
      weight_kg: 52.5,
    });
  });

  it('400 VALIDATION_ERROR kèm fields, không ghi DB', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', userAuth())
      .send({ heightCm: 50, weightKg: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('heightCm');
    expect(res.body.error.fields).toHaveProperty('weightKg');
    expect(fake.calls).toHaveLength(0);
  });

  it('401 khi không đăng nhập', async () => {
    const res = await request(app).put('/api/user/profile').send(body);
    expect(res.status).toBe(401);
  });

  it('401 INVALID_TOKEN khi UPDATE không có dòng nào', async () => {
    fake.on('profiles', () => ({ data: null, error: null }));
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', userAuth())
      .send(body);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/user/profile/avatar', () => {
  const put = () => request(app).put('/api/user/profile/avatar').set('Authorization', userAuth());
  const OLD = `${USER_ID}/avatar-old.png`;

  function profilesOk(oldPath = null) {
    fake.on('profiles', (q) => {
      if (q.op === 'update')
        return { data: row({ avatar_path: q.payload.avatar_path }), error: null };
      return { data: { avatar_path: oldPath }, error: null };
    });
  }

  it('401 trước khi parse file (không nhận file của request chưa xác thực)', async () => {
    const res = await request(app)
      .put('/api/user/profile/avatar')
      .attach('avatar', pngBuffer(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('400 INVALID_UPLOAD khi không phải multipart', async () => {
    const res = await put().send({ avatar: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_UPLOAD');
  });

  it('400 AVATAR_REQUIRED khi multipart nhưng không có file', async () => {
    const res = await put().field('note', 'hi');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AVATAR_REQUIRED');
  });

  it('400 INVALID_UPLOAD khi sai tên field (LIMIT_UNEXPECTED_FILE), không lộ tên field', async () => {
    const res = await put().attach('photo', pngBuffer(), {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_UPLOAD');
    expect(JSON.stringify(res.body)).not.toContain('photo');
  });

  it('413 FILE_TOO_LARGE khi vượt 5MB', async () => {
    const big = Buffer.concat([pngBuffer(), Buffer.alloc(5 * 1024 * 1024 + 1)]);
    const res = await put().attach('avatar', big, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('415 khi nội dung không phải JPG/PNG dù mimetype/đuôi file giả', async () => {
    const res = await put().attach('avatar', Buffer.from('<html>not an image</html>'), {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(fake.storageApi.upload).not.toHaveBeenCalled();
  });

  it('200: upload tên do server tạo, cập nhật DB, xoá ảnh cũ', async () => {
    profilesOk(OLD);
    const res = await put().attach('avatar', jpegBuffer(), {
      filename: '../../evil.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(200);

    const [bucket, path, , options] = fake.storageApi.upload.mock.calls[0];
    expect(bucket).toBe('avatars');
    expect(path).toMatch(new RegExp(`^${USER_ID}/avatar-\\d+\\.jpg$`));
    expect(options).toMatchObject({ contentType: 'image/jpeg', upsert: false });
    expect(res.body.data.profile.avatarUrl).toContain(path);
    expect(fake.storageApi.remove).toHaveBeenCalledWith('avatars', [OLD]);
  });

  it('DB lỗi sau khi upload -> xoá object vừa upload (không mồ côi), ảnh cũ giữ nguyên', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.on('profiles', (q) =>
      q.op === 'update'
        ? { data: null, error: { code: 'XX000', message: 'boom' } }
        : { data: { avatar_path: OLD }, error: null },
    );
    const res = await put().attach('avatar', pngBuffer(), {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(500);
    const uploadedPath = fake.storageApi.upload.mock.calls[0][1];
    expect(fake.storageApi.remove).toHaveBeenCalledTimes(1);
    expect(fake.storageApi.remove).toHaveBeenCalledWith('avatars', [uploadedPath]);
  });

  it('502 UPLOAD_FAILED khi Storage lỗi, không lộ chi tiết', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    profilesOk(null);
    fake.storageApi.upload.mockResolvedValue({ error: { message: 'bucket secret detail' } });
    const res = await put().attach('avatar', pngBuffer(), {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPLOAD_FAILED');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});

describe('DELETE /api/user/profile/avatar', () => {
  const del = () =>
    request(app).delete('/api/user/profile/avatar').set('Authorization', userAuth());

  it('idempotent: chưa có ảnh -> 200 và không gọi Storage', async () => {
    fake.on('profiles', () => ({ data: { avatar_path: null, ...row() }, error: null }));
    const res = await del();
    expect(res.status).toBe(200);
    expect(fake.storageApi.remove).not.toHaveBeenCalled();
    expect(fake.queries('profiles', 'update')).toHaveLength(0);
  });

  it('có ảnh: cập nhật DB về null trước, rồi xoá object', async () => {
    const path = `${USER_ID}/avatar-1.png`;
    const order = [];
    fake.on('profiles', (q) => {
      if (q.op === 'update') {
        order.push('db');
        return { data: row({ avatar_path: null }), error: null };
      }
      return { data: { avatar_path: path }, error: null };
    });
    fake.storageApi.remove.mockImplementation(async () => {
      order.push('storage');
      return { error: null };
    });
    const res = await del();
    expect(res.status).toBe(200);
    expect(res.body.data.profile.avatarUrl).toBeNull();
    expect(order).toEqual(['db', 'storage']);
    expect(fake.queries('profiles', 'update')[0].payload).toEqual({ avatar_path: null });
  });
});
