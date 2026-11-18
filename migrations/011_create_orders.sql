-- =============================================================================
-- 011_create_orders.sql
-- Sprint 4 – Task 1: Đặt hàng (US-10, bổ sung ngoài PB – chờ duyệt) và
-- danh sách đơn cho Admin (US-09)
--
-- TRẠNG THÁI: ĐÃ ÁP qua Supabase MCP ngày 2026-11-18, sau 010 (đã verify quyền
-- bảng/hàm, RLS, thử place_order trong giao dịch bị huỷ). Q24, Q27–Q30, Q32 đã
-- chốt 2026-11-18 (design/flows/README.md mục 7). Không sửa file đã áp.
--
-- 1. public.orders: đơn hàng, thông tin giao hàng (dữ liệu cá nhân), tổng tiền
--    do server tính. order_number (identity) dùng làm mã hiển thị "DH000123".
--    - idempotency_key (uuid client sinh mỗi lần mở trang đặt hàng) unique theo
--      user: gửi lại cùng khoá -> trả đơn cũ, không tạo đơn thứ hai.
--    - FK profile ON DELETE RESTRICT: không mất lịch sử đơn khi xoá user
--      (dọn user test phải xoá đơn trước – common_errors 7.1).
--    - status: CHECK đủ tập cho sprint sau; Sprint 4 chỉ tạo 'pending' (Q29).
--    - payment_method: chỉ 'cod' (ghi nhận, không thanh toán online – Q28).
-- 2. public.order_items: snapshot tên, danh mục, đơn giá tại lúc đặt (Q30).
--    - product_id ON DELETE SET NULL: admin xoá sản phẩm không làm mất dòng đơn.
--    - Không snapshot ảnh (Q32): ảnh lấy từ sản phẩm hiện tại nếu còn.
--    - line_total là cột generated (unit_price * quantity).
-- 3. public.place_order(...): đặt hàng NGUYÊN TỬ trong một transaction (supabase-js
--    không có transaction phía client): khoá profile (tuần tự hoá 2 tab), kiểm
--    tra idempotency, khoá giỏ + sản phẩm, so tổng với expected_total, tạo đơn +
--    dòng đơn, xoá giỏ. Lỗi nghiệp vụ: raise P0001 với message = mã lỗi API
--    ('CART_EMPTY', 'CART_CHANGED', 'PROFILE_NOT_FOUND').
--    SECURITY INVOKER (mặc định), search_path = ''; REVOKE EXECUTE khỏi
--    public/anon/authenticated (Postgres mặc định cấp EXECUTE cho PUBLIC), chỉ
--    GRANT service_role.
-- - Chỉ backend truy cập bảng: RLS bật, KHÔNG policy, REVOKE anon/authenticated,
--   GRANT service_role (common_errors 1.1).
-- - Tái dùng public.set_updated_at() (001).
-- - Idempotent: chạy lại không lỗi, không mất dữ liệu.
--
-- Phụ thuộc: 001, 004 (định dạng phone giống profiles_phone_format), 006, 010.
-- Xem migrations/README.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid        primary key default gen_random_uuid(),
  order_number      bigint      generated always as identity,
  profile_id        uuid        not null
                                references public.profiles (id) on delete restrict,
  idempotency_key   uuid        not null,
  status            text        not null default 'pending',
  payment_method    text        not null default 'cod',
  recipient_name    text        not null,
  phone             text        not null,
  shipping_address  text        not null,
  note              text,
  item_count        integer     not null,   -- tổng số lượng các dòng
  total_amount      bigint      not null,   -- VND, server tính = sum(order_items.line_total)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint orders_order_number_unique unique (order_number),
  constraint orders_idempotency_unique  unique (profile_id, idempotency_key),
  constraint orders_status_check
    check (status in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  constraint orders_payment_method_check check (payment_method in ('cod')),
  constraint orders_recipient_name_check
    check (recipient_name = btrim(recipient_name) and char_length(recipient_name) between 1 and 100),
  -- Cùng định dạng chuẩn hoá với profiles.phone (migration 004)
  constraint orders_phone_format check (phone ~ '^0[35789][0-9]{8}$'),
  constraint orders_shipping_address_check
    check (shipping_address = btrim(shipping_address) and char_length(shipping_address) between 10 and 500),
  constraint orders_note_check
    check (note is null or (note = btrim(note) and char_length(note) between 1 and 500)),
  -- Giới hạn 50 dòng x 10 chiếc kiểm tra ở backend (mềm), DB chỉ chặn giá trị vô nghĩa
  constraint orders_item_count_check   check (item_count > 0),
  constraint orders_total_amount_check check (total_amount > 0)
);

comment on table  public.orders                  is 'Đơn hàng (US-10, US-09). Chứa dữ liệu cá nhân (tên, SĐT, địa chỉ). Chỉ backend truy cập qua service role.';
comment on column public.orders.order_number     is 'Số thứ tự tăng dần; mã hiển thị = DH + lpad(order_number, 6, 0).';
comment on column public.orders.idempotency_key  is 'uuid do client sinh cho mỗi lượt đặt hàng; gửi lại cùng khoá -> trả đơn cũ.';
comment on column public.orders.total_amount     is 'Tổng VND do server tính lúc đặt (không tin client). bigint vì 50 dòng x 10 x 100.000.000 vượt integer.';

-- Admin: lọc theo trạng thái + mới nhất trước (phân trang offset)
create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc, id desc);
-- Admin: không lọc, mới nhất trước
create index if not exists orders_created_idx
  on public.orders (created_at desc, id desc);
-- Người mua: đơn của tôi; phục vụ FK RESTRICT khi xoá profile
create index if not exists orders_profile_created_idx
  on public.orders (profile_id, created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
create table if not exists public.order_items (
  id             uuid        primary key default gen_random_uuid(),
  order_id       uuid        not null
                             references public.orders (id) on delete cascade,
  product_id     uuid
                             references public.products (id) on delete set null,
  product_name   text        not null,   -- snapshot products.name
  category_name  text,                   -- snapshot categories.name (hiển thị)
  unit_price     integer     not null,   -- snapshot products.price (VND) lúc đặt
  quantity       smallint    not null,
  line_total     bigint      generated always as (unit_price::bigint * quantity) stored,
  position       smallint    not null,   -- thứ tự hiển thị trong đơn (0-based, theo thứ tự trong giỏ)
  created_at     timestamptz not null default now(),

  constraint order_items_product_name_check
    check (product_name = btrim(product_name) and char_length(product_name) between 1 and 100),
  constraint order_items_unit_price_check check (unit_price > 0),
  constraint order_items_quantity_check   check (quantity between 1 and 10),
  constraint order_items_position_check   check (position >= 0),
  constraint order_items_order_position_unique unique (order_id, position)
);

comment on table public.order_items is 'Dòng đơn: snapshot tên/danh mục/giá lúc đặt. product_id SET NULL khi sản phẩm bị xoá. Chỉ backend truy cập.';

-- order_items_order_position_unique (order_id, position) phục vụ đọc dòng theo đơn.
-- Index product_id phục vụ FK SET NULL khi admin xoá sản phẩm.
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

-- -----------------------------------------------------------------------------
-- Bảo mật bảng: RLS bật, không policy; chỉ service_role
-- -----------------------------------------------------------------------------
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.orders      from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.orders      to service_role;
grant select, insert, update, delete on table public.order_items to service_role;

-- Sequence của cột identity: cấp tường minh cho service_role, thu hồi khỏi anon/authenticated
do $$
declare
  seq text := pg_get_serial_sequence('public.orders', 'order_number');
begin
  if seq is not null then
    execute format('revoke all on sequence %s from anon, authenticated', seq);
    execute format('grant usage, select on sequence %s to service_role', seq);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- place_order: đặt hàng nguyên tử
-- -----------------------------------------------------------------------------
create or replace function public.place_order(
  p_profile_id        uuid,
  p_idempotency_key   uuid,
  p_recipient_name    text,
  p_phone             text,
  p_shipping_address  text,
  p_note              text,
  p_expected_total    bigint
)
returns table (out_order_id uuid, out_created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_lines    integer;
  v_items    integer;
  v_total    bigint;
begin
  -- 1. Tuần tự hoá mọi lượt đặt hàng của cùng user (2 tab bấm cùng lúc)
  perform 1 from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 2. Idempotency: khoá đã dùng -> trả đơn cũ
  select o.id into v_order_id
    from public.orders o
   where o.profile_id = p_profile_id and o.idempotency_key = p_idempotency_key;
  if found then
    return query select v_order_id, false;
    return;
  end if;

  -- 3. Khoá giỏ (FOR UPDATE) và giá sản phẩm (FOR SHARE: admin sửa giá phải chờ commit)
  perform 1
    from public.cart_items c
    join public.products p on p.id = c.product_id
   where c.profile_id = p_profile_id
     for update of c
     for share of p;

  select count(*), coalesce(sum(c.quantity), 0), coalesce(sum(p.price::bigint * c.quantity), 0)
    into v_lines, v_items, v_total
    from public.cart_items c
    join public.products p on p.id = c.product_id
   where c.profile_id = p_profile_id;

  if v_lines = 0 then
    raise exception 'CART_EMPTY' using errcode = 'P0001';
  end if;

  -- 4. Giá/sản phẩm/số lượng đã đổi so với những gì người mua thấy
  if v_total <> p_expected_total then
    raise exception 'CART_CHANGED' using errcode = 'P0001';
  end if;

  -- 5. Tạo đơn + dòng đơn (snapshot), xoá giỏ
  insert into public.orders (
    profile_id, idempotency_key, recipient_name, phone, shipping_address, note,
    item_count, total_amount
  ) values (
    p_profile_id, p_idempotency_key, p_recipient_name, p_phone, p_shipping_address, p_note,
    v_items, v_total
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, category_name, unit_price, quantity, position
  )
  select v_order_id, p.id, p.name, cat.name, p.price, c.quantity,
         (row_number() over (order by c.created_at desc, c.product_id) - 1)::smallint
    from public.cart_items c
    join public.products   p   on p.id   = c.product_id
    join public.categories cat on cat.id = p.category_id
   where c.profile_id = p_profile_id;

  delete from public.cart_items where profile_id = p_profile_id;

  return query select v_order_id, true;
end;
$$;

comment on function public.place_order(uuid, uuid, text, text, text, text, bigint) is
  'Đặt hàng nguyên tử (US-10). Chỉ service_role gọi (backend). Lỗi P0001 message: CART_EMPTY | CART_CHANGED | PROFILE_NOT_FOUND.';

revoke execute on function public.place_order(uuid, uuid, text, text, text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.place_order(uuid, uuid, text, text, text, text, bigint)
  to service_role;

-- Kiểm tra sau khi áp (tuỳ chọn):
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name in ('orders','order_items') order by 1, 2, 3;
-- select has_function_privilege('anon', 'public.place_order(uuid,uuid,text,text,text,text,bigint)', 'execute'),
--        has_function_privilege('authenticated', 'public.place_order(uuid,uuid,text,text,text,text,bigint)', 'execute'),
--        has_function_privilege('service_role', 'public.place_order(uuid,uuid,text,text,text,text,bigint)', 'execute');
--   -> false, false, true
