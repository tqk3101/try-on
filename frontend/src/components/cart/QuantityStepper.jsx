import { MinusIcon, PlusIcon } from '../icons.jsx';

const stepClass =
  'inline-flex size-11 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors hover:border-ink hover:bg-ink/5 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-ink/25 aria-disabled:hover:bg-transparent';

/**
 * Bộ chọn số lượng − / + (không ô gõ tự do). `onChange(next)` chỉ được gọi khi next nằm trong [min, max].
 * Nút dùng `aria-disabled` (không `disabled`) để giữ focus bàn phím khi chạm biên hoặc đang gửi.
 * `busy`: đang gửi (cả hai nút bị chặn). `label`: tên sản phẩm cho trình đọc màn hình.
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  busy = false,
  label,
}) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <div role="group" aria-label={`Số lượng ${label}`} className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`Giảm số lượng ${label}`}
        aria-disabled={atMin || busy}
        onClick={() => {
          if (!atMin && !busy) onChange(value - 1);
        }}
        className={stepClass}
      >
        <MinusIcon width={18} height={18} />
      </button>
      <span
        aria-live="polite"
        className="min-w-8 text-center text-base font-semibold tabular-nums text-ink"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Tăng số lượng ${label}`}
        aria-disabled={atMax || busy}
        onClick={() => {
          if (!atMax && !busy) onChange(value + 1);
        }}
        className={stepClass}
      >
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}
