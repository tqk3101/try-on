import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';
import {
  CART_MAX_LINES,
  CART_MAX_QUANTITY,
  QUANTITY_MESSAGE,
} from '../validators/cartValidator.js';
import { PRODUCT_BUCKET } from './productService.js';
import { signUrls } from './storageService.js';

const MAX_OPTIMISTIC_ATTEMPTS = 3;

// Cột tường minh; image_path chỉ dùng nội bộ để ký URL, không trả ra client.
const CART_COLUMNS =
  'product_id, quantity, created_at, product:products(id, name, price, image_path, category:categories(id, name))';

const productNotFound = () =>
  new HttpError(404, 'PRODUCT_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã bị xoá.');

function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'}`);
}

/**
 * Đọc giỏ của user kèm giá hiện tại, ký URL ảnh theo lô; tổng tính ở server (design D34).
 * @returns {Promise<{items: object[], lineCount: number, itemCount: number, total: number, limits: object}>}
 */
export async function getCart(profileId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_COLUMNS)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .order('product_id', { ascending: true });
  if (error) throw dbError('select cart_items', error);

  // Dòng mất sản phẩm (race với cascade) bị bỏ qua.
  const rows = (data ?? []).filter((row) => row.product);
  const urls = await signUrls(
    PRODUCT_BUCKET,
    rows.map((row) => row.product.image_path),
  );

  const items = rows.map((row) => {
    const price = Number(row.product.price);
    return {
      productId: row.product.id,
      name: row.product.name,
      price,
      imageUrl: urls.get(row.product.image_path) ?? null,
      category: row.product.category
        ? { id: row.product.category.id, name: row.product.category.name }
        : null,
      quantity: row.quantity,
      lineTotal: price * row.quantity,
      addedAt: row.created_at,
    };
  });

  return {
    items,
    lineCount: items.length,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    limits: { maxLines: CART_MAX_LINES, maxQuantity: CART_MAX_QUANTITY },
  };
}

async function productExists(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw dbError('select products', error);
  return Boolean(data);
}

async function findQuantity(profileId, productId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('profile_id', profileId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw dbError('select cart_items', error);
  return data ? data.quantity : null;
}

async function finish(profileId, productId, created) {
  const cart = await getCart(profileId);
  const item = cart.items.find((entry) => entry.productId === productId) ?? null;
  return { created, cart, item };
}

/**
 * Thêm sản phẩm vào giỏ (cộng dồn). Optimistic: UPDATE có điều kiện `quantity = cũ`, 0 dòng thì
 * đọc lại, tối đa 3 lần; INSERT trùng (23505) quay lại nhánh cộng dồn; 23503 -> 404.
 * @returns {Promise<{created: boolean, cart: object, item: object|null}>} created=true khi tạo dòng mới
 */
export async function addItem(profileId, productId, quantity) {
  if (!(await productExists(productId))) throw productNotFound();

  for (let attempt = 0; attempt < MAX_OPTIMISTIC_ATTEMPTS; attempt += 1) {
    const current = await findQuantity(profileId, productId);

    if (current !== null) {
      const next = current + quantity;
      if (next > CART_MAX_QUANTITY) {
        throw new HttpError(
          409,
          'CART_QUANTITY_LIMIT',
          `Mỗi sản phẩm chỉ đặt tối đa ${CART_MAX_QUANTITY} chiếc.`,
        );
      }
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: next })
        .eq('profile_id', profileId)
        .eq('product_id', productId)
        .eq('quantity', current)
        .select('quantity');
      if (error) throw dbError('update cart_items', error);
      if (data && data.length > 0) return finish(profileId, productId, false);
      continue; // tab khác vừa đổi (hoặc xoá) dòng này -> đọc lại
    }

    const { count, error: countError } = await supabase
      .from('cart_items')
      .select('product_id', { count: 'exact', head: true })
      .eq('profile_id', profileId);
    if (countError) throw dbError('count cart_items', countError);
    if ((count ?? 0) >= CART_MAX_LINES) {
      throw new HttpError(
        409,
        'CART_FULL',
        `Giỏ hàng đã có ${CART_MAX_LINES} sản phẩm. Vui lòng bớt sản phẩm trước khi thêm.`,
      );
    }

    const { error } = await supabase
      .from('cart_items')
      .insert({ profile_id: profileId, product_id: productId, quantity });
    if (!error) return finish(profileId, productId, true);
    if (error.code === '23503') throw productNotFound();
    if (error.code === '23514') {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', {
        quantity: QUANTITY_MESSAGE,
      });
    }
    if (error.code !== '23505') throw dbError('insert cart_items', error);
    // 23505: tab khác vừa thêm cùng sản phẩm -> vòng sau cộng dồn
  }

  console.error('[cart] Hết lượt thử optimistic khi thêm vào giỏ.');
  throw new Error('Không thể cập nhật giỏ hàng do xung đột liên tục.');
}

/** Đặt số lượng tuyệt đối; không có dòng -> 404 CART_ITEM_NOT_FOUND. */
export async function setQuantity(profileId, productId, quantity) {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('profile_id', profileId)
    .eq('product_id', productId)
    .select('quantity');
  if (error) throw dbError('update cart_items', error);
  if (!data || data.length === 0) {
    throw new HttpError(404, 'CART_ITEM_NOT_FOUND', 'Sản phẩm này không còn trong giỏ hàng.');
  }
  return getCart(profileId);
}

/** Xoá dòng giỏ; idempotent (không có dòng vẫn thành công). */
export async function removeItem(profileId, productId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('profile_id', profileId)
    .eq('product_id', productId);
  if (error) throw dbError('delete cart_items', error);
  return getCart(profileId);
}
