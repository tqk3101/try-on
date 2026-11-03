import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useToast } from '../components/toastContext.js';
import { PATHS } from '../routes/paths.js';
import { safeRedirect } from '../routes/safeRedirect.js';
import { ApiError, setUnauthorizedHandler, tokenStorage } from '../services/apiClient.js';
import { loginAccount } from '../services/authApi.js';
import { fetchProfile } from '../services/userApi.js';
import { AuthContext } from './authContext.js';
import { isTokenExpired } from './token.js';

const TOKEN_KEY = 'tryon_token';
const GUEST = { status: 'guest', user: null };

function initialSession() {
  const token = tokenStorage.get();
  if (!token) return GUEST;
  if (isTokenExpired(token)) {
    tokenStorage.clear();
    return GUEST;
  }
  return { status: 'checking', user: null };
}

/**
 * Giữ phiên đăng nhập (design/flows/logout-protected-routes.md mục 2, 4, 5).
 * Phải nằm trong cây router vì dùng useNavigate.
 */
export default function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();
  const { showToast } = useToast();
  const [session, setSession] = useState(initialSession);
  const locationKeyRef = useRef(locationKey);
  const checkSeq = useRef(0);
  const checkingRef = useRef(false);
  const expiredHandledRef = useRef(false);
  const initialStatus = useRef(session.status);

  // Kiểm tra token bằng GET /user/profile; trả về session mới, hoặc null nếu kết quả đã lỗi thời.
  const checkSession = useCallback(async () => {
    const seq = ++checkSeq.current;
    checkingRef.current = true;
    expiredHandledRef.current = false;
    let next;
    try {
      const { user } = await fetchProfile();
      next = { status: 'authenticated', user };
    } catch (error) {
      // 401: apiClient đã xoá token -> guest. Lỗi mạng/5xx: giữ token, hiện màn lỗi + Thử lại.
      next =
        error instanceof ApiError && error.status === 401 ? GUEST : { status: 'error', user: null };
    }
    if (seq !== checkSeq.current) return null;
    checkingRef.current = false;
    return next;
  }, []);

  const runCheck = useCallback(() => {
    checkSession().then((next) => next && setSession(next));
  }, [checkSession]);

  useEffect(() => {
    if (initialStatus.current === 'checking') runCheck();
  }, [runCheck]);

  const endSession = useCallback(
    ({ clearToken }) => {
      checkSeq.current += 1; // huỷ kết quả kiểm tra đang bay
      checkingRef.current = false;
      if (clearToken) tokenStorage.clear();
      navigate(PATHS.home, { replace: true });
      setSession({ ...GUEST, logoutKey: locationKeyRef.current });
      showToast('Bạn đã đăng xuất.');
    },
    [navigate, showToast],
  );

  useEffect(() => {
    locationKeyRef.current = locationKey;
  }, [locationKey]);

  const logout = useCallback(() => endSession({ clearToken: true }), [endSession]);

  const login = useCallback(async ({ email, password }) => {
    const { token, user } = await loginAccount({ email, password });
    tokenStorage.set(token);
    expiredHandledRef.current = false;
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const retry = useCallback(() => {
    setSession({ status: 'checking', user: null });
    runCheck();
  }, [runCheck]);

  // 401 từ request đã gửi token: chỉ xử lý một lần dù nhiều request cùng lỗi.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (checkingRef.current || expiredHandledRef.current) return;
      expiredHandledRef.current = true;
      const { pathname, search } = window.location;
      const redirect = safeRedirect(`${pathname}${search}`);
      const onAuthPage = pathname === PATHS.login || pathname === PATHS.register;
      if (!onAuthPage) {
        const query = new URLSearchParams();
        if (redirect) query.set('redirect', redirect);
        query.set('reason', 'expired');
        navigate(`${PATHS.login}?${query}`, { replace: true });
      }
      // expiredFor: để RequireAuth (đang mount) tạo cùng URL có reason=expired, không ghi đè.
      setSession({ ...GUEST, expiredFor: `${pathname}${search}` });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  // Đồng bộ nhiều tab qua localStorage.
  useEffect(() => {
    function onStorage(event) {
      if (event.key !== null && event.key !== TOKEN_KEY) return;
      if (!event.newValue) {
        endSession({ clearToken: false });
      } else {
        setSession({ status: 'checking', user: null });
        runCheck();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [endSession, runCheck]);

  const value = useMemo(
    () => ({
      status: session.status,
      user: session.user,
      logoutKey: session.logoutKey ?? null,
      expiredFor: session.expiredFor ?? null,
      login,
      logout,
      retry,
    }),
    [session, login, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
