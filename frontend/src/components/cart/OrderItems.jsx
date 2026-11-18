import { formatVnd } from '../../utils/format.js';
import ProductThumb from '../ProductThumb.jsx';

const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';

function Discontinued() {
  return (
    <span className="mt-1 inline-flex rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
      Sản phẩm đã ngừng bán
    </span>
  );
}

/**
 * Các dòng của một đơn (OrderItem: snapshot tên/danh mục/đơn giá lúc đặt) + tổng tiền.
 * Bảng từ `sm`, thẻ trên mobile. `productId = null` (sản phẩm đã bị xoá) -> ô ảnh giữ chỗ + nhãn có chữ.
 */
export default function OrderItems({ items, itemCount, total }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl bg-surface shadow-card sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Sản phẩm trong đơn hàng</caption>
          <thead className="bg-canvas">
            <tr>
              <th scope="col" className={`${th} w-24`}>
                Ảnh
              </th>
              <th scope="col" className={th}>
                Sản phẩm
              </th>
              <th scope="col" className={`${th} text-right`}>
                Đơn giá
              </th>
              <th scope="col" className={`${th} text-right`}>
                SL
              </th>
              <th scope="col" className={`${th} text-right`}>
                Thành tiền
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.productId ?? 'deleted'}-${index}`} className="border-t border-line">
                <td className="px-4 py-3">
                  <ProductThumb src={item.imageUrl} widthClass="w-14" />
                </td>
                <td className="break-words px-4 py-3">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-sm text-muted">{item.categoryName}</p>
                  {item.productId === null && <Discontinued />}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                  {formatVnd(item.unitPrice)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{item.quantity}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-ink">
                  {formatVnd(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas">
              <th scope="row" colSpan={3} className="px-4 py-4 text-left font-semibold text-ink">
                Tổng tiền
              </th>
              <td className="px-4 py-4 text-right tabular-nums text-ink-soft">{itemCount}</td>
              <td className="whitespace-nowrap px-4 py-4 text-right text-lg font-semibold tabular-nums text-ink">
                {formatVnd(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="sm:hidden">
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={`${item.productId ?? 'deleted'}-${index}`}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <ProductThumb src={item.imageUrl} widthClass="w-16" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words font-semibold text-ink">{item.name}</p>
                <p className="text-sm text-muted">{item.categoryName}</p>
                {item.productId === null && <Discontinued />}
                <p className="mt-2 text-sm tabular-nums text-ink-soft">
                  {formatVnd(item.unitPrice)} × {item.quantity}
                </p>
                <p className="font-semibold tabular-nums text-ink">{formatVnd(item.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-baseline justify-between rounded-2xl bg-surface p-4 text-ink shadow-card">
          <span className="font-semibold">Tổng tiền ({itemCount} sản phẩm)</span>
          <span className="text-lg font-semibold tabular-nums">{formatVnd(total)}</span>
        </p>
      </div>
    </>
  );
}
