-- =============================================================================
-- 003_seed_profiles.sql
-- Sprint 1 – Task 3: Dữ liệu mẫu cho bảng profiles (US-01, US-02)
--
-- CHỈ DÙNG CHO MÔI TRƯỜNG DEV/TEST. KHÔNG chạy trên production.
-- Mật khẩu plaintext tương ứng ghi trong design/database/schema.md (mục Seed).
-- password_hash là bcrypt thật (cost 10), sinh bằng package bcrypt của backend.
--
-- Tài khoản:
--   1. newuser@tryon.dev – user mới đăng ký, chưa có số đo/ảnh (test US-02 lần đầu)
--   2. member@tryon.dev  – user đã có tên + số đo; chưa có ảnh (avatar_path = null
--                          vì không seed file thật lên Storage; upload qua UI để test)
--   3. admin@tryon.dev   – admin (dành cho Epic 2), hồ sơ tối thiểu
--
-- Idempotent: UUID cố định + ON CONFLICT DO NOTHING (trùng id hoặc email đều bỏ qua).
-- Chạy sau 001.
-- =============================================================================

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
