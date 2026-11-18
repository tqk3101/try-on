import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../../routes/paths.js';
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons.jsx';

const arrowClass =
  'inline-flex size-11 items-center justify-center rounded-full bg-surface/85 text-ink shadow-card backdrop-blur transition hover:bg-surface hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100';

/** Bộ đếm giây của ảnh đang tạo. Cố ý không phải live region (tránh trình đọc màn hình đọc mỗi giây). */
function ElapsedSeconds({ since }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    // `since` chưa có (đang chờ debounce, chưa có entry): đếm từ lúc khung này hiện ra.
    const start = since ?? Date.now();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [since]);
  return (
    <span aria-hidden="true" className="tabular-nums">
      {seconds} giây
    </span>
  );
}

function CreatingLayer({ product, avatarUrl, since }) {
  return (
    <div className="absolute inset-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          draggable={false}
          className="size-full scale-110 object-cover opacity-60 blur-xl"
        />
      ) : (
        <div className="size-full animate-pulse bg-sand" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-canvas/70 via-canvas/20 to-transparent px-14 text-center">
        <div className="relative">
          <div className="w-24 rounded-2xl bg-surface p-1.5 shadow-card sm:w-28">
            <img
              src={product.imageUrl}
              alt=""
              draggable={false}
              className="aspect-[3/4] w-full rounded-xl bg-canvas object-contain"
            />
          </div>
          <span
            aria-hidden="true"
            className="absolute -right-3 -top-3 size-8 animate-spin rounded-full border-[3px] border-surface border-t-accent"
          />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-snug text-ink">
            Đang thử đồ {product.name}…
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            <ElapsedSeconds since={since} />
          </p>
          <p className="mx-auto mt-2 max-w-52 text-xs text-ink-soft">
            Có thể mất vài giây đến nửa phút. Bạn vẫn có thể xem sản phẩm khác trong lúc chờ.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageLayer({ product, title, message, children }) {
  return (
    <div className="absolute inset-0">
      <img
        src={product.imageUrl}
        alt=""
        draggable={false}
        className="size-full object-contain opacity-25 blur-sm"
      />
      <div className="absolute inset-0 flex items-center justify-center px-14">
        <div
          role="alert"
          className="w-full rounded-2xl border border-red-200 bg-red-50/95 p-5 text-center shadow-card"
        >
          <AlertIcon className="mx-auto text-accent-dark" width={28} height={28} />
          <p className="mt-2 font-display text-lg font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {children && <div className="mt-4 flex flex-col items-center gap-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

const outlineBtn =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 bg-surface px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5';

/**
 * Khung ảnh thử đồ 3:4 (không méo/cắt: object-contain) cùng mũi tên nổi hai bên.
 * Trạng thái theo `entry` (xem useTryOnRoom): chưa có entry hoặc 'processing' = đang tạo (hiện ngay khi chuyển
 * sản phẩm, Q15), 'succeeded' = ảnh (nhãn "Ảnh mô phỏng" nếu `tryOn.simulated`), 'failed' = lỗi + Thử lại,
 * 'quota' = hết lượt. Mũi tên luôn bấm được (trừ đầu/cuối danh sách).
 * `swipe`: handlers từ useSwipe. TODO(US-07, Sprint 4): nút "Thêm vào giỏ" nằm ở ProductPanel, không phải ở đây.
 */
export default function TryOnStage({
  product,
  entry,
  avatarUrl,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onRetry,
  onImageError,
  swipe,
}) {
  const kind = entry?.kind ?? 'processing';
  const frameRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  // Nút nào vừa giữ focus (trình duyệt có thể không báo blur khi nút bị disabled).
  const lastFocusedRef = useRef(null);

  // Nút đang focus bị disabled (tới cuối/đầu danh sách) -> focus rơi về body và phím ←/→ ngừng hoạt động
  // (onKeyDown nằm trên vùng phòng thử đồ). Chuyển focus về khung ảnh để vẫn đi tiếp/lùi bằng bàn phím.
  useEffect(() => {
    const active = document.activeElement;
    const lost = (button) =>
      button &&
      button.disabled &&
      (active === button || (active === document.body && lastFocusedRef.current === button));
    if (lost(prevRef.current) || lost(nextRef.current)) {
      lastFocusedRef.current = null;
      frameRef.current?.focus();
    }
  }, [canPrev, canNext]);

  const trackFocus = {
    onFocus: (event) => {
      lastFocusedRef.current = event.currentTarget;
    },
    onBlur: () => {
      lastFocusedRef.current = null;
    },
  };

  return (
    <div
      ref={frameRef}
      role="group"
      tabIndex={0}
      aria-label="Ảnh thử đồ. Dùng phím mũi tên trái hoặc phải để đổi sản phẩm."
      className="relative mx-auto aspect-[3/4] w-full max-w-md touch-pan-y select-none overflow-hidden rounded-[2rem] bg-sand shadow-card focus-visible:outline-offset-4"
      {...swipe}
    >
      {kind === 'succeeded' && (
        <>
          <img
            key={`${entry.tryOn.id}:${entry.tryOn.imageUrl}`}
            src={entry.tryOn.imageUrl}
            alt={`Bạn mặc ${product.name}`}
            draggable={false}
            onError={onImageError}
            className="absolute inset-0 size-full animate-fade-in object-contain"
          />
          {entry.tryOn.simulated && (
            <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Ảnh mô phỏng
            </span>
          )}
        </>
      )}

      {kind === 'processing' && (
        <CreatingLayer
          key={product.id}
          product={product}
          avatarUrl={avatarUrl}
          since={entry?.startedAt}
        />
      )}

      {kind === 'failed' && (
        <MessageLayer product={product} title="Chưa có ảnh thử đồ" message={entry.error.message}>
          <button type="button" onClick={onRetry} className={outlineBtn}>
            Thử lại
          </button>
          {entry.error.code === 'INPUT_REJECTED' && (
            <Link
              to={PATHS.profile}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4 hover:text-accent-dark"
            >
              Đổi ảnh toàn thân
            </Link>
          )}
        </MessageLayer>
      )}

      {kind === 'quota' && (
        <MessageLayer
          product={product}
          title="Đã hết lượt thử đồ hôm nay"
          message="Lượt thử mới có lại từ 00:00 ngày mai (giờ Việt Nam). Bạn vẫn xem được các sản phẩm và ảnh đã tạo."
        />
      )}

      <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
        <button
          ref={prevRef}
          type="button"
          {...trackFocus}
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Sản phẩm trước"
          className={`${arrowClass} pointer-events-auto`}
        >
          <ArrowLeftIcon />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <button
          ref={nextRef}
          type="button"
          {...trackFocus}
          onClick={onNext}
          disabled={!canNext}
          aria-label="Sản phẩm tiếp theo"
          className={`${arrowClass} pointer-events-auto`}
        >
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}
