import { useEffect, useState } from 'react';
import Logo from '../Logo.jsx';
import AccountMenu from '../AccountMenu.jsx';
import AuthLink from '../AuthLink.jsx';
import { CloseIcon, MenuIcon } from '../icons.jsx';
import { NAV_LINKS } from '../../mocks/landingContent.js';

const linkClass =
  'rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent';

/**
 * `user` / `onLogout`: LandingPage truyền từ useAuth(). user = null (khách)
 * hiện nút Đăng nhập/Đăng ký; có user thì thay bằng AccountMenu (gồm Đăng xuất).
 */
export default function LandingHeader({ user = null, onLogout }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.id} href={link.href} className={linkClass}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <AccountMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <AuthLink to="login" variant="outline" compact>
                Đăng nhập
              </AuthLink>
              <AuthLink to="register" compact>
                Đăng ký
              </AuthLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-line bg-canvas px-4 pb-6 pt-3 md:hidden"
      >
        <nav aria-label="Điều hướng chính (di động)" className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center border-b border-line/70 text-base font-medium text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        {user ? (
          <AccountMenu user={user} onLogout={onLogout} inline onNavigate={() => setOpen(false)} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <AuthLink to="login" variant="outline" compact>
              Đăng nhập
            </AuthLink>
            <AuthLink to="register" compact>
              Đăng ký
            </AuthLink>
          </div>
        )}
      </div>
    </header>
  );
}
