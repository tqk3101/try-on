-- =============================================================================
-- 009_create_try_on_results_bucket.sql
-- Sprint 3 – Task 1: Storage cho ảnh kết quả thử đồ (US-05, US-06)
--
-- TRẠNG THÁI: CHƯA ÁP (viết 2026-11-17). Áp sau 008 qua Supabase MCP.
--
-- Tạo bucket PRIVATE 'try-on-results' (nhất quán 'avatars', 'products'):
-- - Ảnh chứa hình người dùng -> dữ liệu nhạy cảm, chỉ chủ sở hữu xem qua
--   signed URL (TTL 3600 s) do backend cấp.
-- - Giới hạn 10MB (ảnh sinh ra có thể là PNG độ phân giải cao),
--   image/jpeg, image/png, image/webp.
-- - KHÔNG tạo policy trên storage.objects cho anon/authenticated.
-- - Object path: {profile_id}/{product_id}/{try_on_result_id}.{jpg|png|webp}
--   (khớp CHECK try_on_results_result_path_owner ở 008).
-- - Idempotent: chạy lại sẽ đồng bộ cấu hình bucket, không xoá object.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'try-on-results',
  'try-on-results',
  false,
  10485760,                               -- 10 MB = 10 * 1024 * 1024 bytes
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Kiểm tra nhanh (tuỳ chọn):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'try-on-results';
