# Migrations (Supabase)

SQL migration + seed cho Supabase, đánh số thứ tự. Thiết kế chi tiết: `design/database/schema.md`.

| File | Nội dung | Môi trường |
|------|----------|------------|
| `001_create_profiles.sql` | Bảng `public.profiles`, constraints, trigger `updated_at`, bật RLS, thu hồi quyền anon/authenticated | Mọi môi trường |
| `002_create_avatars_bucket.sql` | Bucket private `avatars` (5MB, jpeg/png) | Mọi môi trường |
| `003_seed_profiles.sql` | 3 tài khoản mẫu (user mới, user đủ hồ sơ, admin) | **Chỉ dev/test** |
| `004_add_profiles_phone.sql` | Thêm cột `profiles.phone` (SĐT di động VN, tuỳ chọn) + CHECK định dạng | Mọi môi trường. Đã áp lên Supabase 2026-11-03 |
| `005_grant_profiles_service_role.sql` | `GRANT` quyền bảng `profiles` cho `service_role` (sửa lỗi `42501 permission denied` khi backend truy cập) | Mọi môi trường. Đã áp lên Supabase 2026-11-03 (cần cho API đăng ký) |
| `006_create_categories_products.sql` | Bảng `categories` (tên unique theo `lower(name)`, `slug`), `products` (FK `ON DELETE RESTRICT`, giá integer VND > 0, `image_path`), trigger `updated_at`, RLS bật, REVOKE anon/authenticated, GRANT `service_role`; seed 3 danh mục (Áo thun, Váy, Quần Jeans) | Mọi môi trường (seed danh mục là dữ liệu nền). Đã áp lên Supabase 2026-11-03 |
| `007_create_products_bucket.sql` | Bucket private `products` (5MB, jpeg/png) cho ảnh flat lay | Mọi môi trường. Đã áp lên Supabase 2026-11-03 |

## Trạng thái áp dụng

`006` và `007` (Sprint 2 – Task 1) đã áp lên Supabase qua MCP ngày 2026-11-03 (version `20261103120559`, `20261103120611`). Đã verify: `service_role` có quyền trên `categories`/`products`, `anon`/`authenticated` không có; RLS bật, 0 policy; 3 dòng seed danh mục; FK `ON DELETE RESTRICT`; bucket `products` private 5MB jpeg/png; kiểm thử ràng buộc trong transaction rollback (trùng tên khác hoa thường → `23505`, giá 0 → `23514`, `image_path` sai chủ → `23514`, xoá danh mục còn sản phẩm → `23503`).

`004` (thêm cột `phone`) và `005` (grant `service_role`), tạo và đã áp lên Supabase qua MCP ngày 2026-11-03 (verify: cột `phone` có, `service_role` có quyền, `anon`/`authenticated` không có quyền). `001`–`003` đã được áp lên Supabase (qua Supabase MCP) ngày 2026-10-28. Đã verify: `profiles` có 3 dòng seed và bật RLS; bucket `avatars` private, 5MB, jpeg/png. Supabase gán version theo timestamp (`20261028043521`…), tên migration khớp tên file.

## Cách áp dụng (Supabase SQL Editor)

1. Mở Supabase Dashboard → project → **SQL Editor** → New query.
2. Dán và chạy lần lượt **theo thứ tự số**: `001` → `002` → `003` → … → `007` (bỏ `003` trên production).
3. Mỗi file idempotent: chạy lại không lỗi, không xoá dữ liệu.
4. Kiểm tra:
   ```sql
   select id, email, role, height_cm, weight_kg from public.profiles;
   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
   ```
5. Kiểm tra bảo mật: gọi PostgREST bằng **anon key** phải không đọc được `profiles`
   (`GET {SUPABASE_URL}/rest/v1/profiles` với header `apikey: <anon key>` → lỗi quyền hoặc mảng rỗng).

Nếu dùng Supabase CLI (`supabase db push`), copy các file vào `supabase/migrations/` với tiền tố timestamp theo quy ước CLI; nội dung giữ nguyên.

## Quy ước

- Tên file: `NNN_<hành_động>_<đối_tượng>.sql`, số tăng dần, không sửa file đã áp dụng – thay đổi schema bằng file mới.
- Mỗi file có comment đầu file mô tả mục đích, phụ thuộc, môi trường.
- Seed chỉ dùng mật khẩu dev, UUID cố định, `on conflict do nothing`.
