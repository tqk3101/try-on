import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  setUnauthorizedHandler,
  tokenStorage,
} from '../../src/services/apiClient.js';

function mockFetch(status, body) {
  const fetchMock = vi.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (body === undefined) throw new Error('no json');
      return body;
    },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => tokenStorage.clear());
afterEach(() => setUnauthorizedHandler(null));

describe('apiClient', () => {
  it('gắn base URL, Accept và JWT; trả về data', async () => {
    tokenStorage.set('tok');
    const fetchMock = mockFetch(200, { success: true, data: { profile: { id: '1' } } });

    const data = await apiClient.get('/user/profile');

    expect(data).toEqual({ profile: { id: '1' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/user/profile');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers.Accept).toBe('application/json');
  });

  it('POST JSON: Content-Type + body stringified; FormData thì không đặt Content-Type', async () => {
    const fetchMock = mockFetch(200, { success: true, data: {} });
    await apiClient.post('/x', { a: 1 }, { auth: false });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}');

    const form = new FormData();
    await apiClient.put('/y', form);
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].body).toBe(form);
  });

  it('auth:false không gửi token cũ (login/register)', async () => {
    tokenStorage.set('old');
    const fetchMock = mockFetch(200, { success: true, data: {} });
    await apiClient.post('/auth/login', {}, { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('lỗi API -> ApiError với status, code, message, fields', async () => {
    mockFetch(400, {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Sai', fields: { name: 'Thiếu' } },
    });
    const error = await apiClient.post('/x', {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Sai',
      fields: { name: 'Thiếu' },
    });
  });

  it('response không phải JSON -> UNKNOWN_ERROR với thông điệp thân thiện', async () => {
    mockFetch(502, undefined);
    const error = await apiClient.get('/x').catch((e) => e);
    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN_ERROR' });
    expect(error.message).toMatch(/Vui lòng thử lại/);
  });

  it('lỗi mạng -> NETWORK_ERROR (status 0); AbortError được ném lại nguyên vẹn', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')));
    expect(await apiClient.get('/x').catch((e) => e)).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });

    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    expect(await apiClient.get('/x').catch((e) => e)).toBe(abort);
  });

  it('401 khi ĐÃ gửi token: xoá token và gọi unauthorizedHandler với code (common_errors 3.4)', async () => {
    tokenStorage.set('tok');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Hết hạn' } });

    await expect(apiClient.get('/user/profile')).rejects.toMatchObject({ status: 401 });
    expect(tokenStorage.get()).toBeNull();
    expect(handler).toHaveBeenCalledWith({ code: 'TOKEN_EXPIRED' });
  });

  it('401 INVALID_CREDENTIALS của login (không gửi token): KHÔNG kích hoạt luồng hết hạn', async () => {
    tokenStorage.set('old');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Sai' } });

    await expect(apiClient.post('/auth/login', {}, { auth: false })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(handler).not.toHaveBeenCalled();
    expect(tokenStorage.get()).toBe('old');
  });

  it('payload success:false dù HTTP 200 vẫn là lỗi', async () => {
    mockFetch(200, { success: false, error: { code: 'X', message: 'm' } });
    await expect(apiClient.get('/x')).rejects.toMatchObject({ code: 'X' });
  });

  it('tokenStorage không ném khi localStorage hỏng', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(tokenStorage.get()).toBeNull();
  });
});
