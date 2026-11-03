import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../routes/paths.js';

const itemClass =
  'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-ink/5';

/**
 * Menu tài khoản ở header: hiện khi đã đăng nhập (user != null), ẩn khi chưa.
 * Props: `user` { email, displayName }, `onLogout()` (AuthProvider.logout), `inline` (mobile: liệt kê
 * thẳng trong menu di động thay vì dropdown), `onNavigate` (đóng menu cha khi bấm).
 * Dropdown theo pattern disclosure: nút aria-expanded, đóng bằng Esc / bấm ra ngoài.
 */
export default function AccountMenu({ user, onLogout, inline = false, onNavigate }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector('button')?.focus();
      }
    };
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  if (!user) return null;

  const name = user.displayName || user.email;
  const initial = name.trim().charAt(0).toUpperCase();

  function handleLogout() {
    setOpen(false);
    onNavigate?.();
    onLogout?.();
  }

  const items = (
    <>
      <Link
        to={PATHS.profile}
        className={itemClass}
        onClick={() => {
          setOpen(false);
          onNavigate?.();
        }}
      >
        Hồ sơ của tôi
      </Link>
      <button type="button" onClick={handleLogout} className={`${itemClass} text-accent-dark`}>
        Đăng xuất
      </button>
    </>
  );

  if (inline) {
    return (
      <div className="mt-5 rounded-2xl border border-line bg-surface p-3">
        <p className="px-3 pb-2 pt-1 text-sm text-ink-soft">
          Đăng nhập với <span className="font-semibold text-ink">{user.email}</span>
        </p>
        {items}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/25 py-1 pl-1 pr-4 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
        >
          {initial}
        </span>
        <span className="max-w-32 truncate">
          <span className="sr-only">Tài khoản: </span>
          {name}
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-card"
      >
        <p className="truncate px-3 pb-2 pt-1 text-sm text-muted">{user.email}</p>
        {items}
      </div>
    </div>
  );
}
