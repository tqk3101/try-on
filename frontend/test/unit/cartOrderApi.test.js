import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const { apiClient } = await import('../../src/services/apiClient.js');
const { addCartItem, removeCartItem, updateCartItem } = await import('../../src/services/cartApi.js');
const { adminListOrders } = await import('../../src/services/adminApi.js');

beforeEach(() => vi.clearAllMocks());

describe('cartApi', () => {
  it('addCartItem: created=true khi dòng mới, false khi cộng dồn', async () => {
    apiClient.post.mockResolvedValueOnce({ cart: {}, item: { quantity: 1 } });
    expect((await addCartItem('p1')).created).toBe(true);
    apiClient.post.mockResolvedValueOnce({ cart: {}, item: { quantity: 2 } });
    expect((await addCartItem('p1')).created).toBe(false);
    expect(apiClient.post).toHaveBeenCalledWith('/cart/items', { productId: 'p1', quantity: 1 });
  });

  it('update/remove dùng đường dẫn đã encode', async () => {
    await updateCartItem('a b', 3);
    expect(apiClient.put).toHaveBeenCalledWith('/cart/items/a%20b', { quantity: 3 });
    await removeCartItem('a b');
    expect(apiClient.delete).toHaveBeenCalledWith('/cart/items/a%20b');
  });
});

describe('adminListOrders', () => {
  it('query chỉ gồm tham số có giá trị', async () => {
    await adminListOrders({ page: 2, pageSize: 20 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/orders?page=2&pageSize=20', { signal: undefined });
    await adminListOrders({ status: 'pending', page: 1 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/orders?status=pending&page=1', { signal: undefined });
    await adminListOrders();
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/orders', { signal: undefined });
  });
});
