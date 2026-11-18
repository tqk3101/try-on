import { createContext, useContext } from 'react';

/**
 * Giá trị: { cart | null, status: 'idle' | 'loading' | 'ready' | 'error', error, itemCount,
 * refresh({ silent }), applyCart(cart) }. Provider ở features/cart/CartProvider.jsx.
 */
export const CartContext = createContext(null);

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart phải được dùng bên trong <CartProvider>.');
  return value;
}
