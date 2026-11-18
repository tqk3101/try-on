import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { tryOnRoomPath } from '../../routes/paths.js';
import { formatVnd } from '../../utils/format.js';
import { TrashIcon } from '../icons.jsx';
import ProductThumb from '../ProductThumb.jsx';
import QuantityStepper from './QuantityStepper.jsx';

const QUANTITY_DEBOUNCE_MS = 300;

/**
 * Một dòng giỏ hàng (CartItem, cart-and-orders.md mục 2).
 * `onUpdate(productId, quantity)`: gọi API, trả Promise<boolean> (false = lỗi, dòng khôi phục số lượng server).
 * `onRemove(item)`: xoá dòng; `removing`: đang xoá (chặn thao tác, `aria-busy`).
 * Bấm − / + đổi số lượng hiển thị ngay (chỉ là ô nhập tạm), gửi PUT sau 300 ms không bấm thêm; tiền
 * (thành tiền, tổng) luôn lấy từ server nên chỉ đổi khi PUT thành công.
 */
export default function CartLine({ item, maxQuantity = 10, onUpdate, onRemove, removing = false }) {
  const [serverQty, setServerQty] = useState(item.quantity);
  const [qty, setQty] = useState(item.quantity);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  // Server trả số lượng mới (sau PUT/GET): đồng bộ ô hiển thị.
  if (item.quantity !== serverQty) {
    setServerQty(item.quantity);
    setQty(item.quantity);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleChange(next) {
    setQty(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      const ok = await onUpdate(item.productId, next);
      setSaving(false);
      if (!ok) setQty(item.quantity);
    }, QUANTITY_DEBOUNCE_MS);
  }

  const pending = qty !== item.quantity || saving;
  const roomUrl = `${tryOnRoomPath(item.category.id)}?product=${encodeURIComponent(item.productId)}`;

  return (
    <li
      aria-busy={removing || saving}
      className={`flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-opacity ${
        removing ? 'opacity-60' : ''
      }`}
    >
      <Link to={roomUrl} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <ProductThumb src={item.imageUrl} widthClass="w-20 sm:w-24" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={roomUrl}
          className="line-clamp-2 break-words font-semibold text-ink transition-colors hover:text-accent"
        >
          {item.name}
        </Link>
        <p className="mt-1 text-sm text-muted">{item.category.name}</p>
        <p className="mt-1 text-sm tabular-nums text-ink-soft">{formatVnd(item.price)}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <QuantityStepper
            value={qty}
            max={maxQuantity}
            busy={saving || removing}
            label={item.name}
            onChange={handleChange}
          />
          <p className="text-right font-semibold tabular-nums text-ink">
            <span className="sr-only">Thành tiền: </span>
            {formatVnd(item.lineTotal)}
            {pending && <span className="block text-xs font-normal text-muted">Đang cập nhật…</span>}
          </p>
        </div>

        <button
          type="button"
          aria-disabled={removing}
          aria-label={`Xoá ${item.name} khỏi giỏ hàng`}
          onClick={() => {
            if (!removing) onRemove(item);
          }}
          className="-ml-3 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-accent-dark transition-colors hover:bg-blush aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          <TrashIcon width={18} height={18} />
          Xoá
        </button>
      </div>
    </li>
  );
}
