import { Outlet } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import AccountMenu from './AccountMenu.jsx';
import Logo from './Logo.jsx';

export default function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="border-b border-line/70">
        <nav
          aria-label="Điều hướng chính"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        >
          <Logo />
          <AccountMenu user={user} onLogout={logout} />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
