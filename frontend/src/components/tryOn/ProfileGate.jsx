import { Link } from 'react-router';
import { PATHS } from '../../routes/paths.js';
import { CheckIcon } from '../icons.jsx';

const ITEMS = [
  { key: 'avatar', label: 'Ảnh toàn thân' },
  { key: 'heightCm', label: 'Chiều cao' },
  { key: 'weightKg', label: 'Cân nặng' },
];

/**
 * Màn "Hoàn thiện hồ sơ để thử đồ": liệt kê đủ 3 mục (đã có / còn thiếu, luôn kèm chữ) + nút tới /profile.
 * `missing`: mảng { key } các mục còn thiếu.
 */
export default function ProfileGate({ missing }) {
  const missingKeys = new Set(missing.map((m) => m.key));
  return (
    <section
      aria-labelledby="gate-title"
      className="mx-auto max-w-lg rounded-3xl bg-surface p-6 text-center shadow-card sm:p-10"
    >
      <h1 id="gate-title" className="font-display text-3xl font-semibold text-ink">
        Hoàn thiện hồ sơ để thử đồ
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Phòng thử đồ cần ảnh toàn thân cùng chiều cao, cân nặng của bạn để dựng ảnh bạn mặc sản
        phẩm.
      </p>
      <ul className="mx-auto mt-6 max-w-xs space-y-3 text-left">
        {ITEMS.map(({ key, label }) => {
          const isMissing = missingKeys.has(key);
          return (
            <li key={key} className="flex min-h-11 items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                  isMissing
                    ? 'border border-dashed border-muted text-muted'
                    : 'bg-accent text-white'
                }`}
              >
                {isMissing ? '' : <CheckIcon width={16} height={16} />}
              </span>
              <span className="font-medium text-ink">{label}</span>
              <span
                className={`ml-auto text-xs ${isMissing ? 'font-semibold text-accent-dark' : 'text-muted'}`}
              >
                {isMissing ? 'Còn thiếu' : 'Đã có'}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        to={PATHS.profile}
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark sm:w-auto"
      >
        Cập nhật hồ sơ
      </Link>
    </section>
  );
}
