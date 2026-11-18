import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCategoryProducts,
  getQuota,
  getTryOn,
  requestTryOn,
} from '../../src/features/tryOn/tryOnApi.js';
import {
  DEBOUNCE_MS,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  useTryOnRoom,
} from '../../src/features/tryOn/useTryOnRoom.js';
import { ApiError } from '../../src/services/apiClient.js';

vi.mock('../../src/features/tryOn/tryOnApi.js', () => ({
  fetchCategoryProducts: vi.fn(),
  getQuota: vi.fn(),
  getTryOn: vi.fn(),
  requestTryOn: vi.fn(),
}));

const PRODUCTS = ['p1', 'p2', 'p3', 'p4'].map((id) => ({
  id,
  name: `Sản phẩm ${id}`,
  price: 100000,
  imageUrl: `https://img.test/${id}.png`,
}));
const QUOTA = { limit: 30, used: 1, remaining: 29, resetsAt: '2026-11-19T17:00:00.000Z' };

const tryOn = (productId, status, extra = {}) => ({
  id: `t-${productId}`,
  productId,
  status,
  imageUrl: status === 'succeeded' ? `https://result.test/${productId}.jpg` : null,
  error: null,
  simulated: true,
  createdAt: '2026-11-18T00:00:00.000Z',
  completedAt: null,
  ...extra,
});

const wrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/try-on/c1']}>{children}</MemoryRouter>
);

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function mountRoom(options = {}) {
  const view = renderHook(() => useTryOnRoom({ categoryId: 'c1', ...options }), { wrapper });
  await advance(0);
  return view;
}

const postedIds = () => requestTryOn.mock.calls.map(([id]) => id);
const polledIds = () => getTryOn.mock.calls.map(([id]) => id);

beforeEach(() => {
  vi.useFakeTimers();
  fetchCategoryProducts.mockResolvedValue({
    category: { id: 'c1', name: 'Áo', slug: 'ao' },
    products: PRODUCTS,
  });
  getQuota.mockResolvedValue({ quota: QUOTA });
  requestTryOn.mockImplementation(async (id) => ({
    tryOn: tryOn(id, 'processing'),
    quota: QUOTA,
  }));
  getTryOn.mockImplementation(async (id) => ({
    tryOn: tryOn(id.replace('t-', ''), 'processing'),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('useTryOnRoom: debounce và không prefetch', () => {
  it('chỉ POST sau khi dừng >= 400 ms, chỉ cho sản phẩm đang xem', async () => {
    const { result } = await mountRoom();
    expect(result.current.current.id).toBe('p1');
    await advance(DEBOUNCE_MS - 1);
    expect(requestTryOn).not.toHaveBeenCalled();
    await advance(1);
    expect(postedIds()).toEqual(['p1']);
    await advance(10_000);
    expect(postedIds()).toEqual(['p1']);
  });

  it('lướt nhanh qua nhiều sản phẩm: chỉ POST cho sản phẩm cuối cùng', async () => {
    const { result } = await mountRoom();
    await advance(100);
    act(() => result.current.goNext());
    await advance(100);
    act(() => result.current.goNext());
    await advance(100);
    expect(result.current.current.id).toBe('p3');
    expect(requestTryOn).not.toHaveBeenCalled();
    await advance(DEBOUNCE_MS);
    expect(postedIds()).toEqual(['p3']);
  });

  it('cuối danh sách không đi tiếp; lùi lại được', async () => {
    const { result } = await mountRoom();
    act(() => result.current.goPrev());
    expect(result.current.index).toBe(0);
    act(() => result.current.goTo(3));
    act(() => result.current.goNext());
    expect(result.current.current.id).toBe('p4');
    act(() => result.current.goPrev());
    expect(result.current.current.id).toBe('p3');
  });

  it('quay lại sản phẩm đã có kết quả: hiện ngay, không POST lại', async () => {
    requestTryOn.mockImplementation(async (id) => ({
      tryOn: tryOn(id, 'succeeded'),
      quota: QUOTA,
    }));
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(result.current.entry.kind).toBe('succeeded');
    act(() => result.current.goNext());
    await advance(DEBOUNCE_MS);
    act(() => result.current.goPrev());
    expect(result.current.entry.kind).toBe('succeeded');
    await advance(5000);
    expect(postedIds()).toEqual(['p1', 'p2']);
  });
});

describe('useTryOnRoom: polling', () => {
  it('poll mỗi 2 s tới khi succeeded rồi dừng', async () => {
    let calls = 0;
    getTryOn.mockImplementation(async () => {
      calls += 1;
      return { tryOn: tryOn('p1', calls >= 3 ? 'succeeded' : 'processing') };
    });
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(getTryOn).toHaveBeenCalledTimes(1);
    await advance(POLL_INTERVAL_MS - 1);
    expect(getTryOn).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(getTryOn).toHaveBeenCalledTimes(2);
    await advance(POLL_INTERVAL_MS);
    expect(getTryOn).toHaveBeenCalledTimes(3);
    expect(result.current.entry.kind).toBe('succeeded');
    expect(result.current.entry.tryOn.imageUrl).toContain('result.test');
    await advance(10_000);
    expect(getTryOn).toHaveBeenCalledTimes(3);
  });

  it('POST trả succeeded ngay (cache hit): không poll, nhận quota đi kèm', async () => {
    requestTryOn.mockResolvedValue({ tryOn: tryOn('p1', 'succeeded'), quota: QUOTA });
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS + 10_000);
    expect(getTryOn).not.toHaveBeenCalled();
    expect(result.current.entry.kind).toBe('succeeded');
    expect(result.current.quota).toEqual(QUOTA);
  });

  it('job kết thúc failed -> badge lấy lại số lượt từ GET /quota (job lỗi không tính)', async () => {
    const afterPost = { ...QUOTA, used: 1, remaining: 5 };
    const afterFail = { ...QUOTA, used: 0, remaining: 6 };
    requestTryOn.mockResolvedValue({ tryOn: tryOn('p1', 'processing'), quota: afterPost });
    getTryOn.mockResolvedValue({
      tryOn: tryOn('p1', 'failed', { error: { code: 'GENERATION_FAILED', message: 'Lỗi' } }),
    });
    const { result } = await mountRoom();
    getQuota.mockClear();
    getQuota.mockResolvedValue({ quota: afterFail });
    await advance(DEBOUNCE_MS);
    expect(result.current.entry.kind).toBe('failed');
    expect(getQuota).toHaveBeenCalledTimes(1);
    expect(result.current.quota.remaining).toBe(6);
  });

  it('dừng sau 120 s: failed GENERATION_TIMEOUT, không poll thêm', async () => {
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    await advance(POLL_TIMEOUT_MS + POLL_INTERVAL_MS);
    expect(result.current.entry.kind).toBe('failed');
    expect(result.current.entry.error.code).toBe('GENERATION_TIMEOUT');
    const total = getTryOn.mock.calls.length;
    expect(total).toBeGreaterThan(50);
    expect(total).toBeLessThanOrEqual(POLL_TIMEOUT_MS / POLL_INTERVAL_MS + 2);
    await advance(30_000);
    expect(getTryOn).toHaveBeenCalledTimes(total);
  });

  it('chỉ poll sản phẩm đang xem; rời thì dừng, quay lại thì GET ngay', async () => {
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(new Set(polledIds())).toEqual(new Set(['t-p1']));
    act(() => result.current.goNext());
    await advance(1);
    getTryOn.mockClear();
    // p1 không còn được poll trong lúc p2 chờ debounce.
    await advance(DEBOUNCE_MS - 2);
    expect(getTryOn).not.toHaveBeenCalled();
    await advance(10_000);
    expect(postedIds()).toEqual(['p1', 'p2']);
    expect(new Set(polledIds())).toEqual(new Set(['t-p2']));
    getTryOn.mockClear();
    act(() => result.current.goPrev());
    await advance(0);
    expect(polledIds()).toEqual(['t-p1']);
  });

  it('huỷ request đang bay khi unmount', async () => {
    const signals = [];
    getTryOn.mockImplementation(
      (id, { signal }) =>
        new Promise((resolve, reject) => {
          signals.push(signal);
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const { unmount } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(signals).toHaveLength(1);
    unmount();
    expect(signals[0].aborted).toBe(true);
    await advance(10_000);
    expect(getTryOn).toHaveBeenCalledTimes(1);
  });

  it('lỗi mạng tạm thời: poll tiếp và vẫn thành công', async () => {
    let calls = 0;
    getTryOn.mockImplementation(async () => {
      calls += 1;
      if (calls <= 2) throw new ApiError(0, 'NETWORK_ERROR', 'mạng');
      return { tryOn: tryOn('p1', 'succeeded') };
    });
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    await advance(2 * POLL_INTERVAL_MS + 10);
    expect(result.current.entry.kind).toBe('succeeded');
  });

  it('GET 404 -> failed, không poll tiếp', async () => {
    getTryOn.mockRejectedValue(new ApiError(404, 'TRY_ON_NOT_FOUND', 'x'));
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(result.current.entry.kind).toBe('failed');
    await advance(10_000);
    expect(getTryOn).toHaveBeenCalledTimes(1);
  });

  it('job failed từ server -> khối lỗi đúng error.code; Thử lại = POST lại', async () => {
    getTryOn.mockResolvedValue({
      tryOn: tryOn('p1', 'failed', {
        error: { code: 'GENERATION_FAILED', message: 'Chưa tạo được ảnh' },
      }),
    });
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(result.current.entry).toMatchObject({
      kind: 'failed',
      error: { code: 'GENERATION_FAILED' },
    });
    getTryOn.mockResolvedValue({ tryOn: tryOn('p1', 'succeeded') });
    await act(async () => {
      result.current.retry();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(postedIds()).toEqual(['p1', 'p1']);
    await advance(10);
    expect(result.current.entry.kind).toBe('succeeded');
  });
});

describe('useTryOnRoom: lỗi theo error.code của POST', () => {
  it('409 PROFILE_INCOMPLETE -> onProfileIncomplete(fields), không có entry', async () => {
    const onProfileIncomplete = vi.fn();
    requestTryOn.mockRejectedValue(
      new ApiError(409, 'PROFILE_INCOMPLETE', 'x', { avatar: 'Thiếu ảnh' }),
    );
    const { result } = await mountRoom({ onProfileIncomplete });
    await advance(DEBOUNCE_MS);
    expect(onProfileIncomplete).toHaveBeenCalledWith({ avatar: 'Thiếu ảnh' });
    expect(result.current.entry).toBeUndefined();
  });

  it('409 TRY_ON_CONSENT_REQUIRED -> onConsentRequired', async () => {
    const onConsentRequired = vi.fn();
    requestTryOn.mockRejectedValue(new ApiError(409, 'TRY_ON_CONSENT_REQUIRED', 'x'));
    await mountRoom({ onConsentRequired });
    await advance(DEBOUNCE_MS);
    expect(onConsentRequired).toHaveBeenCalledTimes(1);
  });

  it('429 TRY_ON_QUOTA_EXCEEDED -> khối hết lượt và cập nhật quota', async () => {
    requestTryOn.mockRejectedValue(new ApiError(429, 'TRY_ON_QUOTA_EXCEEDED', 'hết lượt'));
    const { result } = await mountRoom();
    getQuota.mockClear();
    getQuota.mockResolvedValue({ quota: { ...QUOTA, used: 30, remaining: 0 } });
    await advance(DEBOUNCE_MS);
    expect(result.current.entry.kind).toBe('quota');
    expect(getQuota).toHaveBeenCalledTimes(1);
    expect(result.current.quota.remaining).toBe(0);
  });

  it('503 TRY_ON_UNAVAILABLE -> failed giữ nguyên code', async () => {
    requestTryOn.mockRejectedValue(new ApiError(503, 'TRY_ON_UNAVAILABLE', 'tạm ngưng'));
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(result.current.entry).toMatchObject({
      kind: 'failed',
      error: { code: 'TRY_ON_UNAVAILABLE', message: 'tạm ngưng' },
    });
  });

  it('404 PRODUCT_NOT_FOUND -> tải lại danh sách', async () => {
    requestTryOn.mockRejectedValueOnce(new ApiError(404, 'PRODUCT_NOT_FOUND', 'x'));
    await mountRoom();
    await advance(DEBOUNCE_MS);
    expect(fetchCategoryProducts).toHaveBeenCalledTimes(2);
  });
});

describe('useTryOnRoom: <img onError>', () => {
  it('GET lại một lần để lấy URL mới; lỗi lần hai -> failed IMAGE_LOAD_FAILED', async () => {
    requestTryOn.mockResolvedValue({ tryOn: tryOn('p1', 'succeeded'), quota: QUOTA });
    getTryOn.mockResolvedValue({
      tryOn: tryOn('p1', 'succeeded', { imageUrl: 'https://result.test/new.jpg' }),
    });
    const { result } = await mountRoom();
    await advance(DEBOUNCE_MS);
    await act(async () => {
      await result.current.onImageError();
    });
    expect(getTryOn).toHaveBeenCalledTimes(1);
    expect(result.current.entry.tryOn.imageUrl).toBe('https://result.test/new.jpg');
    await act(async () => {
      await result.current.onImageError();
    });
    expect(getTryOn).toHaveBeenCalledTimes(1);
    expect(result.current.entry).toMatchObject({
      kind: 'failed',
      error: { code: 'IMAGE_LOAD_FAILED' },
    });
  });
});
