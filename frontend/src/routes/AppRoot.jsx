import { Outlet } from 'react-router';
import AuthProvider from '../auth/AuthProvider.jsx';
import ToastProvider from '../components/ToastProvider.jsx';

/** Route gốc: cung cấp toast + phiên đăng nhập (cần nằm trong router để dùng useNavigate). */
export default function AppRoot() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ToastProvider>
  );
}
