import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { PATHS } from '../routes/paths.js';
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
          <div className="flex items-center gap-2">
            {user && (
              <NavLink
                to={PATHS.tryOn}
                className={({ isActive }) =>
                  `hidden min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors sm:inline-flex ${
                    isActive ? 'bg-accent text-white' : 'text-ink-soft hover:text-accent'
                  }`
                }
              >
                Phòng thử đồ
              </NavLink>
            )}
            <AccountMenu user={user} onLogout={logout} />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
