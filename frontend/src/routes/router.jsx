import { createBrowserRouter, Navigate } from 'react-router';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import MainLayout from '../components/MainLayout.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage.jsx';
import AdminProductFormPage from '../pages/admin/AdminProductFormPage.jsx';
import AdminProductsPage from '../pages/admin/AdminProductsPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import TryOnCategoriesPage from '../pages/TryOnCategoriesPage.jsx';
import TryOnRoomPage from '../pages/TryOnRoomPage.jsx';
import AppRoot from './AppRoot.jsx';
import { GuestOnly, RequireAdmin, RequireAuth } from './guards.jsx';
import { PATHS } from './paths.js';

const router = createBrowserRouter([
  {
    // Route gốc: AuthProvider + toast bao toàn bộ cây.
    Component: AppRoot,
    children: [
      // Landing có header/footer riêng nên đứng ngoài MainLayout.
      { path: PATHS.home, Component: LandingPage },
      {
        Component: GuestOnly,
        children: [
          {
            Component: AuthLayout,
            children: [
              { path: PATHS.login, Component: LoginPage },
              { path: PATHS.register, Component: RegisterPage },
            ],
          },
        ],
      },
      {
        Component: MainLayout,
        children: [
          {
            Component: RequireAuth,
            children: [
              { path: PATHS.profile, Component: ProfilePage },
              { path: PATHS.tryOn, Component: TryOnCategoriesPage },
              { path: PATHS.tryOnRoom, Component: TryOnRoomPage },
              {
                Component: RequireAdmin,
                children: [
                  {
                    path: PATHS.admin,
                    Component: AdminLayout,
                    children: [
                      { index: true, element: <Navigate to={PATHS.adminCategories} replace /> },
                      {
                        path: 'categories',
                        Component: AdminCategoriesPage,
                      },
                      { path: 'products', Component: AdminProductsPage },
                      { path: 'products/new', Component: AdminProductFormPage },
                      { path: 'products/:id/edit', Component: AdminProductFormPage },
                    ],
                  },
                ],
              },
            ],
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]);

export default router;
