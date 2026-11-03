import { useLayoutEffect, useRef } from 'react';
import { formatDigitsWithDots, sanitizePrice } from '../../utils/format.js';
import TextField from '../TextField.jsx';

/** Vị trí con trỏ trong chuỗi đã định dạng, sau `digitCount` chữ số. */
function caretAfterDigits(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) seen += 1;
    if (seen === digitCount) return i + 1;
  }
  return formatted.length;
}

/**
 * Ô giá VND: hiển thị tách nghìn bằng dấu chấm ("199.000"), nhưng `value` / `onChange` luôn là
 * chuỗi chữ số thuần ("199000"). Giữ vị trí con trỏ ổn định khi định dạng lại.
 */
export default function PriceField({ value, onChange, ref, ...rest }) {
  const inputRef = useRef(null);
  const pendingDigitsBeforeCaret = useRef(null);
  const formatted = formatDigitsWithDots(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitCount = pendingDigitsBeforeCaret.current;
    pendingDigitsBeforeCaret.current = null;
    if (!input || digitCount === null || document.activeElement !== input) return;
    const position = caretAfterDigits(input.value, digitCount);
    input.setSelectionRange(position, position);
  });

  function handleChange(event) {
    const { value: raw, selectionStart } = event.target;
    const digits = sanitizePrice(raw);
    const digitsBeforeCaret = raw.slice(0, selectionStart ?? raw.length).replace(/\D/g, '').length;
    pendingDigitsBeforeCaret.current = Math.min(digitsBeforeCaret, digits.length);
    onChange(digits);
  }

  return (
    <TextField
      {...rest}
      ref={(node) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      suffix="₫"
      value={formatted}
      onChange={handleChange}
    />
  );
}
