import { randomUUID } from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';
import { MESSAGES, validationError } from '../validators/productValidator.js';
import { getBuyerCategory } from './categoryService.js';
import { removeObject, signUrl, signUrls, uploadObject } from './storageService.js';
import {
  deleteTryOnResultsOfProduct,
  listTryOnResultPathsOfProduct,
  removeTryOnResultObjects,
} from './tryOn/cleanup.js';

export const PRODUCT_BUCKET = 'products';

// Cột tường minh; image_path chỉ dùng nội bộ để ký URL, không trả ra client.
const ADMIN_COLUMNS =
  'id, name, price, image_path, created_at, updated_at, category:categories(id, name, slug)';

const notFound = () =>
  new HttpError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã bị xoá.');

function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'}`);
}

function toAdminProduct(row, imageUrl) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    imageUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** GET danh sách: created_at desc, id desc; lọc theo danh mục (tuỳ chọn); ký URL cả lô một lần. */
export async function listProducts({ categoryId } = {}) {
  let query = supabase.from('products').select(ADMIN_COLUMNS);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw dbError('select products', error);

  const urls = await signUrls(
    PRODUCT_BUCKET,
    data.map((row) => row.image_path),
  );
  return data.map((row) => toAdminProduct(row, urls.get(row.image_path) ?? null));
}

/**
 * Người mua: { category, products } với products là { id, name, price, imageUrl }, cũ nhất trước
 * (flows D24). Danh mục không tồn tại -> 404 CATEGORY_NOT_FOUND; tồn tại nhưng rỗng -> [].
 */
export async function listBuyerProducts(categoryId) {
  const category = await getBuyerCategory(categoryId);
  // listProducts sắp created_at desc, id desc; đảo lại thành asc, asc.
  const products = (await listProducts({ categoryId })).reverse();
  return {
    category,
    products: products.map(({ id, name, price, imageUrl }) => ({ id, name, price, imageUrl })),
  };
}

/** GET một sản phẩm; không có -> 404 PRODUCT_NOT_FOUND. */
export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select(ADMIN_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw dbError('select products', error);
  if (!data) throw notFound();
  return toAdminProduct(data, await signUrl(PRODUCT_BUCKET, data.image_path));
}

/** Trả true nếu danh mục tồn tại. */
export async function categoryExists(categoryId) {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();
  if (error) throw dbError('select categories', error);
  return Boolean(data);
}

/** Lỗi ghi DB: 23503 (danh mục bị xoá giữa chừng) -> 400 fields.categoryId; 23514 -> 400; còn lại 500. */
function writeError(action, error) {
  if (error.code === '23503') return validationError({ categoryId: MESSAGES.categoryNotFound });
  if (error.code === '23514') return validationError({ name: 'Dữ liệu sản phẩm không hợp lệ.' });
  return dbError(action, error);
}

/**
 * POST sản phẩm (design/flows/product-management.md mục 5). Nhận dữ liệu đã validate,
 * `file` đã qua kiểm tra magic bytes (`type` = kết quả detectImageType).
 * Sinh UUID TRƯỚC khi upload để path `{id}/flatlay-{ms}.{ext}` thoả CHECK image_path;
 * INSERT lỗi thì xoá object vừa upload (không để mồ côi).
 */
export async function createProduct({ name, price, categoryId }, file, type) {
  const id = randomUUID();
  const imagePath = `${id}/flatlay-${Date.now()}.${type.ext}`;
  await uploadObject(PRODUCT_BUCKET, imagePath, file.buffer, type.contentType);

  let row;
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({ id, category_id: categoryId, name, price, image_path: imagePath })
      .select(ADMIN_COLUMNS)
      .single();
    if (error) throw writeError('insert products', error);
    row = data;
  } catch (err) {
    await removeObject(PRODUCT_BUCKET, imagePath);
    throw err;
  }
  return toAdminProduct(row, await signUrl(PRODUCT_BUCKET, row.image_path));
}

/** image_path hiện tại của sản phẩm; không có -> 404 PRODUCT_NOT_FOUND. */
export async function getProductImagePath(id) {
  const { data, error } = await supabase
    .from('products')
    .select('image_path')
    .eq('id', id)
    .maybeSingle();
  if (error) throw dbError('select products', error);
  if (!data) throw notFound();
  return data.image_path;
}

/**
 * PUT sản phẩm (flows mục 6). `file`/`type` tuỳ chọn; `oldPath` từ getProductImagePath.
 * Có ảnh mới: upload TRƯỚC, UPDATE, rồi mới xoá object cũ; UPDATE lỗi/0 dòng thì xoá object mới
 * (ảnh cũ và DB giữ nguyên, không mồ côi). Không ảnh: chỉ UPDATE text.
 */
export async function updateProduct(id, { name, price, categoryId }, oldPath, file, type) {
  const changes = { name, price, category_id: categoryId };
  let newPath = null;
  if (file) {
    newPath = `${id}/flatlay-${Date.now()}.${type.ext}`;
    await uploadObject(PRODUCT_BUCKET, newPath, file.buffer, type.contentType);
    changes.image_path = newPath;
  }

  let row;
  try {
    const { data, error } = await supabase
      .from('products')
      .update(changes)
      .eq('id', id)
      .select(ADMIN_COLUMNS)
      .maybeSingle();
    if (error) throw writeError('update products', error);
    if (!data) throw notFound(); // bị xoá giữa chừng
    row = data;
  } catch (err) {
    if (newPath) await removeObject(PRODUCT_BUCKET, newPath);
    throw err;
  }

  if (newPath && oldPath && oldPath !== newPath) {
    await removeObject(PRODUCT_BUCKET, oldPath);
    // Ảnh sản phẩm đổi: kết quả thử đồ cũ không còn đúng, dọn rows + object (best-effort).
    await deleteTryOnResultsOfProduct(id);
  }
  return toAdminProduct(row, await signUrl(PRODUCT_BUCKET, row.image_path));
}

/** DELETE sản phẩm: xoá row trước (RETURNING image_path), object sau (best-effort). */
export async function deleteProduct(id) {
  // FK CASCADE xoá rows try_on_results cùng sản phẩm, nên lấy result_path TRƯỚC khi xoá.
  const resultPaths = await listTryOnResultPathsOfProduct(id);
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select('image_path')
    .maybeSingle();
  if (error) throw dbError('delete products', error);
  if (!data) throw notFound();
  await removeObject(PRODUCT_BUCKET, data.image_path);
  await removeTryOnResultObjects(resultPaths);
}
