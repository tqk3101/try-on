import { NavLink, Outlet } from 'react-router';
import { PATHS } from '../../routes/paths.js';

const tabClass = ({ isActive }) =>
  `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
    isActive ? 'bg-accent text-white' : 'text-ink hover:bg-ink/5'
  }`;

/** Layout khu vực quản trị: tiêu đề + menu Danh mục / Sản phẩm. */
export default function AdminLayout() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Quản trị</h1>
      <nav aria-label="Menu quản trị" className="mt-4 flex gap-2 border-b border-line pb-4">
        <NavLink to={PATHS.adminCategories} className={tabClass}>
          Danh mục
        </NavLink>
        <NavLink to={PATHS.adminProducts} className={tabClass}>
          Sản phẩm
        </NavLink>
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
