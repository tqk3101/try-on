import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { fake } from '../helpers/fakeSupabase.js';

vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

beforeEach(() => fake.reset());

describe('app', () => {
  it('GET /api/health 200 khi Supabase (giả) phản hồi', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', supabase: 'up' } });
  });

  it('GET /api/health 503 SERVICE_UNAVAILABLE khi Supabase lỗi', async () => {
    fake.auth.admin.listUsers.mockResolvedValue({ data: null, error: { message: 'down' } });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('/api/* không tồn tại -> 404 NOT_FOUND envelope chung', async () => {
    const res = await request(app).get('/api/khong-co');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('không lộ header x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CORS chỉ cho origin của frontend (CLIENT_URL)', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const other = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(other.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(other.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });
});
