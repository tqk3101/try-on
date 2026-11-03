import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import PriceField from '../../components/admin/PriceField.jsx';
import ProductImageField from '../../components/admin/ProductImageField.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { ArrowLeftIcon, FolderIcon } from '../../components/icons.jsx';
import SelectField from '../../components/SelectField.jsx';
import TextField from '../../components/TextField.jsx';
import { useToast } from '../../components/toastContext.js';
import { PATHS, withCategoryFilter } from '../../routes/paths.js';
import {
  createAdminProduct,
  fetchAdminCategories,
  fetchAdminProduct,
  updateAdminProduct,
} from '../../services/adminApi.js';
import ForbiddenPage from '../ForbiddenPage.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const NOT_FOUND_MESSAGE = 'Sản phẩm không còn tồn tại.';
const NAME_MAX_LENGTH = 100;
const PRICE_MAX = 100_000_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES = {
  nameRequired: 'Vui lòng nhập tên sản phẩm.',
  nameTooLong: `Tên sản phẩm tối đa ${NAME_MAX_LENGTH} ký tự.`,
  nameInvalidChars: 'Tên chứa ký tự không hợp lệ.',
  priceRequired: 'Vui lòng nhập giá sản phẩm.',
  priceFormat: 'Giá phải là số nguyên dương (VND), không có dấu chấm hoặc phẩy.',
  priceTooHigh: 'Giá tối đa 100.000.000 ₫.',
  categoryRequired: 'Vui lòng chọn danh mục.',
  imageRequired: 'Vui lòng chọn ảnh sản phẩm.',
};

/** Cùng quy tắc chuẩn hoá với server: NFC, trim, gộp khoảng trắng. */
const normalizeName = (value) => value.normalize('NFC').trim().replace(/\s+/g, ' ');

function validateName(raw) {
  const name = normalizeName(raw);
  if (name === '') return MESSAGES.nameRequired;
  if (/[�\p{Cc}]/u.test(name)) return MESSAGES.nameInvalidChars;
  if ([...name].length > NAME_MAX_LENGTH) return MESSAGES.nameTooLong;
  return '';
}

function validatePrice(digits) {
  if (digits === '') return MESSAGES.priceRequired;
  if (!/^[1-9][0-9]*$/.test(digits)) return MESSAGES.priceFormat;
  if (Number(digits) > PRICE_MAX) return MESSAGES.priceTooHigh;
  return '';
}

function FormSkeleton() {
  return (
    <div role="status" className="animate-pulse rounded-3xl bg-surface p-8 shadow-card">
      <span className="sr-only">Đang tải…</span>
      <div aria-hidden="true" className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <div className="aspect-[3/4] w-full max-w-64 rounded-2xl bg-sand" />
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-2xl bg-sand" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Trang /admin/products/new và /admin/products/:id/edit: thêm / sửa sản phẩm
 * (tên, giá VND, danh mục, 1 ảnh flat lay; khi sửa ảnh là tuỳ chọn).
 */
export default function AdminProductFormPage() {
  const navigate = useNavigate();
  const { id: productId } = useParams();
  const editing = Boolean(productId);
  useDocumentTitle(editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm');
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const filterCategoryId = searchParams.get('categoryId') ?? '';
  const listUrl = withCategoryFilter(
    PATHS.adminProducts,
    UUID_REGEX.test(filterCategoryId) ? filterCategoryId : '',
  );

  const [phase, setPhase] = useState('loading'); // loading | ready | error | forbidden
  const [loadError, setLoadError] = useState('');
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState(null); // { file, previewUrl } | null
  const [original, setOriginal] = useState(null); // giá trị đã lưu khi sửa: { name, price, categoryId }
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submittingRef = useRef(false);
  const imageRef = useRef(null);
  const nameRef = useRef(null);
  const priceRef = useRef(null);
  const categoryRef = useRef(null);
  const imageButtonRef = useRef(null);
  const pendingFocusRef = useRef(null);
  const requestIdRef = useRef(0);
  const presetAppliedRef = useRef(false);
  const imageRefreshedRef = useRef(false);
  const headingRef = useRef(null);

  // Thu hồi objectURL của ảnh xem trước khi rời trang.
  useEffect(
    () => () => {
      if (imageRef.current) URL.revokeObjectURL(imageRef.current.previewUrl);
    },
    [],
  );

  const replaceImage = useCallback((next) => {
    if (imageRef.current) URL.revokeObjectURL(imageRef.current.previewUrl);
    imageRef.current = next;
    setImage(next);
  }, []);

  const loadCategories = useCallback(
    async ({ resetSelection = false } = {}) => {
      const requestId = ++requestIdRef.current;
      const loadProduct = editing && !resetSelection && !presetAppliedRef.current;
      try {
        const [data, productData] = await Promise.all([
          fetchAdminCategories(),
          loadProduct ? fetchAdminProduct(productId) : null,
        ]);
        if (requestId !== requestIdRef.current) return;
        setCategories(data.categories);
        if (productData) {
          const { product } = productData;
          const initial = {
            name: product.name,
            price: String(product.price),
            categoryId: product.category?.id ?? '',
          };
          presetAppliedRef.current = true;
          setOriginal(initial);
          setName(initial.name);
          setPrice(initial.price);
          setCategoryId(initial.categoryId);
          setCurrentImageUrl(product.imageUrl);
        }
        setPhase('ready');
        if (resetSelection) {
          setCategoryId('');
        } else if (!editing && !presetAppliedRef.current) {
          // Chọn sẵn danh mục đang lọc (nếu còn tồn tại), chỉ một lần.
          presetAppliedRef.current = true;
          if (data.categories.some((category) => category.id === filterCategoryId)) {
            setCategoryId(filterCategoryId);
          }
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        if (error.status === 401) return; // apiClient đã xử lý phiên hết hạn
        if (error.status === 403) {
          setPhase('forbidden');
        } else if (error.code === 'PRODUCT_NOT_FOUND') {
          showToast(NOT_FOUND_MESSAGE, { tone: 'error' });
          navigate(listUrl, { replace: true });
        } else if (resetSelection) {
          showToast(error.message, { tone: 'error' });
        } else {
          setLoadError(error.message);
          setPhase('error');
        }
      }
    },
    [editing, filterCategoryId, listUrl, navigate, productId, showToast],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh mục khi vào trang
    loadCategories();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadCategories]);

  // Signed URL của ảnh hiện tại hết hạn / lỗi: gọi lại GET một lần để lấy URL mới.
  const refreshCurrentImage = useCallback(async () => {
    if (!productId || imageRefreshedRef.current) return;
    imageRefreshedRef.current = true;
    try {
      const { product } = await fetchAdminProduct(productId);
      setCurrentImageUrl(product.imageUrl);
    } catch {
      // Giữ placeholder; vẫn lưu được nếu không đổi ảnh.
    }
  }, [productId]);

  // Sau khi form được mở khoá (hết busy) đưa focus tới ô lỗi đầu tiên.
  useEffect(() => {
    if (busy || !pendingFocusRef.current) return;
    const target = pendingFocusRef.current;
    pendingFocusRef.current = null;
    ({ name: nameRef, price: priceRef, categoryId: categoryRef, image: imageButtonRef })[
      target
    ]?.current?.focus();
  }, [busy, errors]);

  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: undefined }));

  function focusFirstError(nextErrors) {
    pendingFocusRef.current =
      ['name', 'price', 'categoryId', 'image'].find((field) => nextErrors[field]) ?? null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const clientErrors = {
      name: validateName(name),
      price: validatePrice(price),
      categoryId: categoryId === '' ? MESSAGES.categoryRequired : '',
      image: image || editing ? '' : MESSAGES.imageRequired,
    };
    setFormError('');
    if (Object.values(clientErrors).some(Boolean)) {
      setErrors(clientErrors);
      focusFirstError(clientErrors);
      // `errors` có thể không đổi tham chiếu giá trị; effect phụ thuộc `errors` nên vẫn chạy.
      return;
    }
    setErrors({});

    const formData = new FormData();
    formData.set('name', normalizeName(name));
    formData.set('price', price);
    formData.set('categoryId', categoryId);
    if (image) formData.set('image', image.file);

    submittingRef.current = true;
    setBusy(true);
    try {
      if (editing) await updateAdminProduct(productId, formData);
      else await createAdminProduct(formData);
      replaceImage(null);
      showToast('Đã lưu sản phẩm.');
      navigate(listUrl);
    } catch (error) {
      handleSubmitError(error);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  function handleSubmitError(error) {
    if (error.status === 401) return; // apiClient đã xử lý phiên hết hạn
    if (error.code === 'PRODUCT_NOT_FOUND') {
      showToast(NOT_FOUND_MESSAGE, { tone: 'error' });
      navigate(listUrl, { replace: true });
      return;
    }
    if (error.code === 'VALIDATION_ERROR' && error.fields) {
      const fields = error.fields;
      setErrors(fields);
      focusFirstError(fields);
      if (fields.categoryId) loadCategories({ resetSelection: true });
      return;
    }
    if (error.code === 'FILE_TOO_LARGE' || error.code === 'UNSUPPORTED_FILE_TYPE') {
      replaceImage(null);
      setErrors({ image: error.message });
      focusFirstError({ image: error.message });
      return;
    }
    // INVALID_UPLOAD, 429, 502, 500, NETWORK_ERROR: giữ dữ liệu và ảnh đã chọn để thử lại.
    setFormError(error.message);
  }

  if (phase === 'forbidden') return <ForbiddenPage />;

  const dirty =
    !editing ||
    image !== null ||
    original === null ||
    normalizeName(name) !== original.name ||
    price !== original.price ||
    categoryId !== original.categoryId;

  const backLink = (
    <Link
      to={listUrl}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink"
    >
      <ArrowLeftIcon width={18} height={18} />
      Danh sách sản phẩm
    </Link>
  );

  return (
    <section aria-labelledby="admin-product-form-title">
      {backLink}
      <h2
        id="admin-product-form-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-xl font-semibold text-ink focus:outline-none"
      >
        {editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      </h2>

      <div className="mt-6">
        {phase === 'loading' && <FormSkeleton />}
        {phase === 'error' && (
          <ErrorState
            title="Không tải được thông tin"
            message={loadError}
            onRetry={() => {
              setPhase('loading');
              loadCategories();
            }}
          />
        )}
        {phase === 'ready' && categories.length === 0 && (
          <EmptyState
            icon={<FolderIcon />}
            title="Cần tạo danh mục trước"
            description="Sản phẩm phải thuộc một danh mục."
            action={
              <Link
                to={PATHS.adminCategories}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Tới quản lý danh mục
              </Link>
            }
          />
        )}
        {phase === 'ready' && categories.length > 0 && (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-3xl bg-surface p-6 shadow-card sm:max-w-xl md:max-w-none lg:p-8"
          >
            <div className="grid gap-8 md:grid-cols-[16rem_1fr] lg:grid-cols-[18rem_1fr]">
              <ProductImageField
                value={image}
                onChange={(next) => {
                  replaceImage(next);
                  clearError('image');
                }}
                error={errors.image}
                onError={(message) => setErrors((prev) => ({ ...prev, image: message }))}
                busy={busy}
                inputRef={imageButtonRef}
                current={editing ? { url: currentImageUrl } : undefined}
                onCurrentImageError={refreshCurrentImage}
              />

              <div className="space-y-5">
                <TextField
                  ref={nameRef}
                  label="Tên sản phẩm"
                  name="name"
                  autoComplete="off"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearError('name');
                  }}
                  error={errors.name}
                  hint={`Tối đa ${NAME_MAX_LENGTH} ký tự.`}
                  disabled={busy}
                />
                <PriceField
                  ref={priceRef}
                  label="Giá"
                  name="price"
                  value={price}
                  onChange={(digits) => {
                    setPrice(digits);
                    clearError('price');
                  }}
                  error={errors.price}
                  hint="Đơn vị: VND. Ví dụ: 199.000"
                  disabled={busy}
                />
                <SelectField
                  ref={categoryRef}
                  label="Danh mục"
                  name="categoryId"
                  placeholder="Chọn danh mục"
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    clearError('categoryId');
                  }}
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  error={errors.categoryId}
                  disabled={busy}
                />

                {formError && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {formError}
                  </p>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse sm:justify-start">
                  <button
                    type="submit"
                    disabled={busy || (editing && !dirty)}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? 'Đang lưu…' : 'Lưu sản phẩm'}
                  </button>
                  <Link
                    to={listUrl}
                    aria-disabled={busy}
                    onClick={(event) => {
                      if (busy) event.preventDefault();
                    }}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5"
                  >
                    Huỷ
                  </Link>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
