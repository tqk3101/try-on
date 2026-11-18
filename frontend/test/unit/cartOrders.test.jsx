import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuantityStepper from '../../src/components/cart/QuantityStepper.jsx';
import { formatBadgeCount } from '../../src/components/cart/formatBadgeCount.js';
import { validateCheckoutForm } from '../../src/features/orders/checkoutValidation.js';
import { pageWindow } from '../../src/utils/pagination.js';

describe('validateCheckoutForm', () => {
  const ok = { recipientName: '  Lan   Anh ', phone: '+84 912 345 678', shippingAddress: '12 Lê Lợi, Quận 1', note: ' ' };
  it('chuẩn hoá và chấp nhận dữ liệu hợp lệ', () => {
    const { errors, payload } = validateCheckoutForm(ok);
    expect(errors).toEqual({});
    expect(payload).toEqual({ recipientName: 'Lan Anh', phone: '0912345678', shippingAddress: '12 Lê Lợi, Quận 1', note: null });
  });
  it('báo lỗi từng ô', () => {
    const { errors } = validateCheckoutForm({ recipientName: '', phone: '123', shippingAddress: 'ngắn', note: 'x'.repeat(501) });
    expect(Object.keys(errors)).toEqual(['recipientName', 'phone', 'shippingAddress', 'note']);
  });
  it('SĐT bắt buộc', () => {
    expect(validateCheckoutForm({ ...ok, phone: '' }).errors.phone).toMatch(/nhập số điện thoại/);
  });
});

describe('QuantityStepper', () => {
  it('không gọi onChange ở biên và dùng aria-disabled', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} label="Váy" />);
    const minus = screen.getByRole('button', { name: /Giảm số lượng Váy/ });
    expect(minus).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(minus);
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Tăng số lượng Váy/ }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
  it('chặn ở 10', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={10} onChange={onChange} label="Váy" />);
    await userEvent.click(screen.getByRole('button', { name: /Tăng số lượng Váy/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('pageWindow / badge', () => {
  it('rút gọn dãy trang', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
  });
  it('badge 99+', () => {
    expect(formatBadgeCount(5)).toBe('5');
    expect(formatBadgeCount(120)).toBe('99+');
  });
});
