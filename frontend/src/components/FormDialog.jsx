import { useEffect, useId, useRef } from 'react';

/**
 * Hộp thoại chứa form, dựa trên <dialog> gốc (showModal: focus trap, inert nền, trả focus khi đóng).
 * `children` (các ô nhập) chỉ render khi `open`, nên state của form được reset mỗi lần mở.
 * Khi `busy` không đóng được bằng Esc / bấm nền. Focus ban đầu ở ô nhập đầu tiên (autoFocus).
 */
export default function FormDialog({
  open,
  title,
  submitLabel = 'Lưu',
  busyLabel = 'Đang lưu…',
  busy = false,
  error,
  onSubmit,
  onClose,
  children,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event) {
    event.preventDefault();
    if (!busy) onClose();
  }

  function handleClick(event) {
    if (event.target === dialogRef.current && !busy) onClose();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!busy) onSubmit();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-surface p-0 text-ink shadow-float backdrop:bg-ink/50"
    >
      {open && (
        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8">
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            {title}
          </h2>
          <fieldset disabled={busy} className="mt-5 min-w-0 border-0 p-0">
            {children}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? busyLabel : submitLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
