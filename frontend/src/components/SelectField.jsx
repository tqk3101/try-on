import { useId } from 'react';

const selectBase =
  'block min-h-12 w-full rounded-2xl border bg-surface px-4 text-base text-ink transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Ô chọn (<select>) có nhãn và thông báo lỗi gắn đúng ngữ nghĩa, cùng kiểu với `TextField`.
 * `options`: [{ value, label }]; `placeholder` là tuỳ chọn đầu (value rỗng).
 * `hideLabel`: nhãn chỉ dành cho trình đọc màn hình (dùng trong thanh bộ lọc).
 */
export default function SelectField({
  label,
  hideLabel = false,
  placeholder,
  options,
  error,
  className = '',
  ...selectProps
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}
      >
        {label}
      </label>
      <select
        {...selectProps}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${selectBase} ${error ? 'border-red-600' : 'border-line hover:border-ink/30'}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
