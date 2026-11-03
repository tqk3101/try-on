-- =============================================================================
-- 005_grant_profiles_service_role.sql
-- Sprint 1 – Task 5: cấp quyền bảng profiles cho service_role
--
-- Vấn đề: backend (service role key) gọi bảng profiles bị lỗi
--   42501 permission denied for table profiles
-- vì project Supabase này KHÔNG tự GRANT bảng mới trong schema public cho
-- service_role (migration 001 chỉ REVOKE anon/authenticated, giả định mặc định
-- đã có quyền). service_role bypass RLS nhưng vẫn cần GRANT mức bảng.
--
-- Cấp đúng quyền cần dùng cho service_role; KHÔNG cấp lại cho anon/authenticated
-- (giữ nguyên thiết kế: chỉ backend truy cập, RLS bật, không policy).
-- Idempotent: GRANT chạy lại nhiều lần không lỗi.
--
-- Chạy sau 001. Xem migrations/README.md.
-- =============================================================================

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.profiles to service_role;

-- Kiểm tra nhanh (tuỳ chọn):
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'profiles' order by grantee, privilege_type;
-- Kỳ vọng: service_role có SELECT/INSERT/UPDATE/DELETE; anon và authenticated không có dòng nào.
