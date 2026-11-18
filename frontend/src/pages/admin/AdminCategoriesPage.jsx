import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import CategoryFormDialog from '../../components/admin/CategoryFormDialog.jsx';
import CategoryList from '../../components/admin/CategoryList.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { FolderIcon, PlusIcon } from '../../components/icons.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../components/toastContext.js';
import { PATHS } from '../../routes/paths.js';
import { deleteAdminCategory, fetchAdminCategories } from '../../services/adminApi.js';
import ForbiddenPage from '../ForbiddenPage.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const NOT_FOUND_MESSAGE = 'Danh mục không còn tồn tại.';
const HIGHLIGHT_MS = 1500;

function ListSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-3">
      <span className="sr-only">Đang tải danh mục…</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} aria-hidden="true" className="h-16 rounded-2xl bg-sand" />
      ))}
    </div>
  );
}

/** Trang /admin/categories: danh sách, thêm, sửa, xoá danh mục (US-03). */
export default function AdminCategoriesPage() {
  useDocumentTitle('Quản lý danh mục');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [status, setStatus] = useState('loading'); // loading | ready | error | forbidden
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ open: false, key: 0, category: null });
  const [remove, setRemove] = useState({ open: false, category: null, busy: false });
  const [highlightId, setHighlightId] = useState(null);
  const headingRef = useRef(null);
  const requestIdRef = useRef(0);
  const highlightTimerRef = useRef(null);
  const focusHeadingAfterCloseRef = useRef(false);

  // `silent`: tải lại nền (sau 404/409) mà không thay danh sách bằng skeleton.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current;
      if (!silent) setStatus('loading');
      try {
        const data = await fetchAdminCategories();
        if (requestId !== requestIdRef.current) return;
        setCategories(data.categories);
        setStatus('ready');
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        if (error.status === 401) return; // apiClient đã xử lý phiên hết hạn
        if (error.status === 403) {
          setStatus('forbidden');
          return;
        }
        if (silent) {
          // Tải lại nền thất bại: giữ danh sách đang có, chỉ báo bằng toast.
          showToast(error.message, { tone: 'error' });
        } else {
          setLoadError(error.message);
          setStatus('error');
        }
      }
    },
    [showToast],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi vào trang
    load();
    return () => {
      requestIdRef.current += 1;
      clearTimeout(highlightTimerRef.current);
    };
  }, [load]);

  // Hộp thoại đã đóng (focus đã được trả xong) thì đưa focus về h2 như screens.md.
  useEffect(() => {
    if (remove.open || !focusHeadingAfterCloseRef.current) return;
    focusHeadingAfterCloseRef.current = false;
    headingRef.current?.focus();
  }, [remove.open]);

  function flash(id) {
    clearTimeout(highlightTimerRef.current);
    setHighlightId(id);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }

  const openForm = (category = null) =>
    setForm((prev) => ({ open: true, key: prev.key + 1, category }));
  const closeForm = () => setForm((prev) => ({ ...prev, open: false }));

  function handleSaved(saved, mode) {
    setCategories((prev) =>
      mode === 'create'
        ? [...prev, saved]
        : prev.map((item) => (item.id === saved.id ? saved : item)),
    );
    closeForm();
    flash(saved.id);
    showToast('Đã lưu danh mục.');
  }

  function handleFormNotFound() {
    closeForm();
    showToast(NOT_FOUND_MESSAGE, { tone: 'error' });
    load({ silent: true });
  }

  const closeRemove = () => setRemove((prev) => ({ ...prev, open: false }));

  async function handleConfirmRemove() {
    const target = remove.category;
    if (remove.busy || !target) return;
    // Còn sản phẩm: hộp thoại chỉ thông báo, nút xác nhận dẫn tới danh sách sản phẩm.
    if (target.productCount > 0) {
      navigate(`${PATHS.adminProducts}?categoryId=${encodeURIComponent(target.id)}`);
      return;
    }
    setRemove((prev) => ({ ...prev, busy: true }));
    try {
      await deleteAdminCategory(target.id);
      setCategories((prev) => prev.filter((item) => item.id !== target.id));
      setRemove({ open: false, category: target, busy: false });
      showToast('Đã xoá danh mục.');
      // Không focus ngay: hộp thoại còn mở và khi đóng sẽ trả focus về nút Xoá (đã bị gỡ) -> body.
      focusHeadingAfterCloseRef.current = true;
    } catch (error) {
      setRemove({ open: false, category: target, busy: false });
      if (error.status === 401) return;
      if (error.code === 'CATEGORY_NOT_EMPTY') {
        showToast(error.message, { tone: 'error' });
        load({ silent: true });
      } else if (error.code === 'CATEGORY_NOT_FOUND') {
        showToast(NOT_FOUND_MESSAGE, { tone: 'error' });
        load({ silent: true });
      } else {
        showToast(error.message, { tone: 'error' });
      }
    }
  }

  if (status === 'forbidden') return <ForbiddenPage />;

  const target = remove.category;
  const blocked = (target?.productCount ?? 0) > 0;
  const addButton = (
    <button
      type="button"
      onClick={() => openForm()}
      disabled={status === 'loading'}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <PlusIcon width={18} height={18} />
      Thêm danh mục
    </button>
  );

  return (
    <section aria-labelledby="admin-categories-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="admin-categories-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-ink focus:outline-none"
          >
            Danh mục
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Quản lý các danh mục quần áo hiển thị trong phòng thử đồ.
          </p>
        </div>
        {addButton}
      </div>

      <div className="mt-6">
        {status === 'loading' && <ListSkeleton />}
        {status === 'error' && (
          <ErrorState title="Không tải được danh mục" message={loadError} onRetry={() => load()} />
        )}
        {status === 'ready' && categories.length === 0 && (
          <EmptyState
            icon={<FolderIcon />}
            title="Chưa có danh mục nào"
            description="Tạo danh mục đầu tiên để bắt đầu thêm sản phẩm."
            action={addButton}
          />
        )}
        {status === 'ready' && categories.length > 0 && (
          <CategoryList
            categories={categories}
            highlightId={highlightId}
            onEdit={(category) => openForm(category)}
            onDelete={(category) => setRemove({ open: true, category, busy: false })}
          />
        )}
      </div>

      <CategoryFormDialog
        key={form.key}
        open={form.open}
        category={form.category}
        onClose={closeForm}
        onSaved={handleSaved}
        onNotFound={handleFormNotFound}
      />

      <ConfirmDialog
        open={remove.open}
        title={blocked ? 'Không thể xoá danh mục' : 'Xoá danh mục?'}
        description={
          blocked
            ? `Danh mục “${target.name}” còn ${target.productCount} sản phẩm. Hãy xoá hoặc chuyển các sản phẩm sang danh mục khác trước khi xoá.`
            : `Xoá danh mục “${target?.name ?? ''}”? Thao tác này không thể hoàn tác.`
        }
        confirmLabel={blocked ? 'Xem sản phẩm' : 'Xoá danh mục'}
        cancelLabel={blocked ? 'Đóng' : 'Huỷ'}
        confirmTone={blocked ? 'primary' : 'danger'}
        busy={remove.busy}
        busyLabel="Đang xoá…"
        onConfirm={handleConfirmRemove}
        onCancel={closeRemove}
      />
    </section>
  );
}
