import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';

// Cột tường minh + embed count sản phẩm (PostgREST: products(count) -> [{ count }]).
const ADMIN_COLUMNS = 'id, name, slug, created_at, updated_at, products(count)';

const notFound = () => new HttpError(404, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
const exists = () => new HttpError(409, 'CATEGORY_EXISTS', 'Danh mục này đã tồn tại.');

function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'}`);
}

/** Lỗi ghi: 23505 -> 409, 23514 (CHECK, lớp phòng thủ cuối) -> 400, còn lại -> 500. */
function writeError(action, error) {
  if (error.code === '23505') return exists();
  if (error.code === '23514') {
    return new HttpError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', {
      name: 'Tên danh mục không hợp lệ.',
    });
  }
  return dbError(action, error);
}

function toAdminCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    productCount: row.products?.[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** GET: mọi danh mục, created_at asc, id asc. */
export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select(ADMIN_COLUMNS)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw dbError('select categories', error);
  return data.map(toAdminCategory);
}

/** Người mua (Q8): chỉ danh mục có >= 1 sản phẩm, chỉ { id, name, slug }, không productCount. */
export async function listBuyerCategories() {
  const all = await listCategories();
  return all
    .filter((category) => category.productCount > 0)
    .map(({ id, name, slug }) => ({ id, name, slug }));
}

/** Người mua: một danh mục { id, name, slug }; không có -> 404 CATEGORY_NOT_FOUND. */
export async function getBuyerCategory(id) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('id', id)
    .maybeSingle();
  if (error) throw dbError('select categories', error);
  if (!data) throw notFound();
  return data;
}

/** POST: nhận { name, slug } đã validate. */
export async function createCategory({ name, slug }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug })
    .select(ADMIN_COLUMNS)
    .single();
  if (error) throw writeError('insert categories', error);
  return toAdminCategory(data);
}

/** PUT: slug sinh lại theo tên mới. 0 dòng -> 404. */
export async function updateCategory(id, { name, slug }) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name, slug })
    .eq('id', id)
    .select(ADMIN_COLUMNS)
    .maybeSingle();
  if (error) throw writeError('update categories', error);
  if (!data) throw notFound();
  return toAdminCategory(data);
}

/** DELETE: đếm sản phẩm trước; 23503 lúc xoá (race) cũng -> 409 CATEGORY_NOT_EMPTY. */
export async function deleteCategory(id) {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);
  if (countError) throw dbError('count products', countError);
  if (count > 0) {
    throw new HttpError(
      409,
      'CATEGORY_NOT_EMPTY',
      `Danh mục còn ${count} sản phẩm. Hãy xoá hoặc chuyển các sản phẩm sang danh mục khác trước khi xoá.`,
    );
  }

  const { data, error } = await supabase.from('categories').delete().eq('id', id).select('id');
  if (error) {
    if (error.code === '23503') {
      throw new HttpError(
        409,
        'CATEGORY_NOT_EMPTY',
        'Danh mục vẫn còn sản phẩm. Hãy xoá hoặc chuyển các sản phẩm trước khi xoá.',
      );
    }
    throw dbError('delete categories', error);
  }
  if (!data || data.length === 0) throw notFound();
  return { id };
}
