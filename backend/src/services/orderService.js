import { supabase } from '../config/supabase.js';
import { HttpError } from '../middlewares/httpError.js';
import { orderNotFound } from '../validators/orderValidator.js';
import { PRODUCT_BUCKET } from './productService.js';
import { signUrls } from './storageService.js';

// Cột tường minh; profile_id, idempotency_key, image_path, order_number chỉ dùng nội bộ.
const ORDER_COLUMNS =
  'id, order_number, status, payment_method, recipient_name, phone, shipping_address, note, item_count, total_amount, created_at, ' +
  'items:order_items(product_id, product_name, category_name, unit_price, quantity, line_total, position, product:products(image_path))';
const CUSTOMER = 'customer:profiles(id, email, display_name)';
const ADMIN_ORDER_COLUMNS = `${ORDER_COLUMNS}, ${CUSTOMER}`;
const SUMMARY_COLUMNS = `id, order_number, status, item_count, total_amount, recipient_name, created_at, ${CUSTOMER}`;

// Lỗi nghiệp vụ do place_order raise (errcode P0001, message = mã lỗi) -> HttpError.
const RPC_BUSINESS_ERRORS = Object.freeze({
  CART_EMPTY: () => new HttpError(409, 'CART_EMPTY', 'Giỏ hàng đang trống.'),
  CART_CHANGED: () =>
    new HttpError(
      409,
      'CART_CHANGED',
      'Giỏ hàng vừa thay đổi (giá hoặc sản phẩm). Vui lòng kiểm tra lại trước khi đặt hàng.',
    ),
  PROFILE_NOT_FOUND: () =>
    new HttpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'),
});

// Chỉ ghi mã lỗi Postgres: tham số RPC và message chứa SĐT/địa chỉ nên không được log.
function dbError(action, error) {
  return new Error(`Supabase ${action} thất bại: ${error.code ?? 'unknown'}`);
}

const formatCode = (orderNumber) => `DH${String(orderNumber).padStart(6, '0')}`;

const toCustomer = (row) =>
  row ? { id: row.id, email: row.email, displayName: row.display_name ?? null } : null;

function toOrderItem(row, urls) {
  const imagePath = row.product?.image_path ?? null;
  return {
    productId: row.product_id ?? null,
    name: row.product_name,
    categoryName: row.category_name ?? null,
    unitPrice: Number(row.unit_price),
    quantity: row.quantity,
    lineTotal: Number(row.line_total),
    imageUrl: imagePath ? (urls.get(imagePath) ?? null) : null,
  };
}

async function toOrder(row, { withCustomer = false } = {}) {
  const lines = [...(row.items ?? [])].sort((a, b) => a.position - b.position);
  const urls = await signUrls(
    PRODUCT_BUCKET,
    lines.map((line) => line.product?.image_path),
  );
  const order = {
    id: row.id,
    code: formatCode(row.order_number),
    status: row.status,
    paymentMethod: row.payment_method,
    recipientName: row.recipient_name,
    phone: row.phone,
    shippingAddress: row.shipping_address,
    note: row.note ?? null,
    items: lines.map((line) => toOrderItem(line, urls)),
    itemCount: row.item_count,
    total: Number(row.total_amount),
    createdAt: row.created_at,
  };
  if (withCustomer) order.customer = toCustomer(row.customer);
  return order;
}

const toSummary = (row) => ({
  id: row.id,
  code: formatCode(row.order_number),
  status: row.status,
  itemCount: row.item_count,
  total: Number(row.total_amount),
  recipientName: row.recipient_name,
  customer: toCustomer(row.customer),
  createdAt: row.created_at,
});

/** Đơn của chính user; không có / của người khác -> 404 ORDER_NOT_FOUND (không lộ tồn tại). */
export async function getOrderForUser(profileId, orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw dbError('select orders', error);
  if (!data) throw orderNotFound();
  return toOrder(data);
}

/** Admin: đọc mọi đơn, kèm thông tin khách. */
export async function getOrderForAdmin(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_COLUMNS)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw dbError('select orders', error);
  if (!data) throw orderNotFound();
  return toOrder(data, { withCustomer: true });
}

/** Admin: phân trang offset (range + count exact), mới nhất trước, lọc theo trạng thái. */
export async function listOrders({ status, page, pageSize }) {
  const from = (page - 1) * pageSize;
  let query = supabase.from('orders').select(SUMMARY_COLUMNS, { count: 'exact' });
  if (status) query = query.eq('status', status);
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1);

  let rows = data ?? [];
  let total = count ?? 0;
  if (error) {
    // PostgREST trả 416 (PGRST103) khi offset vượt tổng số dòng: coi là trang rỗng, đọc lại tổng.
    if (error.code !== 'PGRST103') throw dbError('select orders', error);
    let countQuery = supabase.from('orders').select('id', { count: 'exact', head: true });
    if (status) countQuery = countQuery.eq('status', status);
    const counted = await countQuery;
    if (counted.error) throw dbError('count orders', counted.error);
    rows = [];
    total = counted.count ?? 0;
  }

  return {
    orders: rows.map(toSummary),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

async function findOrderIdByKey(profileId, idempotencyKey) {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('profile_id', profileId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (error) throw dbError('select orders', error);
  return data?.id ?? null;
}

/**
 * Đặt hàng nguyên tử qua hàm Postgres place_order (design/flows/cart-and-orders.md mục 5).
 * @returns {Promise<{created: boolean, order: object}>} created=false khi khoá idempotency đã dùng
 */
export async function placeOrder(profileId, input) {
  const { data, error } = await supabase.rpc('place_order', {
    p_profile_id: profileId,
    p_idempotency_key: input.idempotencyKey,
    p_recipient_name: input.recipientName,
    p_phone: input.phone,
    p_shipping_address: input.shippingAddress,
    p_note: input.note,
    p_expected_total: input.expectedTotal,
  });

  let orderId;
  let created;
  if (error) {
    const business = error.code === 'P0001' ? RPC_BUSINESS_ERRORS[error.message?.trim()] : null;
    if (business) throw business();
    if (error.code !== '23505') throw dbError('rpc place_order', error);
    // Dự phòng: 2 lượt cùng khoá chạm unique (profile_id, idempotency_key) -> trả đơn đã tạo.
    orderId = await findOrderIdByKey(profileId, input.idempotencyKey);
    if (!orderId) throw dbError('rpc place_order', error);
    created = false;
  } else {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.out_order_id) throw new Error('Supabase rpc place_order trả dữ liệu không hợp lệ.');
    orderId = row.out_order_id;
    created = Boolean(row.out_created);
  }

  return { created, order: await getOrderForUser(profileId, orderId) };
}
