import { PASSWORD_RULES, getPasswordStrength } from '../utils/authValidation.js';

const TOTAL_SEGMENTS = 4;
const FILLED_BY_LABEL = { Yếu: 1, 'Trung bình': 2, Khá: 3, Mạnh: 4 };
const COLOR_BY_LABEL = {
  Yếu: 'bg-red-500',
  'Trung bình': 'bg-amber-500',
  Khá: 'bg-lime-600',
  Mạnh: 'bg-emerald-600',
};

/**
 * Thanh độ mạnh + danh sách điều kiện bắt buộc. Trạng thái luôn có chữ (không chỉ màu).
 * Ký tự đặc biệt chỉ khuyến nghị (design/flows/README.md D9).
 */
export default function PasswordStrength({ password }) {
  const { label } = getPasswordStrength(password);
  const filled = FILLED_BY_LABEL[label] ?? 0;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL_SEGMENTS }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index < filled ? COLOR_BY_LABEL[label] : 'bg-line'
              }`}
            />
          ))}
        </div>
        <p className="min-w-24 text-right text-xs font-medium text-ink-soft" aria-live="polite">
          {label ? `Độ mạnh: ${label}` : 'Độ mạnh mật khẩu'}
        </p>
      </div>

      <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = password !== '' && rule.test(password);
          return (
            <li key={rule.id} className={passed ? 'text-emerald-700' : 'text-muted'}>
              <span aria-hidden="true">{passed ? '✓' : '○'}</span> {rule.label}
              <span className="sr-only">{passed ? ' (đạt)' : ' (chưa đạt)'}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-muted">Nên thêm ký tự đặc biệt (ví dụ ! @ #) để mạnh hơn.</p>
    </div>
  );
}
