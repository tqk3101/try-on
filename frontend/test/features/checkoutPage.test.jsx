import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../src/auth/authContext.js';
import { ToastContext } from '../../src/components/toastContext.js';
import CartProvider from '../../src/features/cart/CartProvider.jsx';
import CheckoutPage from '../../src/pages/CheckoutPage.jsx';

vi.mock('../../src/features/cart/cartApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getCart: vi.fn(),
}));
vi.mock('../../src/features/orders/orderApi.js', () => ({ placeOrder: vi.fn() }));
vi.mock('../../src/services/userApi.js', () => ({ fetchProfile: vi.fn() }));

const { getCart } = await import('../../src/features/cart/cartApi.js');
const { placeOrder } = await import('../../src/features/orders/orderApi.js');
const { fetchProfile } = await import('../../src/services/userApi.js');

const item = { productId: 'p1', name: 'Váy hoa', price: 100000, quantity: 2, lineTotal: 200000, imageUrl: null };
const makeCart = (total, items = [item]) => ({
  items,
  lineCount: items.length,
  itemCount: items.reduce((s, i) => s + i.quantity, 0),
  total,
});
const apiError = (code, message, extra = {}) => Object.assign(new Error(message), { code, status: 409, ...extra });

const showToast = vi.fn();
function Where() {
  const { pathname, state } = useLocation();
  return <p data-testid="where">{`${pathname}|${JSON.stringify(state)}`}</p>;
}

function renderCheckout() {
  return render(
    <AuthContext.Provider value={{ user: { id: 'u1' } }}>
      <ToastContext.Provider value={{ showToast }}>
        <MemoryRouter initialEntries={['/checkout']}>
          <CartProvider>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="*" element={<Where />} />
            </Routes>
          </CartProvider>
        </MemoryRouter>
      </ToastContext.Provider>
    </AuthContext.Provider>,
  );
}

async function fillAndSubmit(user) {
  await screen.findByRole('heading', { name: 'Thông tin giao hàng' });
  await user.clear(screen.getByLabelText(/Họ tên người nhận/));
  await user.type(screen.getByLabelText(/Họ tên người nhận/), 'Lan Anh');
  await user.clear(screen.getByLabelText(/Số điện thoại/));
  await user.type(screen.getByLabelText(/Số điện thoại/), '0912345678');
  await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), '12 Lê Lợi, Quận 1');
  await user.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCart.mockResolvedValue({ cart: makeCart(200000) });
    fetchProfile.mockResolvedValue({ profile: { displayName: 'Lan', phone: '0900000000' } });
  });

  it('idempotencyKey sinh một lần và giữ nguyên khi gửi lại sau lỗi', async () => {
    const uuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue('key-1');
    placeOrder
      .mockRejectedValueOnce(Object.assign(new Error('Mất kết nối'), { code: 'NETWORK_ERROR' }))
      .mockRejectedValueOnce(Object.assign(new Error('Lỗi máy chủ'), { status: 500, code: 'INTERNAL' }))
      .mockResolvedValueOnce({ order: { id: 'o1' } });
    const user = userEvent.setup();
    renderCheckout();
    await fillAndSubmit(user);
    expect(await screen.findByText('Mất kết nối')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
    expect(await screen.findByText('Lỗi máy chủ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
    await screen.findByTestId('where');

    expect(placeOrder).toHaveBeenCalledTimes(3);
    expect(placeOrder.mock.calls.map(([b]) => b.idempotencyKey)).toEqual(['key-1', 'key-1', 'key-1']);
    expect(uuid).toHaveBeenCalledTimes(1);
    expect(placeOrder.mock.calls[0][0]).toMatchObject({
      recipientName: 'Lan Anh',
      phone: '0912345678',
      shippingAddress: '12 Lê Lợi, Quận 1',
      expectedTotal: 200000,
    });
    uuid.mockRestore();
  });

  it('thành công: điều hướng /orders/:id với state { placed: true }', async () => {
    placeOrder.mockResolvedValue({ order: { id: 'o1' } });
    const user = userEvent.setup();
    renderCheckout();
    await fillAndSubmit(user);
    expect(await screen.findByTestId('where')).toHaveTextContent('/orders/o1|{"placed":true}');
  });

  it('CART_CHANGED: giữ dữ liệu form, cập nhật tổng, hiện thông báo', async () => {
    placeOrder.mockRejectedValueOnce(apiError('CART_CHANGED', 'Giỏ hàng đã thay đổi'));
    const user = userEvent.setup();
    renderCheckout();
    await screen.findByRole('heading', { name: 'Thông tin giao hàng' });
    expect(screen.getByLabelText(/Họ tên người nhận/)).toHaveValue('Lan'); // điền sẵn từ hồ sơ
    getCart.mockResolvedValue({ cart: makeCart(300000, [{ ...item, quantity: 3, lineTotal: 300000 }]) });
    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Giỏ hàng đã thay đổi');
    expect(screen.getByText(/Tổng tiền \(3 sản phẩm\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ tên người nhận/)).toHaveValue('Lan Anh');
    expect(screen.getByLabelText(/Địa chỉ giao hàng/)).toHaveValue('12 Lê Lợi, Quận 1');
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('CART_EMPTY: toast và điều hướng về /cart', async () => {
    placeOrder.mockRejectedValueOnce(apiError('CART_EMPTY', 'Giỏ hàng trống'));
    const user = userEvent.setup();
    renderCheckout();
    await fillAndSubmit(user);
    expect(await screen.findByTestId('where')).toHaveTextContent('/cart|');
    expect(showToast).toHaveBeenCalledWith('Giỏ hàng trống', { tone: 'error' });
  });

  it('giỏ rỗng khi mở trang: về /cart', async () => {
    getCart.mockResolvedValue({ cart: makeCart(0, []) });
    renderCheckout();
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/cart'));
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('lỗi tải giỏ: hiện ErrorState', async () => {
    getCart.mockRejectedValue(new Error('Không kết nối'));
    renderCheckout();
    expect(await screen.findByText('Không tải được thông tin đặt hàng')).toBeInTheDocument();
  });
});
