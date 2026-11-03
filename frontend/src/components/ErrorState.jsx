/** Lỗi tải dữ liệu: tiêu đề, message thân thiện và nút Thử lại. */
export default function ErrorState({ title, message, onRetry }) {
  return (
    <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
