import { createContext, useContext } from 'react';

/**
 * Giá trị: { status: 'checking' | 'authenticated' | 'guest' | 'error', user, login, logout, retry, updateUser }.
 * Provider nằm ở auth/AuthProvider.jsx.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải được dùng bên trong <AuthProvider>.');
  return value;
}
