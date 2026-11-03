-- =============================================================================
-- 006_create_categories_products.sql
-- Sprint 2 – Task 1: Thiết kế Database cho kho hàng (US-03 danh mục, US-04 sản phẩm)
--
-- Tạo bảng public.categories và public.products.
-- - Chỉ backend (service role key) truy cập: RLS bật, KHÔNG policy, REVOKE
--   anon/authenticated, GRANT tường minh cho service_role (common_errors 1.1:
--   project này không tự grant bảng mới cho service_role).
-- - Xoá danh mục còn sản phẩm bị CHẶN: FK ON DELETE RESTRICT (lỗi 23503,
--   backend map 409 CATEGORY_NOT_EMPTY).
-- - Giá: integer VND > 0. Không có cột ẩn/hiện sản phẩm.
-- - Tái dùng hàm trigger public.set_updated_at() tạo ở 001.
-- - Seed 3 danh mục theo PB (Áo thun, Váy, Quần Jeans) – dữ liệu nền, mọi môi trường.
-- - Idempotent: chạy lại không lỗi, không mất dữ liệu.
--
-- Phụ thuộc: 001 (public.set_updated_at). Xem migrations/README.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Tên lưu đã trim, 1–50 ký tự. Backend trim trước khi ghi.
  constraint categories_name_trimmed check (name = btrim(name)),
  constraint categories_name_length  check (char_length(name) between 1 and 50),
  -- Slug: chữ thường không dấu, số, gạch nối (vd 'quan-jeans'). Backend sinh từ name.
  constraint categories_slug_format  check (
    char_length(slug) between 1 and 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint categories_slug_unique  unique (slug)
);

-- Tên duy nhất không phân biệt hoa thường ('Váy' = 'VÁY'). Vi phạm -> 23505 -> 409.
create unique index if not exists categories_name_lower_unique
  on public.categories (lower(name));

comment on table  public.categories      is 'Danh mục sản phẩm (US-03). Chỉ backend truy cập qua service role.';
comment on column public.categories.name is 'Tên hiển thị, đã trim, 1–50 ký tự, unique theo lower(name).';
comment on column public.categories.slug is 'Định danh URL không dấu, unique; backend sinh từ name (sinh lại khi đổi tên).';

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id           uuid        primary key default gen_random_uuid(),
  category_id  uuid        not null
                           references public.categories (id)
                           on update cascade
                           on delete restrict,
  name         text        not null,
  price        integer     not null,             -- VND, số nguyên
  image_path   text        not null,             -- object path trong bucket 'products'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint products_name_trimmed check (name = btrim(name)),
  constraint products_name_length  check (char_length(name) between 1 and 100),
  constraint products_price_positive check (price > 0),
  -- Ảnh flat lay thuộc đúng sản phẩm: {product_id}/flatlay-{epoch_ms}.{jpg|png}
  constraint products_image_path_owner check (image_path like (id::text || '/%'))
);

-- Lọc theo danh mục + sắp xếp ổn định (Sprint 3: "sản phẩm đầu tiên" của danh mục).
-- Cột đầu category_id cũng phục vụ kiểm tra FK khi xoá danh mục.
create index if not exists products_category_id_created_at_idx
  on public.products (category_id, created_at, id);

comment on table  public.products            is 'Sản phẩm (US-04). Chỉ backend truy cập qua service role.';
comment on column public.products.category_id is 'FK categories.id, ON DELETE RESTRICT (xoá danh mục còn sản phẩm bị chặn).';
comment on column public.products.price      is 'Giá VND, số nguyên > 0.';
comment on column public.products.image_path is 'Object path trong bucket products: {product_id}/flatlay-{epoch_ms}.{jpg|png}. Backend tạo signed URL khi trả về.';

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Bảo mật: RLS bật, không policy; chỉ service_role có quyền
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products   enable row level security;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.products   from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.categories to service_role;
grant select, insert, update, delete on table public.products   to service_role;

-- -----------------------------------------------------------------------------
-- Seed: 3 danh mục mẫu theo PB (idempotent: bỏ qua nếu trùng tên/slug)
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug)
values
  ('Áo thun',    'ao-thun'),
  ('Váy',        'vay'),
  ('Quần Jeans', 'quan-jeans')
on conflict do nothing;

-- Kiểm tra nhanh (tuỳ chọn):
-- select name, slug from public.categories order by created_at;
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name in ('categories','products') order by 1,2,3;
