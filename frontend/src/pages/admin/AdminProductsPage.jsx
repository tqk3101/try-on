import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import ProductList from '../../components/admin/ProductList.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { FolderIcon, ImageIcon, PlusIcon } from '../../components/icons.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SelectField from '../../components/SelectField.jsx';
import { useToast } from '../../components/toastContext.js';
import { adminProductEditPath, PATHS, withCategoryFilter } from '../../routes/paths.js';
import {
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminProducts,
} from '../../services/adminApi.js';
import ForbiddenPage from '../ForbiddenPage.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

function ListSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-3">
      <span className="sr-only">Đang tải sản phẩm…</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} aria-hidden="true" className="flex gap-4 rounded-2xl bg-surface p-4">
          <div className="aspect-[3/4] w-14 rounded-xl bg-sand" />
          <div className="flex-1 space-y-2 py-2">
            <div className="h-4 w-2/3 rounded bg-sand" />
            <div className="h-4 w-1/4 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

const NOT_FOUND_MESSAGE = 'Sản phẩm không còn tồn tại.';

const buttonClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark sm:w-auto';
const outlineClass =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5';

/** Trang /admin/products: danh sách sản phẩm, lọc theo danh mục (query ?categoryId=). */
export default function AdminProductsPage() {
  useDocumentTitle('Quản lý sản phẩm');
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId') ?? '';

  const [phase, setPhase] = useState('loading'); // loading | ready | error | forbidden
  const [loadError, setLoadError] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const categoriesLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const refreshedRef = useRef(false);
  const headingRef = useRef(null);
  const focusHeadingAfterCloseRef = useRef(false);
  const [remove, setRemove] = useState({ open: false, product: null, busy: false });

  const dropInvalidFilter = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('categoryId');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  // `mode`: 'all' (vào trang / Thử lại: danh mục + sản phẩm song song), 'products' (đổi bộ lọc
  // hoặc làm mới URL ảnh: select vẫn dùng được), 'refresh' (nền, giữ danh sách đang hiện).
  const load = useCallback(
    async (mode) => {
      const requestId = ++requestIdRef.current;
      if (mode === 'all') setPhase('loading');
      if (mode === 'products') setListLoading(true);
      try {
        const [categoryData, productData] = await Promise.all([
          mode === 'all' ? fetchAdminCategories() : null,
          fetchAdminProducts({ categoryId }),
        ]);
        if (requestId !== requestIdRef.current) return;
        if (categoryData) {
          setCategories(categoryData.categories);
          categoriesLoadedRef.current = true;
        }
        setProducts(productData.products);
        setPhase('ready');
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        if (error.status === 401) return; // apiClient đã xử lý phiên hết hạn
        if (error.status === 403) {
          setPhase('forbidden');
        } else if (error.code === 'VALIDATION_ERROR' && error.fields?.categoryId) {
          dropInvalidFilter(); // categoryId sai định dạng: coi như không lọc
        } else if (mode === 'refresh') {
          // Làm mới nền thất bại: giữ danh sách đang có.
        } else if (categoriesLoadedRef.current && mode === 'products') {
          showToast(error.message, { tone: 'error' });
        } else {
          setLoadError(error.message);
          setPhase('error');
        }
      } finally {
        if (requestId === requestIdRef.current) setListLoading(false);
      }
    },
    [categoryId, dropInvalidFilter, showToast],
  );

  useEffect(() => {
    refreshedRef.current = false;
    load(categoriesLoadedRef.current ? 'products' : 'all');
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  // Signed URL hết hạn / ký lỗi (imageUrl null hoặc ảnh lỗi tải): tải lại danh sách đúng một lần.
  const refreshImageUrls = useCallback(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    load('refresh');
  }, [load]);

  useEffect(() => {
    if (phase === 'ready' && products.some((product) => !product.imageUrl)) refreshImageUrls();
  }, [phase, products, refreshImageUrls]);

  // Hộp thoại đã đóng (focus đã trả xong) thì đưa focus về h2 như screens.md.
  useEffect(() => {
    if (remove.open || !focusHeadingAfterCloseRef.current) return;
    focusHeadingAfterCloseRef.current = false;
    headingRef.current?.focus();
  }, [remove.open]);

  const closeRemove = () => setRemove((prev) => ({ ...prev, open: false }));

  async function handleConfirmRemove() {
    const target = remove.product;
    if (remove.busy || !target) return;
    setRemove((prev) => ({ ...prev, busy: true }));
    const dropFromList = () => {
      setProducts((prev) => prev.filter((item) => item.id !== target.id));
      focusHeadingAfterCloseRef.current = true;
    };
    try {
      await deleteAdminProduct(target.id);
      dropFromList();
      setRemove({ open: false, product: target, busy: false });
      showToast('Đã xoá sản phẩm.');
    } catch (error) {
      setRemove({ open: false, product: target, busy: false });
      if (error.status === 401) return;
      if (error.code === 'PRODUCT_NOT_FOUND') {
        dropFromList();
        showToast(NOT_FOUND_MESSAGE, { tone: 'error' });
      } else {
        showToast(error.message, { tone: 'error' });
      }
    }
  }

  function handleFilterChange(event) {
    const value = event.target.value;
    setSearchParams(value ? { categoryId: value } : {}, { replace: true });
  }

  if (phase === 'forbidden') return <ForbiddenPage />;

  const noCategories = phase === 'ready' && categories.length === 0;
  const filtering = categoryId !== '';
  const selectedValue = categories.some((category) => category.id === categoryId) ? categoryId : '';
  const addUrl = withCategoryFilter(PATHS.adminProductNew, selectedValue);
  const addButton = (
    <Link to={addUrl} className={buttonClass}>
      <PlusIcon width={18} height={18} />
      Thêm sản phẩm
    </Link>
  );

  return (
    <section aria-labelledby="admin-products-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="admin-products-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-ink focus:outline-none"
          >
            Sản phẩm
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Quản lý quần áo và ảnh trải phẳng (flat lay) dùng cho thử đồ.
          </p>
        </div>
        {phase === 'ready' && !noCategories && addButton}
      </div>

      {phase === 'ready' && !noCategories && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SelectField
            label="Lọc theo danh mục"
            placeholder="Tất cả danh mục"
            value={selectedValue}
            onChange={handleFilterChange}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            className="w-full sm:w-72"
          />
          <p aria-live="polite" className="text-sm text-ink-soft">
            {listLoading ? 'Đang tải…' : `${products.length} sản phẩm`}
          </p>
        </div>
      )}

      <div className="mt-6">
        {phase === 'loading' && <ListSkeleton />}
        {phase === 'error' && (
          <ErrorState
            title="Không tải được sản phẩm"
            message={loadError}
            onRetry={() => load('all')}
          />
        )}
        {noCategories && (
          <EmptyState
            icon={<FolderIcon />}
            title="Cần tạo danh mục trước"
            description="Sản phẩm phải thuộc một danh mục."
            action={
              <Link to={PATHS.adminCategories} className={buttonClass}>
                Tới quản lý danh mục
              </Link>
            }
          />
        )}
        {phase === 'ready' && !noCategories && listLoading && <ListSkeleton />}
        {phase === 'ready' && !noCategories && !listLoading && products.length === 0 && (
          <EmptyState
            icon={<ImageIcon />}
            title={filtering ? 'Danh mục này chưa có sản phẩm' : 'Chưa có sản phẩm nào'}
            description={
              filtering
                ? 'Thêm sản phẩm đầu tiên vào danh mục này.'
                : 'Thêm sản phẩm đầu tiên cùng ảnh flat lay.'
            }
            action={
              <div className="flex flex-col items-center gap-3">
                <Link to={addUrl} className={buttonClass}>
                  <PlusIcon width={18} height={18} />
                  {filtering ? 'Thêm sản phẩm vào danh mục này' : 'Thêm sản phẩm'}
                </Link>
                {filtering && (
                  <Link to={PATHS.adminProducts} className={outlineClass}>
                    Xem tất cả sản phẩm
                  </Link>
                )}
              </div>
            }
          />
        )}
        {phase === 'ready' && !noCategories && !listLoading && products.length > 0 && (
          <ProductList
            products={products}
            onImageError={refreshImageUrls}
            editUrl={(product) =>
              withCategoryFilter(adminProductEditPath(product.id), selectedValue)
            }
            onDelete={(product) => setRemove({ open: true, product, busy: false })}
          />
        )}
      </div>

      <ConfirmDialog
        open={remove.open}
        title="Xoá sản phẩm?"
        description={`Xoá sản phẩm “${remove.product?.name ?? ''}”? Ảnh sản phẩm cũng bị xoá và không thể hoàn tác.`}
        confirmLabel="Xoá sản phẩm"
        busy={remove.busy}
        busyLabel="Đang xoá…"
        onConfirm={handleConfirmRemove}
        onCancel={closeRemove}
      />
    </section>
  );
}
