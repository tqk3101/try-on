import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../src/auth/authContext.js';
import { GuestOnly, RequireAdmin, RequireAuth } from '../src/routes/guards.jsx';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

/** Dựng cây route giống router.jsx với AuthContext giả. */
function renderAt(url, auth) {
  const value = {
    status: 'guest',
    user: null,
    logoutKey: null,
    expiredFor: null,
    retry: vi.fn(),
    ...auth,
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<p>HOME</p>} />
          <Route element={<GuestOnly />}>
            <Route
              path="/login"
              element={
                <>
                  <p>LOGIN</p>
                  <Where />
                </>
              }
            />
            <Route path="/register" element={<p>REGISTER</p>} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<p>PROFILE</p>} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin/products" element={<p>ADMIN-PRODUCTS</p>} />
            </Route>
          </Route>
        </Routes>
        <Where />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return value;
}

const where = () => screen.getAllByTestId('where').at(-1).textContent;
const user = { id: '1', email: 'a@b.co', role: 'user', displayName: null };
const admin = { ...user, role: 'admin' };

describe('RequireAuth', () => {
  it('đang kiểm tra phiên -> spinner, không lộ nội dung', () => {
    renderAt('/profile', { status: 'checking' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('PROFILE')).not.toBeInTheDocument();
  });

  it('khách -> /login?redirect=<đường dẫn hiện tại, có query>', () => {
    renderAt('/admin/products?categoryId=abc', { status: 'guest' });
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
    expect(where()).toBe(`/login?redirect=${encodeURIComponent('/admin/products?categoryId=abc')}`);
  });

  it('thêm reason=expired chỉ khi phiên hết hạn đúng tại trang này (common_errors 3.1)', () => {
    renderAt('/profile', { status: 'guest', expiredFor: '/profile' });
    expect(where()).toBe('/login?redirect=%2Fprofile&reason=expired');
  });

  it('expiredFor của trang khác -> KHÔNG gắn reason=expired', () => {
    renderAt('/profile', { status: 'guest', expiredFor: '/admin/products' });
    expect(where()).toBe('/login?redirect=%2Fprofile');
  });

  it('vừa đăng xuất từ chính trang này (logoutKey khớp location.key) -> về trang chủ (3.2)', () => {
    // MemoryRouter đặt key 'default' cho entry đầu tiên.
    renderAt('/profile', { status: 'guest', logoutKey: 'default' });
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });

  it('lỗi kiểm tra phiên -> thông báo + nút Thử lại gọi retry', async () => {
    const value = renderAt('/profile', { status: 'error' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(value.retry).toHaveBeenCalledTimes(1);
  });

  it('đã đăng nhập -> render nội dung', () => {
    renderAt('/profile', { status: 'authenticated', user });
    expect(screen.getByText('PROFILE')).toBeInTheDocument();
  });
});

describe('GuestOnly', () => {
  it('khách vào /login được', () => {
    renderAt('/login', { status: 'guest' });
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('đang kiểm tra -> spinner', () => {
    renderAt('/login', { status: 'checking' });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('đã đăng nhập -> tới redirect an toàn nếu có', () => {
    renderAt('/login?redirect=%2Fadmin%2Fproducts', { status: 'authenticated', user: admin });
    expect(screen.getByText('ADMIN-PRODUCTS')).toBeInTheDocument();
  });

  it('đã đăng nhập, không có redirect -> /profile', () => {
    renderAt('/register', { status: 'authenticated', user });
    expect(screen.getByText('PROFILE')).toBeInTheDocument();
  });

  it('redirect độc hại bị bỏ qua -> /profile', () => {
    renderAt('/login?redirect=https%3A%2F%2Fevil.example', { status: 'authenticated', user });
    expect(screen.getByText('PROFILE')).toBeInTheDocument();
    expect(where()).toBe('/profile');
  });

  it('redirect trỏ lại /login -> /profile (không lặp)', () => {
    renderAt('/login?redirect=%2Flogin', { status: 'authenticated', user });
    expect(screen.getByText('PROFILE')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('admin thấy nội dung quản trị', () => {
    renderAt('/admin/products', { status: 'authenticated', user: admin });
    expect(screen.getByText('ADMIN-PRODUCTS')).toBeInTheDocument();
  });

  it('user thường chỉ thấy 403, nội dung admin không render, URL giữ nguyên', () => {
    renderAt('/admin/products', { status: 'authenticated', user });
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN-PRODUCTS')).not.toBeInTheDocument();
    expect(where()).toBe('/admin/products');
  });

  it('khách vào /admin -> RequireAuth chuyển về /login', () => {
    renderAt('/admin/products', { status: 'guest' });
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });
});
