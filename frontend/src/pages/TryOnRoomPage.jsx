import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useToast } from '../components/toastContext.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { GridIcon } from '../components/icons.jsx';
import ConsentDialog from '../components/tryOn/ConsentDialog.jsx';
import ProductPanel from '../components/tryOn/ProductPanel.jsx';
import ProfileGate from '../components/tryOn/ProfileGate.jsx';
import TryOnStage from '../components/tryOn/TryOnStage.jsx';
import { useSwipe } from '../features/tryOn/useSwipe.js';
import { useTryOnAccess } from '../features/tryOn/useTryOnAccess.js';
import { useTryOnRoom } from '../features/tryOn/useTryOnRoom.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { PATHS } from '../routes/paths.js';
import { formatVnd } from '../utils/format.js';

function RoomSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải phòng thử đồ…</span>
      <div
        aria-hidden="true"
        className="grid animate-pulse gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]"
      >
        <div className="mx-auto aspect-[3/4] w-full max-w-md rounded-[2rem] bg-sand" />
        <div className="space-y-4">
          <div className="h-5 w-40 rounded bg-sand" />
          <div className="h-9 w-56 rounded bg-sand" />
          <div className="h-28 rounded-2xl bg-sand" />
        </div>
      </div>
    </div>
  );
}

function liveMessage({ product, index, total, entry }) {
  const base = `Sản phẩm ${index + 1} trên ${total}: ${product.name}, ${formatVnd(product.price)}.`;
  const kind = entry?.kind ?? 'processing';
  if (kind === 'succeeded') return `${base} Đã tạo xong ảnh.`;
  if (kind === 'failed') return `${base} ${entry.error.message}`;
  if (kind === 'quota') return `${base} Đã hết lượt thử đồ hôm nay.`;
  return `${base} Đang thử đồ ${product.name}…`;
}

/** Phòng thử đồ của một danh mục. Chỉ mount khi hồ sơ đủ và đã đồng ý (xem TryOnRoomPage). */
function TryOnRoom({ categoryId, access }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const room = useTryOnRoom({
    categoryId,
    onProfileIncomplete: access.markProfileIncomplete,
    onConsentRequired: access.markConsentMissing,
  });
  const { list, current, index, total, entry } = room;
  useDocumentTitle(list.category ? `Thử đồ: ${list.category.name}` : 'Phòng thử đồ');

  const swipe = useSwipe({ onNext: room.goNext, onPrev: room.goPrev });

  useEffect(() => {
    if (list.status === 'notfound') {
      showToast('Danh mục không còn tồn tại.', { tone: 'error' });
      navigate(PATHS.tryOn, { replace: true });
    }
  }, [list.status, navigate, showToast]);

  function handleKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      room.goNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      room.goPrev();
    }
  }

  if (list.status === 'loading' || list.status === 'notfound') return <RoomSkeleton />;
  if (list.status === 'error') {
    return (
      <ErrorState title="Không tải được sản phẩm" message={list.error} onRetry={room.reloadList} />
    );
  }
  if (list.status === 'empty') {
    return (
      <EmptyState
        icon={<GridIcon />}
        title="Danh mục này chưa có sản phẩm"
        description="Hãy chọn danh mục khác để tiếp tục thử đồ."
        action={
          <Link
            to={PATHS.tryOn}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Chọn danh mục khác
          </Link>
        }
      />
    );
  }

  return (
    <section aria-label={`Phòng thử đồ: ${list.category.name}`} onKeyDown={handleKeyDown}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage({ product: current, index, total, entry })}
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr] lg:gap-12">
        <TryOnStage
          product={current}
          entry={entry}
          avatarUrl={access.profile?.avatarUrl}
          canPrev={index > 0}
          canNext={index < total - 1}
          onPrev={room.goPrev}
          onNext={room.goNext}
          onRetry={room.retry}
          onImageError={room.onImageError}
          swipe={swipe}
        />
        <ProductPanel
          category={list.category}
          product={current}
          index={index}
          total={total}
          quota={room.quota}
          products={room.products}
          onSelect={room.goTo}
        />
      </div>
    </section>
  );
}

/** /try-on/:categoryId — kiểm tra hồ sơ + đồng ý rồi mới vào phòng thử đồ. */
export default function TryOnRoomPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const access = useTryOnAccess();
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState('');
  useDocumentTitle('Phòng thử đồ');

  async function handleAgree() {
    setConsentBusy(true);
    setConsentError('');
    try {
      await access.giveConsent();
    } catch (error) {
      setConsentError(error.message || 'Không thể lưu lựa chọn. Vui lòng thử lại.');
    } finally {
      setConsentBusy(false);
    }
  }

  if (access.status === 'loading') return <RoomSkeleton />;
  if (access.status === 'error') {
    return (
      <ErrorState title="Không tải được hồ sơ" message={access.error} onRetry={access.reload} />
    );
  }
  if (!access.complete) return <ProfileGate missing={access.missing} />;
  if (!access.hasConsent) {
    return (
      <>
        <RoomSkeleton />
        <ConsentDialog
          open
          busy={consentBusy}
          error={consentError}
          onAgree={handleAgree}
          onLater={() => navigate(PATHS.tryOn, { replace: true })}
        />
      </>
    );
  }
  return <TryOnRoom key={categoryId} categoryId={categoryId} access={access} />;
}
