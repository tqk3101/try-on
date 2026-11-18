import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/authContext.js';
import { CartContext } from './cartContext.js';
import { getCart } from './cartApi.js';

const IDLE = { status: 'idle', cart: null, error: '' };

/**
 * Giữ giỏ hàng của user đang đăng nhập (nguồn dữ liệu cho badge ở header và các trang giỏ/đặt hàng).
 * Nạp khi đăng nhập/khôi phục phiên và khi tab lấy lại focus (cart-and-orders.md mục 6); đăng xuất -> xoá.
 * Không cập nhật lạc quan: chỉ `applyCart(cart)` với giỏ do server trả.
 */
export default function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState(IDLE);
  const seqRef = useRef(0);

  // `silent`: nạp nền (không đổi status sang 'loading', giữ giỏ đang hiện).
  const refresh = useCallback(async ({ silent = false } = {}) => {
    const seq = ++seqRef.current;
    if (!silent) setState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const { cart } = await getCart();
      if (seq !== seqRef.current) return null;
      setState({ status: 'ready', cart, error: '' });
      return cart;
    } catch (error) {
      if (seq !== seqRef.current || error.status === 401) return null; // 401: apiClient xử lý phiên
      // Nạp nền lỗi: giữ giỏ cũ (badge không nháy); nạp thường lỗi: báo để trang hiện ErrorState.
      setState((prev) =>
        silent && prev.cart ? prev : { ...prev, status: 'error', error: error.message },
      );
      return null;
    }
  }, []);

  /** Thay state bằng `cart` server vừa trả (sau thêm/sửa/xoá/đặt hàng); bỏ qua lần nạp đang bay. */
  const applyCart = useCallback((cart) => {
    seqRef.current += 1;
    setState({ status: 'ready', cart, error: '' });
  }, []);

  useEffect(() => {
    if (!userId) {
      seqRef.current += 1;
      setState(IDLE);
      return undefined;
    }
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, refresh]);

  const value = useMemo(
    () => ({
      cart: state.cart,
      status: state.status,
      error: state.error,
      itemCount: state.cart?.itemCount ?? 0,
      refresh,
      applyCart,
    }),
    [state, refresh, applyCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
