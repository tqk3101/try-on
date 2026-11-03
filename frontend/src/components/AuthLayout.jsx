import { Outlet } from 'react-router';
import Logo from './Logo.jsx';

/** Khung chung cho các trang đăng ký / đăng nhập: logo trên cùng, thẻ form ở giữa. */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-card"
      >
        Bỏ qua tới nội dung chính
      </a>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-card sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
