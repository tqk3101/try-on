import { useRef, useState } from 'react';
import { AVATAR_ACCEPT } from '../../utils/avatarCheck.js';
import { AlertIcon, CameraIcon, PersonIcon } from '../icons.jsx';

const secondaryBtn =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 px-5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Khối ảnh toàn thân (thuần hiển thị, controlled).
 * Props:
 *  - savedUrl: signed URL ảnh đã lưu (hoặc null)
 *  - pending: { previewUrl, warning, accepted } | null  (ảnh vừa chọn, chưa lưu)
 *  - error: { message, retryable } | null  (lỗi chọn/tải ảnh, hiện dưới khung)
 *  - busy: 'uploading' | 'deleting' | '' (đang xử lý -> disable thao tác)
 *  - onPick(file), onAcceptPending(), onDiscardPending(), onRemoveSaved(), onRetryUpload()
 *  - onSavedImageError(): Promise<boolean> — true nếu đã lấy được URL mới (gọi tối đa một lần)
 */
export default function AvatarField({
  savedUrl,
  pending,
  error,
  busy,
  onPick,
  onAcceptPending,
  onDiscardPending,
  onRemoveSaved,
  onRetryUpload,
  onSavedImageError,
}) {
  const inputRef = useRef(null);
  const [brokenUrl, setBrokenUrl] = useState(null);

  const showPending = pending && (pending.accepted || pending.warning);
  const displayUrl = showPending ? pending.previewUrl : savedUrl;
  const hasImage = Boolean(displayUrl) && displayUrl !== brokenUrl;
  const awaitingDecision = pending && pending.warning && !pending.accepted;
  const hasAcceptedPending = pending?.accepted;
  const disabled = Boolean(busy);

  function handleChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPick(file);
  }

  async function handleImageError() {
    if (showPending) return;
    const refreshed = await onSavedImageError();
    if (!refreshed) setBrokenUrl(displayUrl);
  }

  return (
    <div>
      <p id="avatar-label" className="mb-1.5 text-sm font-medium text-ink">
        Ảnh toàn thân
      </p>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-64 overflow-hidden rounded-[2rem] border border-line bg-sand md:mx-0">
        {hasImage ? (
          <img
            key={displayUrl}
            src={displayUrl}
            alt={showPending ? 'Ảnh toàn thân mới chọn (chưa lưu)' : 'Ảnh toàn thân của bạn'}
            onError={handleImageError}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted">
            <PersonIcon width={48} height={48} />
            <p className="text-sm">
              {displayUrl
                ? 'Không tải được ảnh. Bạn có thể chọn ảnh khác.'
                : 'Chưa có ảnh toàn thân'}
            </p>
          </div>
        )}
        {busy && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/80 text-sm font-medium text-ink"
          >
            <span
              aria-hidden="true"
              className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent"
            />
            {busy === 'deleting' ? 'Đang xoá ảnh…' : 'Đang tải ảnh lên…'}
          </div>
        )}
      </div>

      {hasAcceptedPending && !busy && (
        <p className="mt-3 text-center text-sm text-ink-soft md:text-left">
          Ảnh mới chưa được lưu. Bấm &ldquo;Lưu&rdquo; để cập nhật.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        aria-labelledby="avatar-label"
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />

      {awaitingDecision ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="flex gap-2 font-medium">
            <AlertIcon className="mt-0.5 size-5 shrink-0" />
            {pending.warning}
          </p>
          <p className="mt-2">
            Hãy chụp toàn thân: đứng thẳng, thấy từ đầu tới chân, ảnh dọc, nền đơn giản, đủ sáng.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={secondaryBtn}
            >
              Chọn ảnh khác
            </button>
            <button type="button" onClick={onAcceptPending} className={secondaryBtn}>
              Vẫn dùng ảnh này
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={secondaryBtn}
          >
            <CameraIcon className="mr-2 size-5" />
            {savedUrl || pending ? 'Thay ảnh' : 'Chọn ảnh'}
          </button>
          {hasAcceptedPending && (
            <button
              type="button"
              disabled={disabled}
              onClick={onDiscardPending}
              className={secondaryBtn}
            >
              Bỏ ảnh đã chọn
            </button>
          )}
          {!pending && savedUrl && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemoveSaved}
              className={`${secondaryBtn} text-accent-dark`}
            >
              Xoá ảnh
            </button>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700">
          <p>{error.message}</p>
          {error.retryable && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryUpload}
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              Thử lại tải ảnh
            </button>
          )}
        </div>
      )}

      <div
        id="avatar-hint"
        className="mt-4 rounded-2xl bg-blush/50 px-4 py-3 text-sm text-ink-soft"
      >
        <p className="font-medium text-ink">Ảnh chuẩn để thử đồ</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Ảnh toàn thân, thấy từ đầu tới chân</li>
          <li>JPG hoặc PNG, tối đa 5MB</li>
          <li>Ảnh dọc, tỉ lệ 3:4 hoặc 9:16</li>
          <li>Cạnh ngắn từ 720px</li>
        </ul>
      </div>
    </div>
  );
}
