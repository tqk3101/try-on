import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { CHECKOUT_FIELD_ORDER, validateCheckoutForm } from '../../features/orders/checkoutValidation.js';
import { PATHS } from '../../routes/paths.js';
import { formatVnd } from '../../utils/format.js';
import { CheckIcon } from '../icons.jsx';
import ProductThumb from '../ProductThumb.jsx';
import TextAreaField from '../TextAreaField.jsx';
import TextField from '../TextField.jsx';

const FORM_ID = 'checkout-form';

/**
 * Form đặt hàng + tóm tắt đơn (US-10). Giữ giá trị ô nhập khi giỏ đổi (CART_CHANGED) vì `cart` chỉ là prop.
 * `initialValues`: { recipientName, phone } điền sẵn từ hồ sơ. `onSubmit(payload)` trả Promise<{
 * fieldErrors?: { tênTrường: message }, formError?: string }> (rỗng = thành công, trang tự điều hướng).
 * `notice`: banner `role="alert"` do trang quản lý (vd. CART_CHANGED). Nút "Xác nhận đặt hàng" nằm trong
 * tóm tắt (cuối trang trên mobile) nhưng thuộc form qua thuộc tính `form`.
 */
export default function CheckoutForm({ cart, initialValues, notice, onSubmit }) {
  const [values, setValues] = useState({
    recipientName: initialValues.recipientName ?? '',
    phone: initialValues.phone ?? '',
    shippingAddress: '',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const setValue = (name) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  function focusFirstError(nextErrors) {
    const first = CHECKOUT_FIELD_ORDER.find((name) => nextErrors[name]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const { errors: found, payload } = validateCheckoutForm(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(payload);
    setSubmitting(false);
    if (result?.fieldErrors) {
      setErrors(result.fieldErrors);
      focusFirstError(result.fieldErrors);
    }
    if (result?.formError) setFormError(result.formError);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <form
        id={FORM_ID}
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 className="font-display text-xl font-semibold text-ink">Thông tin giao hàng</h2>
        <TextField
          label="Họ tên người nhận"
          name="recipientName"
          autoComplete="name"
          value={values.recipientName}
          onChange={setValue('recipientName')}
          error={errors.recipientName}
          disabled={submitting}
        />
        <TextField
          label="Số điện thoại"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912345678"
          value={values.phone}
          onChange={setValue('phone')}
          error={errors.phone}
          disabled={submitting}
        />
        <TextAreaField
          label="Địa chỉ giao hàng"
          name="shippingAddress"
          autoComplete="street-address"
          rows={3}
          hint="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành."
          value={values.shippingAddress}
          onChange={setValue('shippingAddress')}
          error={errors.shippingAddress}
          disabled={submitting}
        />
        <TextAreaField
          label="Ghi chú (tuỳ chọn)"
          name="note"
          rows={2}
          value={values.note}
          onChange={setValue('note')}
          error={errors.note}
          disabled={submitting}
        />

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-ink">Thanh toán</legend>
          <div className="flex items-start gap-3 rounded-2xl border-2 border-accent bg-blush/40 p-4">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-white"
            >
              <CheckIcon width={16} height={16} />
            </span>
            <div>
              <p className="font-semibold text-ink">Thanh toán khi nhận hàng (COD)</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Bạn trả tiền mặt cho người giao hàng. Hiện chưa hỗ trợ thanh toán trực tuyến.
              </p>
            </div>
          </div>
        </fieldset>
      </form>

      <aside
        aria-label="Tóm tắt đơn hàng"
        className="rounded-3xl bg-surface p-6 shadow-card lg:sticky lg:top-6"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">Đơn hàng</h2>
          <Link
            to={PATHS.cart}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4"
          >
            Sửa giỏ hàng
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex gap-3 py-3">
              <ProductThumb src={item.imageUrl} widthClass="w-12" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-sm font-semibold text-ink">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted">
                  {formatVnd(item.price)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-ink">
                {formatVnd(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>
        <p
          aria-live="polite"
          className="flex items-baseline justify-between border-t border-line pt-4 text-ink"
        >
          <span className="font-semibold">Tổng tiền ({cart.itemCount} sản phẩm)</span>
          <span className="text-xl font-semibold tabular-nums">{formatVnd(cart.total)}</span>
        </p>
        <p className="mt-2 text-xs text-muted">Chưa gồm phí vận chuyển.</p>

        {notice && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-gold bg-sand px-4 py-3 text-sm text-ink"
          >
            {notice}
          </p>
        )}
        {formError && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          form={FORM_ID}
          aria-disabled={submitting}
          aria-busy={submitting}
          onClick={(event) => {
            if (submitting) event.preventDefault();
          }}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark aria-disabled:cursor-wait aria-disabled:opacity-70 aria-disabled:hover:bg-accent"
        >
          {submitting ? 'Đang đặt hàng…' : 'Xác nhận đặt hàng'}
        </button>
      </aside>
    </div>
  );
}
