import Logo from '../Logo.jsx';
import { FOOTER_LINKS } from '../../mocks/landingContent.js';

export default function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <Logo />
          <p className="mt-1 text-sm text-muted">Thử đồ ảo bằng AI, mua sắm tự tin hơn.</p>
        </div>
        <nav aria-label="Liên kết chân trang">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-ink-soft hover:text-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Try-on. Bảo lưu mọi quyền.
      </p>
    </footer>
  );
}
