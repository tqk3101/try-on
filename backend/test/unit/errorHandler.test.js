import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler, notFoundHandler } from '../../src/middlewares/errorHandler.js';
import { HttpError } from '../../src/middlewares/httpError.js';

function appThrowing(error) {
  const app = express();
  app.use(express.json());
  app.get('/boom', () => {
    throw error;
  });
  app.post('/json', (req, res) => res.json(req.body));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler / notFoundHandler (envelope lỗi)', () => {
  it('HttpError -> status + { success:false, error:{ code, message } }', async () => {
    const res = await request(appThrowing(new HttpError(409, 'EMAIL_EXISTS', 'Trùng'))).get(
      '/boom',
    );
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'Trùng' },
    });
  });

  it('HttpError có fields -> kèm fields', async () => {
    const err = new HttpError(400, 'VALIDATION_ERROR', 'Sai', { name: 'Thiếu' });
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.body.error.fields).toEqual({ name: 'Thiếu' });
  });

  it('lỗi 4xx của body-parser -> 400 BAD_REQUEST chung (không lộ chi tiết parser)', async () => {
    const res = await request(appThrowing(new Error('x')))
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Yêu cầu không hợp lệ.' },
    });
  });

  it('lỗi lạ -> 500 INTERNAL_ERROR, không lộ message/stack, có log phía server', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThrowing(new Error('db password is hunter2'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2|stack|at /);
    expect(spy).toHaveBeenCalled();
  });

  it('đường dẫn không tồn tại -> 404 NOT_FOUND', async () => {
    const res = await request(appThrowing(new Error('x'))).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('errorHandler: Retry-After', () => {
  it('HttpError có retryAfterSeconds -> header Retry-After (vd. hết hạn mức thử đồ)', async () => {
    const err = new HttpError(429, 'TRY_ON_QUOTA_EXCEEDED', 'Hết lượt');
    err.retryAfterSeconds = 4321;
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBe('4321');
    expect(res.body.error.code).toBe('TRY_ON_QUOTA_EXCEEDED');
  });

  it('HttpError thường không có Retry-After', async () => {
    const res = await request(appThrowing(new HttpError(409, 'X', 'x'))).get('/boom');
    expect(res.headers['retry-after']).toBeUndefined();
  });
});
