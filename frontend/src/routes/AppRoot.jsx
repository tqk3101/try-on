import { Outlet } from 'react-router';
import AuthProvider from '../auth/AuthProvider.jsx';
import ToastProvider from '../components/ToastProvider.jsx';
import CartProvider from '../features/cart/CartProvider.jsx';

/** Route gốc: cung cấp toast + phiên đăng nhập + giỏ hàng (cần nằm trong router để dùng useNavigate). */
export default function AppRoot() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <Outlet />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
