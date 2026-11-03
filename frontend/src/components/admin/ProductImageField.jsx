import { useEffect, useId, useRef, useState } from 'react';
import { IMAGE_ACCEPT } from '../../utils/imageFile.js';
import { checkProductImageFile, PRODUCT_IMAGE_MIN_SIDE } from '../../utils/productImageCheck.js';
import { ImageIcon } from '../icons.jsx';

const secondaryBtn =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 px-5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Khối ảnh flat lay (controlled): xem trước, chọn / đổi / bỏ ảnh, kiểm tra phía client.
 * Props:
 *  - value: { file, previewUrl } | null  (ảnh vừa chọn, chưa lưu)
 *  - onChange(value | null): chủ sở hữu `previewUrl` (trang form) phải thu hồi objectURL
 *  - error: string  (lỗi hiển thị dưới khung; do trang truyền, gồm cả lỗi từ server)
 *  - onError(message): lỗi chặn khi chọn file (bỏ file, giữ ảnh đang có); '' để xoá lỗi
 *  - busy: boolean  (đang lưu -> khoá thao tác, hiện lớp phủ)
 *  - inputRef: ref tới nút "Chọn ảnh" để focus khi có lỗi
 *  - current: chế độ sửa. undefined = chế độ thêm; { url: string | null } = ảnh đang lưu (signed URL)
 *  - onCurrentImageError(): URL ảnh hiện tại hết hạn / lỗi tải; trang gọi lại GET một lần
 */
export default function ProductImageField({
  value,
  onChange,
  error,
  onError,
  busy,
  inputRef,
  current,
  onCurrentImageError,
}) {
  const editing = current !== undefined;
  const [brokenUrl, setBrokenUrl] = useState(null);
  const currentUrl = current?.url ?? null;
  const currentBroken = editing && (!currentUrl || currentUrl === brokenUrl);
  const reportedNullRef = useRef(false);
  useEffect(() => {
    // URL ký lỗi ngay từ đầu (null): xin URL mới một lần.
    if (editing && !currentUrl && !reportedNullRef.current) {
      reportedNullRef.current = true;
      onCurrentImageError?.();
    }
  }, [editing, currentUrl, onCurrentImageError]);

  const fileInputRef = useRef(null);
  const checkIdRef = useRef(0);
  const [announcement, setAnnouncement] = useState('');
  const hintId = useId();
  const errorId = useId();

  async function handleChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const checkId = ++checkIdRef.current;
    const result = await checkProductImageFile(file);
    // Người dùng đã chọn file khác trong lúc đọc ảnh: bỏ kết quả cũ.
    if (checkId !== checkIdRef.current) {
      if (result.ok) URL.revokeObjectURL(result.previewUrl);
      return;
    }
    if (!result.ok) {
      onError(result.error);
      setAnnouncement('');
      return;
    }
    onError('');
    onChange({ file, previewUrl: result.previewUrl });
    setAnnouncement('Đã chọn ảnh mới.');
  }

  function handleClear() {
    checkIdRef.current += 1;
    setAnnouncement('Đã bỏ ảnh đã chọn.');
    onChange(null);
  }

  return (
    <div>
      <p id={`${hintId}-label`} className="mb-1.5 text-sm font-medium text-ink">
        Ảnh sản phẩm (flat lay)
      </p>

      <div
        className={`relative mx-auto aspect-[3/4] w-full max-w-64 overflow-hidden rounded-2xl border bg-sand md:mx-0 ${
          value ? 'border-line' : 'border-dashed border-line'
        } ${error ? 'border-red-600' : ''}`}
      >
        {value ? (
          <img
            src={value.previewUrl}
            alt="Ảnh sản phẩm mới chọn (chưa lưu)"
            className="h-full w-full object-contain"
          />
        ) : editing && !currentBroken ? (
          <img
            src={currentUrl}
            alt="Ảnh sản phẩm hiện tại"
            onError={() => {
              setBrokenUrl(currentUrl);
              onCurrentImageError?.();
            }}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted">
            <ImageIcon width={48} height={48} />
            <p className="text-sm">
              {editing
                ? 'Không tải được ảnh hiện tại. Bạn vẫn có thể chọn ảnh mới.'
                : 'Chưa chọn ảnh'}
            </p>
          </div>
        )}
        {busy && value && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/80 text-sm font-medium text-ink"
          >
            <span
              aria-hidden="true"
              className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent"
            />
            Đang tải ảnh lên…
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-labelledby={`${hintId}-label`}
        aria-describedby={`${hintId} ${error ? errorId : ''}`.trim()}
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
        <button
          ref={inputRef}
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          aria-describedby={`${hintId} ${error ? errorId : ''}`.trim()}
          className={secondaryBtn}
        >
          {value ? 'Chọn ảnh khác' : editing ? 'Thay ảnh' : 'Chọn ảnh'}
        </button>
        {value && (
          <button type="button" disabled={busy} onClick={handleClear} className={secondaryBtn}>
            Bỏ ảnh đã chọn
          </button>
        )}
      </div>

      {value && !busy && (
        <p className="mt-3 text-sm text-ink-soft">
          Ảnh mới (chưa lưu). Bấm &ldquo;Lưu sản phẩm&rdquo; để {editing ? 'thay ảnh' : 'thêm'}.
        </p>
      )}
      {editing && !value && !currentBroken && (
        <p className="mt-3 text-sm text-ink-soft">
          Giữ nguyên ảnh hiện tại nếu không chọn ảnh mới.
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p id={hintId} className="mt-3 text-sm text-muted">
        Ảnh trải phẳng, nền trơn, thấy toàn bộ sản phẩm. JPG hoặc PNG, tối đa 5MB, tối thiểu{' '}
        {PRODUCT_IMAGE_MIN_SIDE}×{PRODUCT_IMAGE_MIN_SIDE} px.
      </p>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
