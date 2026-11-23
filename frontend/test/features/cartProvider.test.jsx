import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../src/auth/authContext.js';
import { useCart } from '../../src/features/cart/cartContext.js';
import CartProvider from '../../src/features/cart/CartProvider.jsx';

vi.mock('../../src/services/cartApi.js', () => ({ getCart: vi.fn() }));
const { getCart } = await import('../../src/services/cartApi.js');

const cartOf = (itemCount) => ({ items: [], lineCount: itemCount ? 1 : 0, itemCount, total: itemCount * 1000 });
let api;

function Probe() {
  const cart = useCart();
  api = cart;
  return (
    <p data-testid="probe">
      {cart.status}:{cart.itemCount}
    </p>
  );
}

const withUser = (user) => (
  <AuthContext.Provider value={{ user }}>
    <CartProvider>
      <Probe />
    </CartProvider>
  </AuthContext.Provider>
);
const probe = () => screen.getByTestId('probe').textContent;
const setVisibility = (state) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });

describe('CartProvider', () => {
  beforeEach(() => {
    getCart.mockReset();
    setVisibility('visible');
  });

  it('không nạp giỏ khi chưa đăng nhập', () => {
    render(withUser(null));
    expect(probe()).toBe('idle:0');
    expect(getCart).not.toHaveBeenCalled();
  });

  it('nạp giỏ khi đăng nhập', async () => {
    getCart.mockResolvedValue({ cart: cartOf(3) });
    render(withUser({ id: 'u1' }));
    expect(probe()).toBe('loading:0');
    await waitFor(() => expect(probe()).toBe('ready:3'));
    expect(getCart).toHaveBeenCalledTimes(1);
  });

  it('badge cập nhật khi thêm/sửa/xoá (applyCart)', async () => {
    getCart.mockResolvedValue({ cart: cartOf(1) });
    render(withUser({ id: 'u1' }));
    await waitFor(() => expect(probe()).toBe('ready:1'));
    act(() => api.applyCart(cartOf(4)));
    expect(probe()).toBe('ready:4');
    act(() => api.applyCart(cartOf(2)));
    expect(probe()).toBe('ready:2');
    act(() => api.applyCart(cartOf(0)));
    expect(probe()).toBe('ready:0');
  });

  it('xoá giỏ khi đăng xuất', async () => {
    getCart.mockResolvedValue({ cart: cartOf(5) });
    const { rerender } = render(withUser({ id: 'u1' }));
    await waitFor(() => expect(probe()).toBe('ready:5'));
    rerender(withUser(null));
    expect(probe()).toBe('idle:0');
    expect(api.cart).toBeNull();
  });

  it('bỏ kết quả nạp đang bay sau khi đăng xuất', async () => {
    let resolve;
    getCart.mockReturnValue(new Promise((r) => (resolve = r)));
    const { rerender } = render(withUser({ id: 'u1' }));
    rerender(withUser(null));
    await act(async () => resolve({ cart: cartOf(9) }));
    expect(probe()).toBe('idle:0');
  });

  it('nạp lại nền khi tab hiện lại (visibilitychange), không nạp khi ẩn', async () => {
    getCart.mockResolvedValueOnce({ cart: cartOf(1) });
    render(withUser({ id: 'u1' }));
    await waitFor(() => expect(probe()).toBe('ready:1'));

    getCart.mockResolvedValueOnce({ cart: cartOf(7) });
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(getCart).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(probe()).toBe('ready:1'); // nạp nền: không chuyển 'loading'
    await waitFor(() => expect(probe()).toBe('ready:7'));
  });

  it('nạp nền lỗi thì giữ giỏ cũ; nạp thường lỗi thì status error', async () => {
    getCart.mockResolvedValueOnce({ cart: cartOf(2) });
    render(withUser({ id: 'u1' }));
    await waitFor(() => expect(probe()).toBe('ready:2'));
    getCart.mockRejectedValueOnce(new Error('mạng'));
    await act(async () => {
      await api.refresh({ silent: true });
    });
    expect(probe()).toBe('ready:2');
    getCart.mockRejectedValueOnce(new Error('mạng'));
    await act(async () => {
      await api.refresh();
    });
    expect(probe()).toBe('error:2');
    expect(api.error).toBe('mạng');
  });
});
