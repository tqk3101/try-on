import { NavLink, Outlet } from 'react-router';
import { PATHS } from '../../routes/paths.js';

const tabClass = ({ isActive }) =>
  `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
    isActive ? 'bg-accent text-white' : 'text-ink hover:bg-ink/5'
  }`;

/** Layout khu vực quản trị: tiêu đề + menu Danh mục / Sản phẩm / Đơn hàng. */
export default function AdminLayout() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Quản trị</h1>
      <nav
        aria-label="Menu quản trị"
        className="-mx-1 mt-3 flex gap-2 overflow-x-auto border-b border-line px-1 pb-4 pt-1"
      >
        <NavLink to={PATHS.adminCategories} className={tabClass}>
          Danh mục
        </NavLink>
        <NavLink to={PATHS.adminProducts} className={tabClass}>
          Sản phẩm
        </NavLink>
        <NavLink to={PATHS.adminOrders} className={tabClass}>
          Đơn hàng
        </NavLink>
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
