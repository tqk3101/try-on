-- =============================================================================
-- 008_create_try_on_results.sql
-- Sprint 3 – Task 1: Phòng thử đồ (US-05, US-06)
--
-- TRẠNG THÁI: CHƯA ÁP (viết 2026-11-17; Q12 đã chốt 2026-11-17: provider thật
-- = gemini, stub mặc định – chỉ sửa comment, cấu trúc không đổi; Q13–Q22 đã chốt (2026-11-17), giữ cột try_on_consent_at
-- (xem design/flows/README.md mục 7). Áp qua Supabase MCP theo CLAUDE.md.
--
-- 1. profiles.try_on_consent_at: thời điểm người dùng đồng ý gửi ảnh toàn thân
--    tới dịch vụ AI (Q14). Null = chưa đồng ý.
-- 2. public.try_on_results: cache kết quả + nhật ký job sinh ảnh thử đồ.
--    - Khoá cache: (profile_id, product_id, input_key); input_key = sha256 hex
--      của provider, model, phiên bản prompt (hằng promptVersion trong
--      backend, không có cột riêng), avatar_path, products.image_path (+ số đo
--      nếu provider dùng) – backend tính.
--    - Tối đa 1 job đang chạy và 1 kết quả succeeded cho mỗi khoá (unique
--      index một phần); request song song -> 23505 -> backend đọc lại row.
--    - FK ON DELETE CASCADE tới profiles và products. Object Storage KHÔNG tự
--      xoá theo: backend phải lấy result_path trước rồi xoá object
--      (design/flows/try-on-room.md mục 8).
-- - Chỉ backend truy cập: RLS bật, KHÔNG policy, REVOKE anon/authenticated,
--   GRANT tường minh cho service_role (common_errors 1.1).
-- - Tái dùng public.set_updated_at() (001).
-- - Idempotent: chạy lại không lỗi, không mất dữ liệu.
--
-- Phụ thuộc: 001, 006. Chạy trước 009. Xem migrations/README.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles.try_on_consent_at
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists try_on_consent_at timestamptz;

comment on column public.profiles.try_on_consent_at is
  'Thời điểm user đồng ý gửi ảnh toàn thân tới dịch vụ AI thử đồ (Sprint 3). Null = chưa đồng ý.';

-- -----------------------------------------------------------------------------
-- try_on_results
-- -----------------------------------------------------------------------------
create table if not exists public.try_on_results (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        not null
                                  references public.profiles (id) on delete cascade,
  product_id          uuid        not null
                                  references public.products (id) on delete cascade,
  input_key           text        not null,
  avatar_path         text        not null,   -- snapshot avatar_path lúc tạo job
  product_image_path  text        not null,   -- snapshot products.image_path lúc tạo job
  provider            text        not null,   -- 'stub' | 'gemini'
  model               text,                   -- tên model thực dùng, vd gemini-3.1-flash-image
  status              text        not null default 'pending',
  result_path         text,                   -- object path bucket try-on-results
  error_code          text,
  provider_job_id     text,                   -- id phía provider để debug (Gemini: responseId), không trả client
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz,

  constraint try_on_results_status_check
    check (status in ('pending', 'processing', 'succeeded', 'failed')),
  constraint try_on_results_input_key_format
    check (input_key ~ '^[0-9a-f]{64}$'),
  constraint try_on_results_provider_format
    check (provider ~ '^[a-z0-9_-]{1,30}$'),
  -- succeeded <=> có result_path
  constraint try_on_results_result_matches_status
    check ((status = 'succeeded') = (result_path is not null)),
  -- failed => có error_code; error_code là mã cố định viết hoa
  constraint try_on_results_error_code_check
    check (
      (status <> 'failed' or error_code is not null)
      and (error_code is null or error_code ~ '^[A-Z_]{1,40}$')
    ),
  -- đã kết thúc <=> có completed_at
  constraint try_on_results_completed_matches_status
    check ((status in ('succeeded', 'failed')) = (completed_at is not null)),
  -- Path phải thuộc đúng chủ sở hữu (giống products_image_path_owner, profiles_avatar_path_owner)
  constraint try_on_results_avatar_path_owner
    check (avatar_path like profile_id::text || '/%'),
  constraint try_on_results_product_image_path_owner
    check (product_image_path like product_id::text || '/%'),
  constraint try_on_results_result_path_owner
    check (
      result_path is null
      or result_path like profile_id::text || '/' || product_id::text || '/%'
    )
);

comment on table public.try_on_results is
  'Cache + nhật ký job sinh ảnh thử đồ GenAI (US-05/06). Chỉ backend truy cập qua service role.';
comment on column public.try_on_results.input_key is
  'sha256 hex của (provider, model, prompt version, avatar_path, product image_path[, số đo]). Đổi đầu vào -> khoá mới.';

-- 1 kết quả thành công cho mỗi khoá cache
create unique index if not exists try_on_results_succeeded_unique
  on public.try_on_results (profile_id, product_id, input_key)
  where status = 'succeeded';

-- 1 job đang chạy cho mỗi khoá cache (chống sinh trùng khi request song song / prefetch)
create unique index if not exists try_on_results_active_unique
  on public.try_on_results (profile_id, product_id, input_key)
  where status in ('pending', 'processing');

-- Đếm hạn mức ngày theo user (profile_id, created_at >= đầu ngày giờ VN)
create index if not exists try_on_results_profile_created_idx
  on public.try_on_results (profile_id, created_at);

-- Dọn kết quả khi admin thay/xoá ảnh sản phẩm (where product_id = $1)
create index if not exists try_on_results_product_id_idx
  on public.try_on_results (product_id);

drop trigger if exists try_on_results_set_updated_at on public.try_on_results;
create trigger try_on_results_set_updated_at
  before update on public.try_on_results
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Bảo mật: RLS bật, không policy; chỉ service_role
-- -----------------------------------------------------------------------------
alter table public.try_on_results enable row level security;

revoke all on table public.try_on_results from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.try_on_results to service_role;

-- Kiểm tra sau khi áp (tuỳ chọn):
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'try_on_results';
-- select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name = 'try_on_consent_at';
