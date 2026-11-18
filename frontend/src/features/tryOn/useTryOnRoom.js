import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchCategoryProducts, getQuota, getTryOn, requestTryOn } from './tryOnApi.js';

export const DEBOUNCE_MS = 400;
export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 120_000;

const TIMEOUT_ERROR = {
  code: 'GENERATION_TIMEOUT',
  message: 'Tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại.',
};
// Lỗi chỉ có ở client (ảnh kết quả không tải được sau khi đã GET lại một lần).
const IMAGE_ERROR = {
  code: 'IMAGE_LOAD_FAILED',
  message: 'Không tải được ảnh thử đồ. Vui lòng thử lại.',
};

const isAbort = (error) => error?.name === 'AbortError';

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Trạng thái phòng thử đồ cho một danh mục. Vị trí lưu ở URL `?product=` (replace, không đẩy history).
 *
 * `entries[productId]` (cache phía client, sống trong phiên trang):
 *   { kind: 'processing', startedAt, tryOn? }   đang tạo (chưa gửi POST, đang POST hoặc đang poll)
 *   { kind: 'succeeded', startedAt, tryOn, imageRefreshed? }
 *   { kind: 'failed', startedAt, error: { code, message } }
 *   { kind: 'quota', startedAt }                hết lượt hôm nay (429 TRY_ON_QUOTA_EXCEEDED)
 * Chưa có entry = vừa chuyển tới, đang chờ debounce 400 ms: UI vẫn hiện trạng thái đang tạo ngay (Q15).
 *
 * Không prefetch: chỉ POST cho sản phẩm user dừng lại >= DEBOUNCE_MS. Chỉ poll sản phẩm đang hiển thị.
 * `onProfileIncomplete(fields)` / `onConsentRequired()`: 409 từ server (xử lý ở trang, vì cần đổi màn).
 */
export function useTryOnRoom({ categoryId, onProfileIncomplete, onConsentRequired }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const productParam = searchParams.get('product');

  const [list, setList] = useState({ status: 'loading', category: null, products: [], error: '' });
  const [entries, setEntries] = useState({});
  const [quota, setQuota] = useState(null);
  const entriesRef = useRef({});
  const rootAbortRef = useRef(null);
  const fallbackIndexRef = useRef(null);

  const products = list.products;
  const found = products.findIndex((p) => p.id === productParam);
  const index = found < 0 ? 0 : found;
  const current = list.status === 'ready' ? (products[index] ?? null) : null;
  const currentId = current?.id ?? null;

  const setEntry = useCallback((productId, entry) => {
    const next = { ...entriesRef.current };
    if (entry) next[productId] = entry;
    else delete next[productId];
    entriesRef.current = next;
    setEntries(next);
  }, []);

  // Huỷ mọi request đang bay khi rời trang.
  useEffect(() => {
    const controller = new AbortController();
    rootAbortRef.current = controller;
    return () => controller.abort();
  }, []);

  const refreshQuota = useCallback(async () => {
    try {
      const { quota: next } = await getQuota({ signal: rootAbortRef.current?.signal });
      setQuota(next);
    } catch {
      /* hạn mức chỉ để hiển thị: bỏ qua lỗi */
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const { category, products: items } = await fetchCategoryProducts(categoryId, {
        signal: rootAbortRef.current?.signal,
      });
      setList({
        status: items.length > 0 ? 'ready' : 'empty',
        category,
        products: items,
        error: '',
      });
    } catch (error) {
      if (isAbort(error)) return;
      if (error.status === 404 && error.code === 'CATEGORY_NOT_FOUND') {
        setList({ status: 'notfound', category: null, products: [], error: '' });
      } else {
        setList({
          status: 'error',
          category: null,
          products: [],
          error: error.message || 'Không thể tải sản phẩm. Vui lòng thử lại.',
        });
      }
    }
  }, [categoryId]);

  useEffect(() => {
    loadList();
    // Hạn mức chỉ để hiển thị; không chặn luồng chính.
    refreshQuota();
  }, [loadList, refreshQuota]);

  const reloadList = useCallback(() => {
    setList({ status: 'loading', category: null, products: [], error: '' });
    loadList();
  }, [loadList]);

  // ?product= thiếu / không thuộc danh mục -> sản phẩm đầu (hoặc vị trí gần nhất sau khi xoá), replace URL.
  useEffect(() => {
    if (list.status !== 'ready' || products.some((p) => p.id === productParam)) return;
    const target = Math.min(fallbackIndexRef.current ?? 0, products.length - 1);
    fallbackIndexRef.current = null;
    setSearchParams({ product: products[target].id }, { replace: true });
  }, [list.status, products, productParam, setSearchParams]);

  const applyTryOn = useCallback(
    (productId, tryOn, startedAt) => {
      if (tryOn.status === 'succeeded')
        setEntry(productId, { kind: 'succeeded', startedAt, tryOn });
      else if (tryOn.status === 'failed') {
        setEntry(productId, { kind: 'failed', startedAt, error: tryOn.error });
        // Server không tính job lỗi vào hạn mức: lấy lại số lượt thật thay vì giữ số "trừ 1" của POST.
        refreshQuota();
      } else setEntry(productId, { kind: 'processing', startedAt, tryOn });
    },
    [refreshQuota, setEntry],
  );

  const request = useCallback(
    async (product, { retry = false } = {}) => {
      const id = product.id;
      const existing = entriesRef.current[id];
      if (existing && !retry) return; // đã yêu cầu rồi (cache phía client)
      const startedAt = retry || !existing ? Date.now() : existing.startedAt;
      setEntry(id, { kind: 'processing', startedAt });
      try {
        const { tryOn, quota: nextQuota } = await requestTryOn(id, {
          signal: rootAbortRef.current?.signal,
        });
        if (nextQuota) setQuota(nextQuota);
        applyTryOn(id, tryOn, startedAt);
      } catch (error) {
        if (isAbort(error)) return;
        if (error.code === 'PROFILE_INCOMPLETE') {
          setEntry(id, null);
          onProfileIncomplete?.(error.fields);
        } else if (error.code === 'TRY_ON_CONSENT_REQUIRED') {
          setEntry(id, null);
          onConsentRequired?.();
        } else if (error.code === 'PRODUCT_NOT_FOUND') {
          // Sản phẩm vừa bị xoá: tải lại danh sách, giữ vị trí gần nhất hợp lệ.
          setEntry(id, null);
          fallbackIndexRef.current = Math.max(
            0,
            products.findIndex((p) => p.id === id),
          );
          reloadList();
        } else if (error.code === 'TRY_ON_QUOTA_EXCEEDED') {
          setEntry(id, { kind: 'quota', startedAt });
          refreshQuota();
        } else {
          setEntry(id, {
            kind: 'failed',
            startedAt,
            error: { code: error.code ?? 'UNKNOWN_ERROR', message: error.message },
          });
        }
      }
    },
    [
      applyTryOn,
      onConsentRequired,
      onProfileIncomplete,
      products,
      refreshQuota,
      reloadList,
      setEntry,
    ],
  );

  // Debounce: chỉ gửi POST cho sản phẩm user dừng lại >= 400 ms (không prefetch sản phẩm kế tiếp).
  useEffect(() => {
    if (!current || entriesRef.current[current.id]) return undefined;
    const timer = setTimeout(() => request(current), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [current, request]);

  // Poll đúng một vòng cho sản phẩm đang hiển thị; rời sản phẩm thì dừng, quay lại thì GET ngay.
  const currentEntry = currentId ? entries[currentId] : null;
  const pollTryOnId = currentEntry?.kind === 'processing' ? (currentEntry.tryOn?.id ?? null) : null;
  const pollStartedAt = currentEntry?.startedAt ?? 0;
  useEffect(() => {
    if (!currentId || !pollTryOnId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      while (!signal.aborted) {
        try {
          const { tryOn } = await getTryOn(pollTryOnId, { signal });
          if (signal.aborted) return;
          if (tryOn.status !== 'processing') {
            applyTryOn(currentId, tryOn, pollStartedAt);
            return;
          }
        } catch (error) {
          if (isAbort(error) || signal.aborted) return;
          if (error.status === 404) {
            setEntry(currentId, { kind: 'failed', startedAt: pollStartedAt, error: IMAGE_ERROR });
            return;
          }
          // Lỗi tạm thời (mạng, 5xx, 429): giữ trạng thái đang tạo và poll tiếp tới khi hết 120 s.
        }
        if (Date.now() - pollStartedAt > POLL_TIMEOUT_MS) {
          setEntry(currentId, { kind: 'failed', startedAt: pollStartedAt, error: TIMEOUT_ERROR });
          refreshQuota();
          return;
        }
        await sleep(POLL_INTERVAL_MS, signal);
      }
    })();
    return () => controller.abort();
  }, [currentId, pollTryOnId, pollStartedAt, applyTryOn, refreshQuota, setEntry]);

  const goTo = useCallback(
    (nextIndex) => {
      if (nextIndex < 0 || nextIndex >= products.length || nextIndex === index) return;
      setSearchParams({ product: products[nextIndex].id }, { replace: true });
    },
    [index, products, setSearchParams],
  );
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  const retry = useCallback(() => {
    if (current) request(current, { retry: true });
  }, [current, request]);

  // <img onError> (signed URL hết hạn): GET lại một lần; vẫn lỗi -> khối lỗi + Thử lại.
  const onImageError = useCallback(async () => {
    const productId = currentId;
    const entry = productId ? entriesRef.current[productId] : null;
    if (!entry || entry.kind !== 'succeeded') return;
    if (entry.imageRefreshed) {
      setEntry(productId, { kind: 'failed', startedAt: entry.startedAt, error: IMAGE_ERROR });
      return;
    }
    setEntry(productId, { ...entry, imageRefreshed: true });
    try {
      const { tryOn } = await getTryOn(entry.tryOn.id, { signal: rootAbortRef.current?.signal });
      if (tryOn.status === 'succeeded') {
        setEntry(productId, { ...entriesRef.current[productId], tryOn, imageRefreshed: true });
      } else {
        applyTryOn(productId, tryOn, entry.startedAt);
      }
    } catch (error) {
      if (!isAbort(error)) {
        setEntry(productId, { kind: 'failed', startedAt: entry.startedAt, error: IMAGE_ERROR });
      }
    }
  }, [applyTryOn, currentId, setEntry]);

  return useMemo(
    () => ({
      list,
      products,
      category: list.category,
      index,
      total: products.length,
      current,
      entry: currentEntry,
      quota,
      goNext,
      goPrev,
      goTo,
      retry,
      reloadList,
      onImageError,
    }),
    [
      list,
      products,
      index,
      current,
      currentEntry,
      quota,
      goNext,
      goPrev,
      goTo,
      retry,
      reloadList,
      onImageError,
    ],
  );
}
