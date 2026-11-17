import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/authContext.js';
import AuthProvider from '../src/auth/AuthProvider.jsx';
import { ToastContext } from '../src/components/toastContext.js';
import { GuestOnly, RequireAuth } from '../src/routes/guards.jsx';
import { ApiError, tokenStorage } from '../src/services/apiClient.js';

vi.mock('../src/services/userApi.js', () => ({ fetchProfile: vi.fn() }));
vi.mock('../src/services/authApi.js', () => ({ loginAccount: vi.fn() }));

const { fetchProfile } = await import('../src/services/userApi.js');
const { loginAccount } = await import('../src/services/authApi.js');

const futureToken = () => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc({ exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
};
const profile = { id: '1', email: 'a@b.co', role: 'user', displayName: 'Lan', phone: '0912345678' };
const showToast = vi.fn();

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

function Profile() {
  const { user, logout } = useAuth();
  return (
    <div>
      <p>PROFILE:{user.email}</p>
      <button onClick={logout}>Đăng xuất</button>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  return <button onClick={() => login({ email: 'a@b.co', password: 'Abcdefg1' })}>Gửi</button>;
}

function renderApp(url) {
  render(
    <ToastContext.Provider value={{ showToast }}>
      <MemoryRouter initialEntries={[url]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<p>HOME</p>} />
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<LoginForm />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
          <Where />
        </AuthProvider>
      </MemoryRouter>
    </ToastContext.Provider>,
  );
}

const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
  fetchProfile.mockReset();
  loginAccount.mockReset();
  showToast.mockReset();
});

describe('AuthProvider + guards', () => {
  it('không có token -> /profile chuyển tới /login?redirect, không gọi API', async () => {
    renderApp('/profile');
    await waitFor(() => expect(where()).toBe('/login?redirect=%2Fprofile'));
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('token đã hết hạn ở client -> bị xoá, coi là khách, không gọi API', async () => {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    tokenStorage.set(`${enc({})}.${enc({ exp: 1 })}.sig`);
    renderApp('/profile');
    await waitFor(() => expect(where()).toContain('/login'));
    expect(tokenStorage.get()).toBeNull();
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('reload khi đang đăng nhập: khôi phục phiên từ GET /user/profile ({ profile })', async () => {
    tokenStorage.set(futureToken());
    fetchProfile.mockResolvedValue({ profile });
    renderApp('/profile');
    expect(await screen.findByText('PROFILE:a@b.co')).toBeInTheDocument();
  });

  it('token bị server từ chối (401) lúc khôi phục -> về /login', async () => {
    tokenStorage.set(futureToken());
    fetchProfile.mockRejectedValue(new ApiError(401, 'INVALID_TOKEN', 'x'));
    renderApp('/profile');
    await waitFor(() => expect(where()).toContain('/login'));
  });

  it('lỗi mạng khi khôi phục -> màn lỗi có Thử lại, giữ token; Thử lại thành công vào trang', async () => {
    const token = futureToken();
    tokenStorage.set(token);
    fetchProfile.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'x'));
    renderApp('/profile');
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    expect(tokenStorage.get()).toBe(token);

    fetchProfile.mockResolvedValue({ profile });
    await userEvent.click(retry);
    expect(await screen.findByText('PROFILE:a@b.co')).toBeInTheDocument();
  });

  it('đăng xuất từ trang bảo vệ -> về "/" (không phải /login), xoá token, hiện toast (3.2)', async () => {
    tokenStorage.set(futureToken());
    fetchProfile.mockResolvedValue({ profile });
    renderApp('/profile');
    await userEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(where()).toBe('/');
    expect(tokenStorage.get()).toBeNull();
    expect(showToast).toHaveBeenCalledWith('Bạn đã đăng xuất.');
  });

  it('đăng nhập: lưu token, GuestOnly chuyển tới /profile', async () => {
    const token = futureToken();
    loginAccount.mockResolvedValue({ token, user: profile });
    renderApp('/login');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(await screen.findByText('PROFILE:a@b.co')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe(token);
  });
});
