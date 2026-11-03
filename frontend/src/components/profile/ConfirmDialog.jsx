import { useEffect, useId, useRef } from 'react';

/**
 * Hộp thoại xác nhận dùng <dialog> gốc: showModal() cho focus trap, nền bị vô hiệu (inert),
 * Esc đóng, và trả focus về nút đã mở. Focus ban đầu ở nút "Huỷ" (hành động an toàn).
 * Khi `busy` thì không đóng được bằng Esc / bấm nền.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Huỷ',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event) {
    // Esc: tự xử lý qua state để React là nơi sở hữu `open`.
    event.preventDefault();
    if (!busy) onCancel();
  }

  function handleClick(event) {
    // Bấm vào nền (chính phần tử dialog, không phải nội dung) thì đóng.
    if (event.target === dialogRef.current && !busy) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={handleCancel}
      onClick={handleClick}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-surface p-0 text-ink shadow-float backdrop:bg-ink/50"
    >
      <div className="p-6 sm:p-8">
        <h2 id={titleId} className="font-display text-2xl font-semibold">
          {title}
        </h2>
        <p id={descId} className="mt-3 text-sm text-ink-soft">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent-dark px-6 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? 'Đang xoá…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
