import { createBrowserRouter } from 'react-router';
import AuthLayout from '../components/AuthLayout.jsx';
import MainLayout from '../components/MainLayout.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import AppRoot from './AppRoot.jsx';
import { GuestOnly, RequireAuth } from './guards.jsx';
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
            children: [{ path: PATHS.profile, Component: ProfilePage }],
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]);

export default router;
