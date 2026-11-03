-- =============================================================================
-- 001_create_profiles.sql
-- Sprint 1 – Task 3: Thiết kế Database (US-01 đăng ký/đăng nhập, US-02 hồ sơ)
--
-- Tạo bảng public.profiles: tài khoản + hồ sơ người dùng.
-- - KHÔNG dùng Supabase Auth (auth.users): backend Express tự hash mật khẩu
--   (bcrypt) và tự phát hành JWT.
-- - Chỉ backend (service role key, bypass RLS) được truy cập bảng này.
--   RLS bật, KHÔNG có policy cho anon/authenticated => PostgREST với anon key
--   không đọc/ghi được gì.
-- - Idempotent: chạy lại nhiều lần không lỗi, không mất dữ liệu.
--
-- Chạy trong Supabase SQL Editor (Postgres 15+). Xem migrations/README.md.
-- =============================================================================

-- gen_random_uuid() có sẵn trong Postgres 13+ (core), không cần extension.

create table if not exists public.profiles (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null,
  password_hash  text        not null,             -- bcrypt; KHÔNG BAO GIỜ trả về client
  display_name   text,
  height_cm      numeric(4,1),                     -- 100.0 – 250.0, null khi chưa nhập
  weight_kg      numeric(4,1),                     -- 30.0 – 250.0, null khi chưa nhập
  avatar_path    text,                             -- object path trong bucket 'avatars', null khi chưa có ảnh
  role           text        not null default 'user',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Email lưu dạng chuẩn hoá: lowercase, không khoảng trắng đầu/cuối.
  -- Backend phải chuẩn hoá (trim + toLowerCase) trước khi insert/tìm kiếm.
  constraint profiles_email_unique     unique (email),
  constraint profiles_email_normalized check (email = lower(btrim(email))),
  constraint profiles_email_format     check (
    char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint profiles_password_hash_bcrypt check (password_hash ~ '^\$2[aby]\$\d{2}\$.{53}$'),
  constraint profiles_display_name_length  check (
    display_name is null or char_length(btrim(display_name)) between 1 and 50
  ),
  constraint profiles_height_range check (height_cm is null or height_cm between 100 and 250),
  constraint profiles_weight_range check (weight_kg is null or weight_kg between 30 and 250),
  constraint profiles_avatar_path_owner check (
    avatar_path is null or avatar_path like (id::text || '/%')
  ),
  constraint profiles_role_check check (role in ('user', 'admin'))
);

comment on table  public.profiles is 'Tài khoản + hồ sơ người dùng (US-01, US-02). Chỉ backend truy cập qua service role.';
comment on column public.profiles.email         is 'Email đăng nhập, lowercase, unique.';
comment on column public.profiles.password_hash is 'bcrypt hash. Tuyệt đối không select/trả về client.';
comment on column public.profiles.height_cm     is 'Chiều cao (cm), 100–250, 1 chữ số thập phân.';
comment on column public.profiles.weight_kg     is 'Cân nặng (kg), 30–250, 1 chữ số thập phân.';
comment on column public.profiles.avatar_path   is 'Object path trong bucket avatars: {user_id}/avatar-{epoch_ms}.{jpg|png}. Backend tạo signed URL khi trả về.';
comment on column public.profiles.role          is 'user | admin (admin dùng cho Epic 2).';

-- Index: unique constraint trên email đã tạo sẵn btree index (dùng cho login/
-- check trùng). Không tạo thêm index nào khác ở sprint 1 (truy vấn còn lại đều theo PK).

-- -----------------------------------------------------------------------------
-- Trigger tự cập nhật updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'Trigger BEFORE UPDATE: gán updated_at = now(). Dùng chung cho các bảng sau.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Bảo mật: RLS bật, không policy cho anon/authenticated; thu hồi quyền mặc định
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Supabase mặc định GRANT bảng mới trong schema public cho anon/authenticated.
-- Thu hồi để phòng thủ nhiều lớp (kể cả khi ai đó lỡ tạo policy sau này).
revoke all on table public.profiles from anon, authenticated;
-- (set_updated_at() trả về kiểu trigger nên không gọi trực tiếp qua RPC được.)
