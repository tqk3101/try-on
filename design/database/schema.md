# Thiết kế Database & Storage

> Phạm vi hiện tại: **Sprint 1** (US-01, US-02) + **Sprint 2** (US-03 danh mục, US-04 sản phẩm). Migrations: `migrations/001` → `007` (`004` cột `phone`, `005` grant `service_role` – áp 2026-11-03; `006` bảng `categories`/`products` + seed 3 danh mục, `007` bucket `products` – áp 2026-11-03).

## Mục lục
1. [Nguyên tắc kiến trúc](#1-nguyên-tắc-kiến-trúc)
2. [ERD](#2-erd)
3. [Bảng `profiles`](#3-bảng-profiles)
4. [Storage: bucket `avatars`](#4-storage-bucket-avatars)
5. [Bảo mật: RLS & quyền](#5-bảo-mật-rls--quyền)
6. [Ánh xạ trường API ↔ cột DB](#6-ánh-xạ-trường-api--cột-db)
7. [Seed (dev)](#7-seed-dev)
8. [Quyết định thiết kế](#8-quyết-định-thiết-kế)
9. [Mở rộng cho sprint sau](#9-mở-rộng-cho-sprint-sau)
10. [Bảng `categories` (Sprint 2)](#10-bảng-categories-sprint-2)
11. [Bảng `products` (Sprint 2)](#11-bảng-products-sprint-2)
12. [Storage: bucket `products` (Sprint 2)](#12-storage-bucket-products-sprint-2)

## 1. Nguyên tắc kiến trúc

- **Không dùng Supabase Auth** (`auth.users`). Backend Express tự hash mật khẩu (`bcrypt`) và phát hành JWT; `profiles` tự chứa `email` + `password_hash`.
- **Chỉ backend truy cập Supabase**, bằng service role key (bypass RLS). Frontend không bao giờ gọi Supabase trực tiếp, không có anon key.
- Tên bảng/cột tiếng Anh `snake_case`; thời gian `timestamptz` (UTC).

## 2. ERD

```mermaid
erDiagram
    PROFILES {
        uuid id PK "default gen_random_uuid()"
        text email UK "lowercase, not null"
        text password_hash "bcrypt, never returned"
        text display_name "nullable, 1-50 ký tự"
        numeric height_cm "numeric(4,1), nullable, 100-250"
        numeric weight_kg "numeric(4,1), nullable, 30-250"
        text avatar_path "nullable, object path trong bucket avatars"
        text phone "nullable, SĐT di động VN dạng 0xxxxxxxxx (migration 004)"
        text role "user | admin, default user"
        timestamptz created_at
        timestamptz updated_at "trigger tự cập nhật"
    }
    STORAGE_OBJECTS_AVATARS {
        text bucket_id "= 'avatars'"
        text name "{user_id}/avatar-{epoch_ms}.{jpg|png}"
    }
    PROFILES ||--o| STORAGE_OBJECTS_AVATARS : "avatar_path trỏ tới (logic, không FK)"

    CATEGORIES {
        uuid id PK "default gen_random_uuid()"
        text name UK "trim, 1-50 ký tự, unique theo lower(name)"
        text slug UK "a-z0-9 và '-', backend sinh từ name"
        timestamptz created_at
        timestamptz updated_at "trigger"
    }
    PRODUCTS {
        uuid id PK "backend sinh trước khi upload ảnh"
        uuid category_id FK "ON DELETE RESTRICT"
        text name "trim, 1-100 ký tự"
        integer price "VND, > 0"
        text image_path "not null, object path trong bucket products"
        timestamptz created_at
        timestamptz updated_at "trigger"
    }
    STORAGE_OBJECTS_PRODUCTS {
        text bucket_id "= 'products'"
        text name "{product_id}/flatlay-{epoch_ms}.{jpg|png}"
    }
    CATEGORIES ||--o{ PRODUCTS : "có (xoá danh mục còn SP bị chặn)"
    PRODUCTS ||--|| STORAGE_OBJECTS_PRODUCTS : "image_path trỏ tới (logic, không FK)"
```

## 3. Bảng `profiles`

| Cột | Kiểu | Null | Mặc định | Ràng buộc / ghi chú |
|-----|------|------|----------|---------------------|
| `id` | `uuid` | không | `gen_random_uuid()` | PK. Dùng làm `sub` trong JWT |
| `email` | `text` | không | | `UNIQUE`; `CHECK email = lower(btrim(email))`; `CHECK` định dạng cơ bản, ≤ 254 ký tự |
| `password_hash` | `text` | không | | `CHECK` định dạng bcrypt (`$2a/$2b/$2y$`, 60 ký tự). **Không bao giờ select/trả về client** |
| `display_name` | `text` | có | `null` | Nếu có: 1–50 ký tự sau trim |
| `height_cm` | `numeric(4,1)` | có | `null` | 100–250 khi không null. Null = chưa nhập (user mới) |
| `weight_kg` | `numeric(4,1)` | có | `null` | 30–250 khi không null |
| `avatar_path` | `text` | có | `null` | Object path trong bucket `avatars`; `CHECK` phải bắt đầu bằng `{id}/` |
| `phone` | `text` | có | `null` | Thêm ở migration `004`. Số di động VN chuẩn hoá `0xxxxxxxxx` (10 số, đầu 03/05/07/08/09); `CHECK profiles_phone_format`. Không unique |
| `role` | `text` | không | `'user'` | `CHECK role in ('user','admin')` – admin dùng cho Epic 2 |
| `created_at` | `timestamptz` | không | `now()` | |
| `updated_at` | `timestamptz` | không | `now()` | Trigger `profiles_set_updated_at` (BEFORE UPDATE) gọi `public.set_updated_at()` |

**Indexes**
- `profiles_pkey` (id) – lấy/cập nhật hồ sơ theo `sub` trong JWT.
- `profiles_email_unique` (email) – btree do unique constraint tạo; phục vụ login và check trùng.
- Không thêm index khác ở sprint 1 (bảng nhỏ, mọi truy vấn theo PK/email). Index `role` cân nhắc khi có màn hình quản lý user.

**Quy tắc backend phải tuân theo**
- Chuẩn hoá email `trim().toLowerCase()` **trước** khi insert và khi tìm lúc login. DB chặn email chưa chuẩn hoá bằng CHECK (lỗi `23514`), chặn trùng bằng UNIQUE (lỗi `23505` → map `409 EMAIL_EXISTS`).
- Validate ở backend trước (thông báo thân thiện), CHECK ở DB là lớp phòng thủ cuối.
- Luôn select cột tường minh, không `select *` (tránh lộ `password_hash`).
- `phone`: chuẩn hoá **trước** khi ghi: bỏ khoảng trắng, `.`, `-`, `(`, `)`; đầu `+84`/`84` đổi thành `0`; rỗng → `null`. Sau chuẩn hoá phải khớp `^0[35789][0-9]{8}$`, nếu không trả `VALIDATION_ERROR`.
- `height_cm`/`weight_kg`: nhận số, làm tròn 1 chữ số thập phân; PostgREST trả `numeric` dạng số JSON.
- bcrypt cost khuyến nghị 10–12 (seed dùng 10). bcrypt chỉ xử lý 72 byte đầu → giới hạn mật khẩu tối đa 72 ký tự ở validate.

## 4. Storage: bucket `avatars`

| Thuộc tính | Giá trị |
|------------|---------|
| Bucket id/name | `avatars` |
| Public | **false (private)** |
| `file_size_limit` | 5242880 (5 MB) |
| `allowed_mime_types` | `image/jpeg`, `image/png` |
| Object path | `{user_id}/avatar-{epoch_ms}.{jpg\|png}` |
| Truy cập | Chỉ backend (service role). Client nhận **signed URL** (TTL khuyến nghị 1 giờ) |

**Luồng thay ảnh (mỗi user đúng 1 ảnh)**
1. Backend validate loại/dung lượng (và dimension nếu có), upload object mới với path có timestamp.
2. Cập nhật `profiles.avatar_path` = path mới.
3. Nếu bước 2 lỗi → xoá object vừa upload. Nếu thành công → xoá object cũ (best-effort, lỗi xoá chỉ log, không fail request).
4. Trả về `avatarUrl` = signed URL của path mới.

**Luồng xoá ảnh** (`DELETE /api/user/profile/avatar`): đặt `profiles.avatar_path = null` **trước**, sau đó xoá object cũ (best-effort, lỗi chỉ log). Làm theo thứ tự này để `avatar_path` không bao giờ trỏ tới file đã mất; lỗi xoá Storage chỉ để lại file mồ côi. `avatar_path` đã nullable nên không cần migration.

Path có timestamp thay vì ghi đè `avatar.<ext>` để: tránh cache trình duyệt/CDN hiển thị ảnh cũ, không để rác khi đổi đuôi jpg↔png, và không mất ảnh cũ nếu cập nhật DB thất bại.

## 5. Bảo mật: RLS & quyền

- `profiles`: **bật RLS, không có policy nào** cho `anon`/`authenticated` + `REVOKE ALL` khỏi hai role này. Service role có `BYPASSRLS` nên backend vẫn hoạt động. Kết quả: dù anon key bị lộ, PostgREST không đọc/ghi được `profiles` (email, hash, số đo cơ thể).
- **`service_role` cần GRANT mức bảng**: bypass RLS không thay thế GRANT. Project Supabase này không tự cấp quyền cho bảng mới, nên migration `005` cấp `select, insert, update, delete` trên `profiles` cho `service_role`. **Mọi bảng mới ở sprint sau phải có `grant ... to service_role` trong migration tạo bảng** (và không cấp cho `anon`/`authenticated`).
- `categories`, `products` (migration `006`): cùng mô hình – RLS bật, 0 policy, `REVOKE ALL` anon/authenticated, `GRANT select, insert, update, delete` cho `service_role` ngay trong migration tạo bảng. Đã verify 2026-11-03: `service_role` có quyền (project còn tự gán thêm `REFERENCES/TRIGGER/TRUNCATE`, giống `profiles`), anon/authenticated không có dòng nào.
- `storage.objects` (bucket `avatars`, `products`): **không tạo policy** cho anon/authenticated → chỉ service role upload/đọc/xoá; bucket private nên không có URL public.
- Service role key chỉ nằm trong `backend/.env`, không bao giờ gửi về frontend hay log.
- Dữ liệu nhạy cảm (ảnh toàn thân, chiều cao, cân nặng): không log, chỉ trả cho chính chủ (lọc theo `id = sub` của JWT).

## 6. Ánh xạ trường API ↔ cột DB

API dùng `camelCase`, DB dùng `snake_case`. API contract chi tiết: `design/flows/README.md` (Sprint 2: `category-management.md`, `product-management.md`).

| Trường API | Cột DB | Dùng ở | Ghi chú |
|------------|--------|--------|---------|
| `id` | `id` | login response, profile | `sub` trong JWT |
| `email` | `email` | register, login, profile (read-only) | lowercase |
| `password` (request) | `password_hash` | register, login | Chỉ nhận vào, hash/so sánh; không bao giờ có trong response |
| `displayName` | `display_name` | GET/PUT `/api/user/profile` | |
| `heightCm` | `height_cm` | GET/PUT `/api/user/profile` | 100–250 |
| `weightKg` | `weight_kg` | GET/PUT `/api/user/profile` | 30–250 |
| `phone` | `phone` | GET/PUT `/api/user/profile` | Tuỳ chọn; nhận nhiều dạng, lưu/trả dạng `0xxxxxxxxx` hoặc `null` |
| `avatarUrl` (response) | `avatar_path` | GET/PUT `/api/user/profile` | Backend tạo signed URL từ path; `null` nếu chưa có ảnh |
| `avatar` (file upload) | `avatar_path` | PUT `/api/user/profile/avatar` (endpoint riêng, xem `design/flows/avatar-upload.md`) | multipart, ≤ 5MB, jpeg/png |
| `role` | `role` | login response, JWT claim | `user` \| `admin` |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | profile, category, product | |
| `name` | `categories.name` / `products.name` | API danh mục / sản phẩm (Sprint 2) | Backend trim trước khi ghi |
| `slug` | `categories.slug` | API danh mục (response) | Backend sinh, client không gửi |
| `categoryId` (request, query) | `products.category_id` | POST/PUT sản phẩm, `GET /api/admin/products?categoryId=` | uuid danh mục tồn tại |
| `category` (response) | join `categories` (`id, name, slug`) | `AdminProduct` | Response không có `categoryId` thô |
| `productCount` (response) | `count(products)` theo `category_id` | `AdminCategory` | Embed count PostgREST |
| `price` | `products.price` | API sản phẩm | Số nguyên VND > 0 |
| `imageUrl` (response) | `products.image_path` | API sản phẩm | Signed URL bucket `products`; không trả `image_path` |
| `image` (file upload) | `products.image_path` | POST/PUT sản phẩm (multipart) | ≤ 5MB, jpeg/png (magic bytes) |

## 7. Seed (dev)

File `migrations/003_seed_profiles.sql`. **Chỉ dùng dev/test, không chạy production.** Hash bcrypt thật (cost 10). Mật khẩu plaintext KHÔNG nằm trong repo (repo public): lưu ở `backend/.env.seed-accounts` (gitignore); đã đổi ngày 2026-11-03.

| id | Email | Mật khẩu (dev) | Role | Trạng thái hồ sơ | Kịch bản test |
|----|-------|----------------|------|------------------|---------------|
| `…0001` | `newuser@tryon.dev` | (xem `backend/.env.seed-accounts`, không commit) | user | Chưa có tên, số đo, ảnh | Login; mở hồ sơ lần đầu; đăng ký trùng email |
| `…0002` | `member@tryon.dev` | (xem `backend/.env.seed-accounts`) | user | Tên "Lan Anh", 162.0 cm, 50.5 kg; chưa có ảnh | Xem/sửa số đo; upload ảnh lần đầu rồi thay ảnh |
| `…0003` | `admin@tryon.dev` | (xem `backend/.env.seed-accounts`) | admin | Tên "Quản trị viên" | Dự phòng Epic 2 (phân quyền admin) |

`avatar_path` của seed để `null` vì không seed file thật lên Storage; upload qua UI/API để test ảnh.

**Seed danh mục (migration `006`, mọi môi trường – dữ liệu nền theo PB):** `Áo thun`/`ao-thun`, `Váy`/`vay`, `Quần Jeans`/`quan-jeans`. UUID do DB sinh (không cố định) – code/test tra theo `slug`. `on conflict do nothing` nên chạy lại không lỗi. Không seed sản phẩm (cần file ảnh thật; tạo qua UI/API ở Task 5).

## 8. Quyết định thiết kế

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| Bucket public hay private | **Private + signed URL** | Ảnh toàn thân là dữ liệu cá nhân nhạy cảm; URL public có thể bị chia sẻ/đoán ra. Signed URL có hạn, chỉ cấp cho chính chủ. Trade-off: mỗi lần GET profile phải ký URL (chi phí nhỏ) |
| `avatar_path` vs `avatar_url` | **Lưu path** | URL signed thay đổi theo thời gian, không lưu được; path độc lập domain/project, dễ đổi sang public/CDN sau; backend dùng path để xoá ảnh cũ |
| Email unique | `UNIQUE(email)` + `CHECK email = lower(btrim(email))` | Đơn giản hơn unique index trên `lower(email)`: index dùng trực tiếp được cho `where email = $1`, DB bắt buộc dữ liệu đã chuẩn hoá. Không dùng `citext` để tránh phụ thuộc extension |
| Kiểu số đo | `numeric(4,1)` | Chính xác thập phân (vd 50.5 kg), không lỗi làm tròn float; 4,1 đủ cho tối đa 250.0 |
| Số đo nullable | Có | User mới đăng ký chưa nhập; tính năng thử đồ (Epic 3) kiểm tra hồ sơ đủ trước khi dùng |
| `role` | `text` + CHECK | Dễ mở rộng hơn enum type (thêm giá trị không cần `ALTER TYPE`) |
| Cột `phone` | **Có** (migration `004`), tuỳ chọn, không unique | Chốt 2026-11-03: Task 7 ghi "name, email, phone". Chỉ hỗ trợ số di động VN (10 số) vì dự án nhắm thị trường Việt Nam; số bàn/quốc tế để sau. Không unique vì nhiều tài khoản có thể dùng chung số và không dùng phone để đăng nhập. Seed `003` không đổi (đã áp dụng), `phone` seed = null |
| Email sửa được? | Không (US-02 khoá email) | Email là định danh login |
| Xoá danh mục còn sản phẩm (Sprint 2) | **Chặn**: FK `ON DELETE RESTRICT`, API trả `409 CATEGORY_NOT_EMPTY` | Không mất sản phẩm/ảnh ngoài ý muốn; admin phải xoá hoặc chuyển sản phẩm trước. Cascade sẽ để lại object mồ côi trong Storage (DB không xoá được file) |
| Tên danh mục unique | Unique index trên `lower(name)` + CHECK `name = btrim(name)` | 'Váy' và 'VÁY' bị coi là trùng. Không chuẩn hoá lowercase khi lưu (khác email) vì cần giữ cách viết hiển thị |
| `slug` | Có, unique, backend sinh từ name (bỏ dấu tiếng Việt, `đ`→`d`, lowercase, ký tự khác → `-`), sinh lại khi đổi tên | Dùng cho URL thân thiện ở Sprint 3. Hệ quả: 'Váy' và 'Vay' khác tên nhưng cùng slug → vi phạm `categories_slug_unique` → cũng trả 409 |
| Kiểu giá | **`integer` VND, CHECK > 0** (thay cho `numeric(12,0)` dự kiến ở mục 9) | VND không có phần lẻ; integer (tối đa ~2,1 tỷ) đủ cho quần áo, JSON trả số thường, không bị PostgREST trả chuỗi. Giới hạn trên (khuyến nghị ≤ 100.000.000) validate ở backend, ghi trong API contract (Task 2) |
| Ẩn/hiện sản phẩm | **Không có** cột `is_active` | Chốt phạm vi Sprint 2. Muốn ẩn → xoá. Thêm sau bằng migration mới nếu cần |
| `image_path` bắt buộc | `not null` + CHECK bắt đầu bằng `{id}/` | US-04 yêu cầu ảnh flat lay; Epic 3 cần ảnh để sinh thử đồ. Backend sinh `id` (uuid) trước để đặt path |
| Bucket `products` public hay private | **Private + signed URL** (thay cho "có thể public" ở mục 9) | Nhất quán với `avatars`, tái dùng 1 cơ chế; không lộ ảnh khi chưa đăng nhập. Trade-off: phải ký URL cho mỗi sản phẩm trong danh sách (dùng `createSignedUrls` theo lô) |
| Tên sản phẩm unique? | Không | Có thể trùng tên khác màu/size; phân biệt bằng id |

## 9. Mở rộng cho sprint sau

Chỉ ghi nhận hướng, **chưa tạo**:
- **Epic 2:** đã thiết kế và tạo ở Sprint 2 – xem mục 10–12 (quyết định cuối cùng khác hướng ban đầu: giá `integer`, cột `image_path`, không `is_active`, bucket private).
- **Epic 3:** `try_on_results` (profile_id, product_id, avatar_path dùng lúc sinh, result_path, status…) để cache ảnh GenAI; unique (profile_id, product_id, avatar_path); bucket private `try-on-results`. Khi user đổi ảnh/số đo → kết quả cũ hết hiệu lực.
- **Epic 4:** `cart_items` (profile_id, product_id, quantity), `orders`, `order_items` (giá snapshot).
- Dùng lại `public.set_updated_at()` cho bảng mới; giữ nguyên tắc RLS bật + không policy + revoke anon/authenticated + **grant `service_role`**.

## 10. Bảng `categories` (Sprint 2)

Migration `006_create_categories_products.sql`.

| Cột | Kiểu | Null | Mặc định | Ràng buộc / ghi chú |
|-----|------|------|----------|---------------------|
| `id` | `uuid` | không | `gen_random_uuid()` | PK |
| `name` | `text` | không | | `CHECK name = btrim(name)`; `CHECK` 1–50 ký tự; unique index `categories_name_lower_unique` trên `lower(name)` |
| `slug` | `text` | không | | `UNIQUE` (`categories_slug_unique`); `CHECK` 1–60 ký tự, `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `created_at` | `timestamptz` | không | `now()` | |
| `updated_at` | `timestamptz` | không | `now()` | Trigger `categories_set_updated_at` → `public.set_updated_at()` |

**Indexes:** `categories_pkey`, `categories_slug_unique` (tra theo slug ở Sprint 3), `categories_name_lower_unique` (chặn trùng tên). Bảng rất nhỏ, danh sách sắp `order by name` hoặc `created_at` không cần index.

**Quy tắc backend**
- `name`: trim, rỗng → `VALIDATION_ERROR`, > 50 ký tự → `VALIDATION_ERROR`. Sinh `slug` từ name; slug rỗng sau chuẩn hoá (tên toàn ký tự đặc biệt) → `VALIDATION_ERROR`.
- Lỗi `23505` (constraint `categories_name_lower_unique` hoặc `categories_slug_unique`) → `409 CATEGORY_EXISTS`.
- Xoá: lỗi `23503` (FK `products_category_id_fkey`) → `409 CATEGORY_NOT_EMPTY`. Có thể đếm sản phẩm trước để trả thông báo kèm số lượng, nhưng vẫn phải bắt `23503` (race giữa đếm và xoá).
- Không tìm thấy id → `404`.

## 11. Bảng `products` (Sprint 2)

Migration `006_create_categories_products.sql`.

| Cột | Kiểu | Null | Mặc định | Ràng buộc / ghi chú |
|-----|------|------|----------|---------------------|
| `id` | `uuid` | không | `gen_random_uuid()` | PK. **Backend tự sinh (`crypto.randomUUID()`) trước khi upload ảnh** để đặt object path |
| `category_id` | `uuid` | không | | FK `products_category_id_fkey` → `categories.id`, `ON DELETE RESTRICT`, `ON UPDATE CASCADE` |
| `name` | `text` | không | | `CHECK name = btrim(name)`; 1–100 ký tự. Không unique |
| `price` | `integer` | không | | VND, `CHECK price > 0` (`products_price_positive`) |
| `image_path` | `text` | không | | Object path bucket `products`; `CHECK image_path like id || '/%'` (`products_image_path_owner`) |
| `created_at` | `timestamptz` | không | `now()` | |
| `updated_at` | `timestamptz` | không | `now()` | Trigger `products_set_updated_at` |

**Indexes**
- `products_pkey` (id).
- `products_category_id_created_at_idx` (`category_id, created_at, id`): lọc theo danh mục ở admin và Sprint 3 (`where category_id = $1 order by created_at, id` – thứ tự ổn định để "sản phẩm đầu tiên"/"tiếp theo" của US-05/06 không nhảy). Cột đầu `category_id` cũng phục vụ kiểm tra FK khi xoá danh mục, nên không cần index riêng `category_id`.
- Danh sách admin không lọc (`order by created_at desc`) chưa cần index ở quy mô hiện tại.

**Quy tắc backend**
- Validate trước: `name` trim 1–100; `price` là số nguyên > 0 (không nhận chuỗi có dấu chấm/phẩy, không nhận số lẻ); `categoryId` là uuid và tồn tại (không tồn tại → lỗi validate, DB trả `23503` khi insert là lớp cuối); ảnh bắt buộc khi tạo.
- Lỗi DB: `23514` (CHECK) → `400 VALIDATION_ERROR`; `23503` khi insert/update → `400 VALIDATION_ERROR` với `fields.categoryId` (chốt ở API contract Task 2, `design/flows/README.md` D20). Giá trần 100.000.000 validate ở backend (D21).
- Select cột tường minh, không trả `image_path` cho client – trả `imageUrl` (signed URL).

## 12. Storage: bucket `products` (Sprint 2)

Migration `007_create_products_bucket.sql`.

| Thuộc tính | Giá trị |
|------------|---------|
| Bucket id/name | `products` |
| Public | **false (private)** |
| `file_size_limit` | 5242880 (5 MB) |
| `allowed_mime_types` | `image/jpeg`, `image/png` |
| Object path | `{product_id}/flatlay-{epoch_ms}.{jpg\|png}` (tên file do server tạo, không dùng `originalname`) |
| Truy cập | Chỉ backend (service role), không policy. Client nhận signed URL (TTL 1 giờ như avatar); danh sách dùng `createSignedUrls` theo lô |

Backend vẫn kiểm tra magic bytes (`detectImageType` trong `avatarService.js`) – giới hạn của bucket chỉ là lớp cuối. Nên tổng quát hoá logic upload/xoá object của avatar thành hàm nhận `bucket` (Sprint 2 Task 5).

**Luồng tạo sản phẩm:** sinh `id` → upload object `{id}/flatlay-{ts}.{ext}` → insert row với `id` và `image_path` đó → nếu insert lỗi: xoá object vừa upload (không để object mồ côi), trả lỗi.

**Luồng thay ảnh (sửa sản phẩm):** giống avatar – upload object mới → update `image_path` → update lỗi thì xoá object mới; thành công thì xoá object cũ (best-effort, chỉ log).

**Luồng xoá sản phẩm:** delete row **trước** → xoá object (best-effort, chỉ log). Thứ tự này đảm bảo không có row trỏ tới file đã mất; lỗi Storage chỉ để lại file mồ côi.

**Xoá danh mục:** chỉ thành công khi không còn sản phẩm, nên không bao giờ phải dọn Storage.
