-- =============================================================================
-- 010_create_cart_items.sql
-- Sprint 4 – Task 1: Giỏ hàng (US-07 thêm vào giỏ, US-08 xem giỏ + tổng tiền)
--
-- TRẠNG THÁI: ĐÃ ÁP qua Supabase MCP ngày 2026-11-18 (đã verify GRANT/RLS).
-- Q23, Q25, Q33 đã chốt 2026-11-18 (design/flows/README.md mục 7). Áp TUẦN TỰ
-- trước 011 (common_errors 1.4). Không sửa file đã áp.
--
-- public.cart_items: mỗi dòng = 1 sản phẩm trong giỏ của 1 user.
-- - PK (profile_id, product_id): mỗi sản phẩm tối đa 1 dòng/giỏ; thêm lại sản
--   phẩm đã có -> backend tăng quantity (Q26), không tạo dòng mới.
-- - KHÔNG lưu giá: tổng tiền luôn tính ở server từ products.price hiện tại;
--   giá chốt lúc đặt hàng (snapshot trong order_items, migration 011).
-- - quantity 1..10 (Q25/Q33). Giới hạn 50 dòng/giỏ kiểm tra ở backend (mềm).
-- - FK ON DELETE CASCADE tới profiles và products: sản phẩm bị admin xoá thì
--   tự biến khỏi giỏ (Q30). Không có object Storage nào cần dọn.
-- - Chỉ backend truy cập: RLS bật, KHÔNG policy, REVOKE anon/authenticated,
--   GRANT tường minh cho service_role (common_errors 1.1).
-- - Tái dùng public.set_updated_at() (001).
-- - Idempotent: chạy lại không lỗi, không mất dữ liệu.
--
-- Phụ thuộc: 001, 006. Chạy trước 011. Xem migrations/README.md.
-- =============================================================================

create table if not exists public.cart_items (
  profile_id  uuid        not null
                          references public.profiles (id) on delete cascade,
  product_id  uuid        not null
                          references public.products (id) on delete cascade,
  quantity    smallint    not null default 1,
  created_at  timestamptz not null default now(),   -- thời điểm thêm lần đầu (sắp xếp giỏ)
  updated_at  timestamptz not null default now(),

  constraint cart_items_pkey primary key (profile_id, product_id),
  constraint cart_items_quantity_range check (quantity between 1 and 10)
);

comment on table  public.cart_items          is 'Giỏ hàng (US-07/08). Không lưu giá; tổng tính ở server từ products.price. Chỉ backend truy cập qua service role.';
comment on column public.cart_items.quantity is 'Số lượng 1..10 (Q25, Q33).';

-- PK (profile_id, product_id) phục vụ đọc giỏ theo user.
-- Index product_id phục vụ FK cascade khi admin xoá sản phẩm.
create index if not exists cart_items_product_id_idx
  on public.cart_items (product_id);

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Bảo mật: RLS bật, không policy; chỉ service_role
-- -----------------------------------------------------------------------------
alter table public.cart_items enable row level security;

revoke all on table public.cart_items from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.cart_items to service_role;

-- Kiểm tra sau khi áp (tuỳ chọn):
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'cart_items' order by 1, 2;
-- select relrowsecurity from pg_class where oid = 'public.cart_items'::regclass;
