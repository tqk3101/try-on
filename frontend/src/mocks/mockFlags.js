// Công tắc kịch bản cho mock giỏ hàng / đơn hàng (Sprint 4, Task 2). XOÁ khi nối API thật (Task 5).
//
// Bật bằng query `?mock=cờ1,cờ2` (lưu vào sessionStorage để giữ khi chuyển trang); `?mock=off` để tắt.
// Cờ lỗi là "bền" (mọi lần gọi đều lỗi) trừ khi ghi chú là "một lần".
//
//   cart-loading     GET giỏ không bao giờ xong (xem skeleton)
//   cart-error       GET giỏ lỗi 500 (ErrorState + Thử lại)
//   cart-empty       giỏ ban đầu rỗng (EmptyState)
//   add-full         thêm vào giỏ -> 409 CART_FULL
//   add-limit        thêm vào giỏ -> 409 CART_QUANTITY_LIMIT
//   add-missing      thêm vào giỏ -> 404 PRODUCT_NOT_FOUND
//   add-error        thêm vào giỏ -> 500
//   update-missing   đổi số lượng -> 404 CART_ITEM_NOT_FOUND (dòng bị xoá khỏi mock)
//   update-error     đổi số lượng / xoá dòng -> 500
//   place-changed    đặt hàng lần đầu -> 409 CART_CHANGED (một lần; giá dòng đầu tăng 10.000 ₫)
//   place-empty      đặt hàng -> 409 CART_EMPTY (giỏ bị làm rỗng)
//   place-error      đặt hàng lần đầu -> 500 (một lần; gửi lại cùng idempotencyKey thì thành công)
//   order-404        GET /orders/:id -> 404 ORDER_NOT_FOUND
//   order-error      GET /orders/:id -> 500
//   admin-loading    danh sách đơn admin không bao giờ xong
//   admin-error      danh sách đơn admin lỗi 500
//   admin-empty      chưa có đơn nào (kể cả khi không lọc)
//   admin-detail-404 chi tiết đơn admin -> 404 ORDER_NOT_FOUND
const STORAGE_KEY = 'tryon_mock_flags';

export function mockFlags() {
  try {
    const param = new URLSearchParams(window.location.search).get('mock');
    if (param !== null) {
      if (param === '' || param === 'off') sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, param);
    }
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? '';
    return new Set(raw.split(',').filter(Boolean));
  } catch {
    return new Set();
  }
}

export const hasMockFlag = (name) => mockFlags().has(name);

const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });

/** Chờ `ms` mili giây (giả lập mạng); huỷ được bằng AbortSignal. */
export function mockDelay(ms = 350, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

/** Không bao giờ xong (trừ khi bị huỷ): để xem trạng thái loading. */
export function mockForever(signal) {
  return new Promise((_, reject) => {
    if (signal?.aborted) reject(abortError());
    signal?.addEventListener('abort', () => reject(abortError()), { once: true });
  });
}
