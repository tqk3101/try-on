import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '../../src/components/Pagination.jsx';

describe('Pagination', () => {
  it('ẩn khi chỉ có 1 trang', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('nhiều hơn 5 trang: rút gọn bằng dấu … và đánh dấu trang hiện tại', () => {
    render(<Pagination page={5} totalPages={10} onChange={() => {}} />);
    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Trang 5' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Trang 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang 10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trang 2' })).not.toBeInTheDocument();
  });

  it('gọi onChange khi chọn số/Trước/Sau; bỏ qua ở biên và trang hiện tại', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination page={5} totalPages={10} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Trang 6' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trang 5' }));
    expect(onChange.mock.calls).toEqual([[6], [4], [6]]);

    onChange.mockClear();
    rerender(<Pagination page={1} totalPages={10} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
