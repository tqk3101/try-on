import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../src/auth/authContext.js';
import Categories from '../../src/components/landing/Categories.jsx';

vi.mock('../../src/services/categoryApi.js', () => ({ fetchCategories: vi.fn() }));
const { fetchCategories } = await import('../../src/services/categoryApi.js');

function renderCategories(auth) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const hrefs = () => screen.getAllByRole('link').map((a) => a.getAttribute('href'));
const member = { status: 'authenticated', user: { id: 'u1' } };

describe('Landing: thẻ danh mục', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guest: thẻ mock dẫn /try-on và KHÔNG gọi API', () => {
    renderCategories({ status: 'guest', user: null });
    expect(hrefs()).toEqual(['/try-on', '/try-on', '/try-on']);
    expect(fetchCategories).not.toHaveBeenCalled();
  });

  it('đang kiểm tra phiên: chưa gọi API', () => {
    renderCategories({ status: 'checking', user: null });
    expect(fetchCategories).not.toHaveBeenCalled();
  });

  it('đã đăng nhập: dẫn tới /try-on/:categoryId thật, giữ hint theo tên', async () => {
    fetchCategories.mockResolvedValue({
      categories: [
        { id: 'c-1', name: 'Áo thun', slug: 'ao-thun' },
        { id: 'c 2', name: 'Phụ kiện', slug: 'phu-kien' },
      ],
    });
    renderCategories(member);
    await waitFor(() => expect(hrefs()).toEqual(['/try-on/c-1', '/try-on/c%202']));
    expect(fetchCategories).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Basic đến oversize')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Phụ kiện/ })).toBeInTheDocument();
  });

  it('đã đăng nhập nhưng API lỗi: giữ thẻ mock dẫn /try-on', async () => {
    fetchCategories.mockRejectedValue(new Error('boom'));
    renderCategories(member);
    await waitFor(() => expect(fetchCategories).toHaveBeenCalled());
    expect(hrefs()).toEqual(['/try-on', '/try-on', '/try-on']);
  });

  it('đã đăng nhập nhưng danh mục rỗng: giữ thẻ mock', async () => {
    fetchCategories.mockResolvedValue({ categories: [] });
    renderCategories(member);
    await waitFor(() => expect(fetchCategories).toHaveBeenCalled());
    expect(hrefs()).toEqual(['/try-on', '/try-on', '/try-on']);
  });
});
