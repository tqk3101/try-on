-- =============================================================================
-- 007_create_products_bucket.sql
-- Sprint 2 – Task 1: Storage cho ảnh flat lay sản phẩm (US-04)
--
-- Tạo bucket PRIVATE 'products' (nhất quán với 'avatars'):
-- - Backend (service role) upload/xoá; client chỉ nhận signed URL có thời hạn.
-- - Giới hạn 5MB, chỉ image/jpeg, image/png (Storage tự từ chối nếu vi phạm).
-- - KHÔNG tạo policy trên storage.objects cho anon/authenticated.
-- - Quy ước object path: {product_id}/flatlay-{epoch_ms}.{jpg|png}
--   (khớp CHECK products_image_path_owner ở 006).
-- - Idempotent: chạy lại sẽ đồng bộ cấu hình bucket, không xoá object.
--
-- Chạy sau 006. Xem migrations/README.md.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  false,
  5242880,                                -- 5 MB = 5 * 1024 * 1024 bytes
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Kiểm tra nhanh (tuỳ chọn):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'products';
