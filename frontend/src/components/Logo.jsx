import { Link } from 'react-router';
import { PATHS } from '../routes/paths.js';

export default function Logo({ className = '' }) {
  return (
    <Link
      to={PATHS.home}
      aria-label="Try-on — về trang chủ"
      className={`font-display text-2xl font-semibold tracking-tight text-ink ${className}`}
    >
      Try<span className="text-accent">-</span>on
    </Link>
  );
}
