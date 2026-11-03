create table if not exists public.profiles (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null,
  password_hash  text        not null,
  display_name   text,
  height_cm      numeric(4,1),
  weight_kg      numeric(4,1),
  avatar_path    text,
  role           text        not null default 'user',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
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
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into public.profiles (id, email, password_hash, display_name, height_cm, weight_kg, avatar_path, role)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'newuser@tryon.dev',
    '$2b$10$mnY4boIl3sg7.nuujWxaWuK7dNVLkjAVy5uj.Vy3JIVTvdc.nTNw2',
    null, null, null, null,
    'user'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'member@tryon.dev',
    '$2b$10$hIiRAckTygJscjEHsp7FcOscFjk9apsUZw2Qg9JDDTM33g3bpCG1C',
    'Lan Anh', 162.0, 50.5, null,
    'user'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'admin@tryon.dev',
    '$2b$10$LvVFVKDzZIXpmrQiywmq3eQl184Xc48n.gV8JDvrDwGsjO8sNFZXO',
    'Quản trị viên', null, null, null,
    'admin'
  )
on conflict do nothing;
