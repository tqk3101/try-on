-- =============================================================================
-- 002_create_avatars_bucket.sql
-- Sprint 1 – Task 3: Storage cho ảnh toàn thân (US-02)
--
-- Tạo bucket PRIVATE 'avatars':
-- - Ảnh toàn thân là dữ liệu nhạy cảm => không public; backend (service role)
--   upload/xoá và cấp signed URL có thời hạn cho client.
-- - Giới hạn 5MB, chỉ image/jpeg, image/png (Storage tự từ chối nếu vi phạm).
-- - KHÔNG tạo policy trên storage.objects cho anon/authenticated => chỉ service
--   role truy cập được object trong bucket này.
-- - Quy ước object path: {user_id}/avatar-{epoch_ms}.{jpg|png}
-- - Idempotent: chạy lại sẽ đồng bộ cấu hình bucket, không xoá object.
--
-- Chạy trong Supabase SQL Editor sau 001. Xem migrations/README.md.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,                                -- 5 MB = 5 * 1024 * 1024 bytes
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Kiểm tra nhanh (tuỳ chọn):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
