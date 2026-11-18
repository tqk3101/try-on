# Flows: Auth, Profile & Kho hàng

> Sprint 1, Task 4: US-01 (đăng ký, đăng nhập, logout, bảo vệ route), US-02 (hồ sơ, ảnh toàn thân).
> Sprint 2, Task 2: US-03 (danh mục), US-04 (sản phẩm) – khu vực admin và API đọc cho Sprint 3.
> Sprint 3, Task 1 (2026-11-17; Q12 đã chốt: Gemini, `stub` mặc định; Q13–Q22 đã chốt 2026-11-17 theo mặc định, trừ Q15 = không prefetch): US-05, US-06 – phòng thử đồ, sinh ảnh GenAI bất đồng bộ + cache.
> Sprint 4, Task 1 (2026-11-18, **Q23–Q34 đã chốt 2026-11-18 theo mặc định khuyến nghị; US-10 được duyệt**): US-07, US-08 (giỏ hàng), US-10 (đặt hàng – **bổ sung ngoài PB, chờ duyệt**), US-09 (admin xem đơn). Migration `010`/`011` **chưa áp**.
> Đọc kèm `design/database/schema.md` (`profiles`, `categories`, `products`, bucket `avatars`, `products`). Code cài đặt **đúng** theo tài liệu này. Nếu cần đổi, cập nhật tài liệu trước.

## Mục lục
1. [Danh sách flow](#1-danh-sách-flow)
2. [Quy ước chung](#2-quy-ước-chung)
3. [API contract tóm tắt](#3-api-contract-tóm-tắt)
4. [Bảng mã lỗi](#4-bảng-mã-lỗi)
5. [Route frontend](#5-route-frontend)
6. [Quyết định thiết kế đã chốt](#6-quyết-định-thiết-kế-đã-chốt)
7. [Câu hỏi còn mở (cần người dùng chốt)](#7-câu-hỏi-còn-mở-cần-người-dùng-chốt)
8. [Đề xuất thay đổi schema](#8-đề-xuất-thay-đổi-schema)

## 1. Danh sách flow

| File | Nội dung | Task cài đặt |
|------|----------|--------------|
| [register.md](register.md) | Đăng ký `POST /api/auth/register` (không tự đăng nhập; thành công → `/login`) | Task 5 |
| [login.md](login.md) | Đăng nhập `POST /api/auth/login`, JWT, lưu token, redirect | Task 6 |
| [logout-protected-routes.md](logout-protected-routes.md) | Logout, middleware `requireAuth`, route guard frontend, xử lý 401, khôi phục phiên khi tải lại trang | Task 6 (middleware dùng ở Task 7) |
| [profile.md](profile.md) | Xem/cập nhật hồ sơ `GET/PUT /api/user/profile` | Task 7 |
| [avatar-upload.md](avatar-upload.md) | Upload ảnh toàn thân `PUT /api/user/profile/avatar` và xoá ảnh `DELETE /api/user/profile/avatar` (Supabase Storage) | Task 7 |
| [category-management.md](category-management.md) | **Sprint 2.** Phân quyền admin (`requireAdmin`), CRUD `/api/admin/categories`, `GET /api/categories` | S2 Task 3, 4, 7 |
| [product-management.md](product-management.md) | **Sprint 2.** CRUD `/api/admin/products` (multipart ảnh flat lay, bucket `products`), `GET /api/categories/:id/products` | S2 Task 5, 6, 7 |
| [try-on-room.md](try-on-room.md) | **Sprint 3.** Provider GenAI (Gemini, `stub` mặc định; prompt cố định, ánh xạ lỗi), `POST /api/try-on` (202 + polling `GET /api/try-on/:id`), cache `try_on_results`, hạn mức, đồng ý xử lý ảnh, dọn kết quả khi đổi ảnh, luồng `/try-on` (mũi tên/vuốt, debounce, không prefetch) | S3 Task 1, 3, 4, 6 |
| [cart-and-orders.md](cart-and-orders.md) | **Sprint 4.** Giỏ hàng server (`/api/cart`), nút "Thêm vào giỏ" ở phòng thử đồ, xem/sửa giỏ + tổng tiền, đặt hàng nguyên tử (`POST /api/orders`, hàm `place_order`, idempotency, `CART_CHANGED`), trang xác nhận đơn, admin xem đơn (`/api/admin/orders`, phân trang, lọc trạng thái) | S4 Task 1–5 |

## 2. Quy ước chung

**Envelope response** (giữ đúng `errorHandler.js` và `apiClient.js` hiện có):

```json
// Thành công
{ "success": true, "data": { ... } }

// Lỗi
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ.", "fields": { "email": "Email không đúng định dạng." } } }
```

- `error.code`: mã cố định, frontend rẽ nhánh theo mã này (không theo message).
- `error.message`: tiếng Việt, thân thiện, hiển thị được ngay; **không** chứa stack, tên bảng, lỗi Supabase/Postgres.
- `error.fields`: **chỉ có** khi `code = VALIDATION_ERROR`; key là tên trường API (camelCase), value là message của trường đó. Frontend hiển thị dưới từng input. Cần mở rộng `HttpError` thêm tham số `fields` (tuỳ chọn) và `errorHandler` trả kèm khi có.
- Lỗi 5xx: backend `console.error` chi tiết (không kèm password, token, body chứa số đo/ảnh), client chỉ nhận message chung.

**Auth header**: `Authorization: Bearer <JWT>`. `apiClient` đã tự gắn từ `localStorage['tryon_token']`.

**Đối tượng dùng lại trong response**

`AuthUser` (register, login; register trả `displayName: null`):
```json
{ "id": "uuid", "email": "member@tryon.dev", "role": "user", "displayName": "Lan Anh" }
```

`Profile` (GET/PUT profile, PUT avatar):
```json
{
  "id": "uuid", "email": "member@tryon.dev", "role": "user",
  "displayName": "Lan Anh", "phone": "0912345678", "heightCm": 162, "weightKg": 50.5,
  "avatarUrl": "https://<project>.supabase.co/storage/v1/object/sign/avatars/...?...token=...",
  "createdAt": "2026-10-28T03:00:00.000Z", "updatedAt": "2026-10-28T03:10:00.000Z"
}
```
- `displayName`, `phone`, `heightCm`, `weightKg`, `avatarUrl` có thể `null`. `phone` luôn ở dạng chuẩn hoá `0xxxxxxxxx`.
- `heightCm`/`weightKg` là **number** JSON (convert nếu driver trả string).
- `avatarUrl` là signed URL TTL 3600 giây, `null` nếu chưa có ảnh (hoặc ký URL lỗi, xem `profile.md`).
- **Không bao giờ** có `password_hash`/`avatarPath` trong response. Select cột tường minh.

## 3. API contract tóm tắt

| Method | Path | Auth | Request | Thành công | Mã lỗi |
|--------|------|------|---------|------------|--------|
| GET | `/api/health` | Không | – | 200 (đã có) | 503 |
| POST | `/api/auth/register` | Không (chỉ khách) | JSON `{ email, password, confirmPassword }` | **201** `data: { user: AuthUser }` (**không** có token) | 400 `VALIDATION_ERROR` / `BAD_REQUEST`, 409 `EMAIL_EXISTS`, 429 `TOO_MANY_REQUESTS`, 500 `INTERNAL_ERROR` |
| POST | `/api/auth/login` | Không | JSON `{ email, password }` | **200** `data: { token, user: AuthUser }` | 400 `VALIDATION_ERROR` / `BAD_REQUEST`, 401 `INVALID_CREDENTIALS`, 429 `TOO_MANY_REQUESTS`, 500 |
| GET | `/api/user/profile` | Bearer | – | **200** `data: { profile: Profile }` | 401 `AUTH_REQUIRED` / `TOKEN_EXPIRED` / `INVALID_TOKEN`, 500 |
| PUT | `/api/user/profile` | Bearer | JSON `{ displayName?, phone?, heightCm, weightKg }` | **200** `data: { profile: Profile }` | 400 `VALIDATION_ERROR` / `BAD_REQUEST`, 401 (như trên), 500 |
| PUT | `/api/user/profile/avatar` | Bearer | `multipart/form-data`, 1 file ở field `avatar` (jpeg/png, ≤ 5 MB) | **200** `data: { profile: Profile }` | 400 `AVATAR_REQUIRED` / `INVALID_UPLOAD`, 401, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`, 429, 502 `UPLOAD_FAILED`, 500 |
| DELETE | `/api/user/profile/avatar` | Bearer | – (không body) | **200** `data: { profile: Profile }` với `avatarUrl: null` (idempotent: chưa có ảnh vẫn 200) | 401, 429, 500 |

**Sprint 2** (chi tiết, đối tượng `AdminCategory`, `Category`, `AdminProduct`, `Product`: `category-management.md` mục 3, `product-management.md` mục 1–2). Mọi `/api/admin/*`: Bearer + `requireAdmin` (role từ DB), lỗi chung 401 / 403 `FORBIDDEN` / 500.

| Method | Path | Auth | Request | Thành công | Mã lỗi riêng |
|--------|------|------|---------|------------|--------------|
| GET | `/api/admin/categories` | Admin | – | 200 `data: { categories }` | – |
| POST | `/api/admin/categories` | Admin | JSON `{ name }` | **201** `data: { category }` | 400 `VALIDATION_ERROR` / `BAD_REQUEST`, 409 `CATEGORY_EXISTS` |
| PUT | `/api/admin/categories/:id` | Admin | JSON `{ name }` | 200 `data: { category }` | 400, 404 `CATEGORY_NOT_FOUND`, 409 `CATEGORY_EXISTS` |
| DELETE | `/api/admin/categories/:id` | Admin | – | 200 `data: { id }` | 404 `CATEGORY_NOT_FOUND`, 409 `CATEGORY_NOT_EMPTY` |
| GET | `/api/admin/products` | Admin | Query `categoryId?` | 200 `data: { products }` | 400 `VALIDATION_ERROR` |
| GET | `/api/admin/products/:id` | Admin | – | 200 `data: { product }` | 404 `PRODUCT_NOT_FOUND` |
| POST | `/api/admin/products` | Admin | multipart `name`, `price`, `categoryId`, file `image` | **201** `data: { product }` | 400 `VALIDATION_ERROR` / `INVALID_UPLOAD`, 413, 415, 429, 502 |
| PUT | `/api/admin/products/:id` | Admin | multipart như POST, `image` tuỳ chọn | 200 `data: { product }` | như POST + 404 `PRODUCT_NOT_FOUND` |
| DELETE | `/api/admin/products/:id` | Admin | – | 200 `data: { id }` | 404 `PRODUCT_NOT_FOUND` |
| GET | `/api/categories` | Bearer (mọi role) | – | 200 `data: { categories }` | 401, 500 |
| GET | `/api/categories/:id/products` | Bearer (mọi role) | – | 200 `data: { category, products }` | 401, 404 `CATEGORY_NOT_FOUND`, 500 |

**Sprint 3** (chi tiết, đối tượng `TryOn`, `TryOnQuota`: `try-on-room.md` mục 4). Mọi route: Bearer (mọi role), lỗi chung 401 / 500. `Profile` thêm trường `tryOnConsentAt` (bổ sung, không phá client cũ).

| Method | Path | Auth | Request | Thành công | Mã lỗi riêng |
|--------|------|------|---------|------------|--------------|
| POST | `/api/try-on` | Bearer | JSON `{ productId }` | 200 `data: { tryOn, quota }` (cache / job đang chạy) · **202** `data: { tryOn, quota }` (job mới) | 400 `VALIDATION_ERROR` / `BAD_REQUEST`, 404 `PRODUCT_NOT_FOUND`, 409 `PROFILE_INCOMPLETE` / `TRY_ON_CONSENT_REQUIRED`, 429 `TRY_ON_QUOTA_EXCEEDED` / `TOO_MANY_REQUESTS`, 503 `TRY_ON_UNAVAILABLE` |
| GET | `/api/try-on/:id` | Bearer | – | 200 `data: { tryOn }` | 404 `TRY_ON_NOT_FOUND`, 429 |
| GET | `/api/try-on/quota` | Bearer | – | 200 `data: { quota }` | – |
| POST | `/api/try-on/consent` | Bearer | – | 200 `data: { profile }` (idempotent) | 429 |

**Sprint 4** (đã chốt 2026-11-18, Q23–Q34 theo mặc định khuyến nghị; chi tiết, đối tượng `Cart`, `CartItem`, `Order`, `OrderItem`, `AdminOrder`, `AdminOrderSummary`, `Pagination`, bảng validate: `cart-and-orders.md` mục 2–3). Mọi route: Bearer, mọi role (Q31); lỗi chung 401 / 500; `/api/admin/*` thêm 403 `FORBIDDEN`.

| Method | Path | Auth | Request | Thành công | Mã lỗi riêng |
|--------|------|------|---------|------------|--------------|
| GET | `/api/cart` | Bearer | – | 200 `data: { cart }` | 429 |
| POST | `/api/cart/items` | Bearer | JSON `{ productId, quantity? }` | **201** `data: { cart, item }` (dòng mới) · 200 (cộng dồn) | 400 `VALIDATION_ERROR` / `BAD_REQUEST`, 404 `PRODUCT_NOT_FOUND`, 409 `CART_FULL` / `CART_QUANTITY_LIMIT`, 429 |
| PUT | `/api/cart/items/:productId` | Bearer | JSON `{ quantity }` (tuyệt đối, 1–10) | 200 `data: { cart }` | 400, 404 `CART_ITEM_NOT_FOUND`, 429 |
| DELETE | `/api/cart/items/:productId` | Bearer | – | 200 `data: { cart }` (idempotent) | 400, 429 |
| POST | `/api/orders` | Bearer | JSON `{ idempotencyKey, recipientName, phone, shippingAddress, note?, expectedTotal }` | **201** `data: { order }` · 200 (khoá đã dùng → đơn cũ) | 400, 409 `CART_EMPTY` / `CART_CHANGED`, 429 |
| GET | `/api/orders/:id` | Bearer (chủ đơn) | – | 200 `data: { order }` | 404 `ORDER_NOT_FOUND` |
| GET | `/api/admin/orders` | Admin | Query `status?`, `page?`, `pageSize?` (1–50, mặc định 20) | 200 `data: { orders, pagination }` | 400 `VALIDATION_ERROR` |
| GET | `/api/admin/orders/:id` | Admin | – | 200 `data: { order }` | 404 `ORDER_NOT_FOUND` |

Không có endpoint logout phía server (xem `logout-protected-routes.md`). Mọi route lạ dưới `/api` trả 404 `NOT_FOUND` (đã có).

## 4. Bảng mã lỗi

| HTTP | `code` | `message` (gợi ý, dùng nguyên văn) | Khi nào |
|------|--------|-------------------------------------|---------|
| 400 | `BAD_REQUEST` | Yêu cầu không hợp lệ. | JSON sai cú pháp, body không phải object (đã có trong `errorHandler`) |
| 400 | `VALIDATION_ERROR` | Dữ liệu không hợp lệ. Vui lòng kiểm tra lại. | Sai validate, kèm `fields` |
| 400 | `AVATAR_REQUIRED` | Vui lòng chọn một ảnh để tải lên. | Multipart không có file `avatar` |
| 400 | `INVALID_UPLOAD` | Yêu cầu tải ảnh không hợp lệ. | Không phải multipart, sai tên field, > 1 file, multipart hỏng |
| 401 | `INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng. | Login sai (không phân biệt email không tồn tại hay sai mật khẩu) |
| 401 | `AUTH_REQUIRED` | Vui lòng đăng nhập để tiếp tục. | Thiếu header `Authorization` / không đúng dạng `Bearer <token>` |
| 401 | `TOKEN_EXPIRED` | Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. | JWT hết hạn |
| 401 | `INVALID_TOKEN` | Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại. | Chữ ký sai, payload sai, user của token không còn tồn tại |
| 403 | `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này. | Sprint 2: `requireAdmin` – user đã đăng nhập nhưng `profiles.role` (đọc từ DB) khác `admin` |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên yêu cầu. | Đã có |
| 404 | `CATEGORY_NOT_FOUND` | Danh mục không tồn tại hoặc đã bị xoá. | Sprint 2: `:id` danh mục trên path không có / không phải uuid |
| 404 | `PRODUCT_NOT_FOUND` | Sản phẩm không tồn tại hoặc đã bị xoá. | Sprint 2: `:id` sản phẩm trên path không có / không phải uuid |
| 404 | `TRY_ON_NOT_FOUND` | Không tìm thấy ảnh thử đồ. | Sprint 3: `GET /api/try-on/:id` không tồn tại, không phải uuid hoặc thuộc user khác |
| 404 | `CART_ITEM_NOT_FOUND` | Sản phẩm này không còn trong giỏ hàng. | Sprint 4: `PUT /api/cart/items/:productId` không có dòng (đã xoá ở tab khác / sản phẩm bị admin xoá) |
| 404 | `ORDER_NOT_FOUND` | Không tìm thấy đơn hàng. | Sprint 4: `GET /api/orders/:id` (không có, không phải uuid, của user khác) và `GET /api/admin/orders/:id` |
| 409 | `PROFILE_INCOMPLETE` | Bạn cần hoàn thiện hồ sơ (ảnh toàn thân, chiều cao, cân nặng) để thử đồ. | Sprint 3: kèm `fields` (`avatar`, `heightCm`, `weightKg`) – ngoại lệ có chủ đích với quy tắc "`fields` chỉ đi với `VALIDATION_ERROR`" để client liệt kê mục thiếu |
| 409 | `TRY_ON_CONSENT_REQUIRED` | Bạn cần đồng ý cho phép xử lý ảnh trước khi thử đồ. | Sprint 3: `profiles.try_on_consent_at` null |
| 409 | `CART_FULL` | Giỏ hàng đã có 50 sản phẩm. Vui lòng bớt sản phẩm trước khi thêm. | Sprint 4: thêm dòng mới khi giỏ đã đủ `maxLines` (Q33) |
| 409 | `CART_QUANTITY_LIMIT` | Mỗi sản phẩm chỉ đặt tối đa 10 chiếc. | Sprint 4: cộng dồn khi thêm vượt `maxQuantity` (Q25, Q26) |
| 409 | `CART_EMPTY` | Giỏ hàng đang trống. | Sprint 4: `POST /api/orders` khi giỏ không còn dòng (có thể đã đặt ở tab khác) |
| 409 | `CART_CHANGED` | Giỏ hàng vừa thay đổi (giá hoặc sản phẩm). Vui lòng kiểm tra lại trước khi đặt hàng. | Sprint 4: tổng server tính khác `expectedTotal` (đổi giá, sản phẩm bị xoá, số lượng đổi ở tab khác – D37) |
| 409 | `EMAIL_EXISTS` | Email này đã được đăng ký. | Register trùng email |
| 409 | `CATEGORY_EXISTS` | Danh mục này đã tồn tại. | Sprint 2: `23505` trên `categories_name_lower_unique` / `categories_slug_unique` |
| 409 | `CATEGORY_NOT_EMPTY` | Danh mục còn {N} sản phẩm. Hãy xoá hoặc chuyển các sản phẩm sang danh mục khác trước khi xoá. | Sprint 2: xoá danh mục còn sản phẩm (đếm trước, hoặc `23503` khi race – message không kèm số) |
| 413 | `FILE_TOO_LARGE` | Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn. | multer `LIMIT_FILE_SIZE` (avatar, ảnh sản phẩm) |
| 415 | `UNSUPPORTED_FILE_TYPE` | Chỉ hỗ trợ ảnh JPG hoặc PNG. | MIME hoặc magic bytes không phải jpeg/png |
| 429 | `TOO_MANY_REQUESTS` | Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút. | Rate limit (Sprint 2 thêm `productImageLimiter`: POST/PUT sản phẩm 60 / 15 phút theo user) |
| 429 | `TRY_ON_QUOTA_EXCEEDED` | Bạn đã dùng hết lượt thử đồ hôm nay. Vui lòng quay lại vào ngày mai. | Sprint 3: hạn mức ngày (`TRY_ON_DAILY_LIMIT`), kèm `Retry-After` |
| 500 | `INTERNAL_ERROR` | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | Lỗi không lường trước, lỗi DB (đã có) |
| 502 | `UPLOAD_FAILED` | Không thể tải ảnh lên lúc này. Vui lòng thử lại. | Supabase Storage lỗi khi upload |
| 503 | `TRY_ON_UNAVAILABLE` | Tính năng thử đồ đang tạm ngưng. Vui lòng thử lại sau. | Sprint 3: `TRY_ON_PROVIDER=gemini` nhưng thiếu `GEMINI_API_KEY`, hoặc provider bị đánh dấu không khả dụng (model 404, key sai – `try-on-room.md` mục 2.4) |

Lỗi **trong job** sinh ảnh không phải HTTP error: trả trong `tryOn.error.code` khi `status = failed` (`GENERATION_FAILED`, `GENERATION_TIMEOUT`, `INPUT_REJECTED`, `PROVIDER_UNAVAILABLE`), message ở `try-on-room.md` mục 7.
| 0 (client) | `NETWORK_ERROR` | Không thể kết nối tới máy chủ. Vui lòng thử lại. | Fetch lỗi mạng (đã có trong `apiClient`) |

## 5. Route frontend

| Path | Loại | Ghi chú |
|------|------|---------|
| `/` | Public | Landing. Đã đăng nhập vẫn xem được |
| `/register` | Chỉ khách (guest-only) | Đã đăng nhập → chuyển `/try-on` (từ Sprint 3 Task 4; trước đó `/profile`). Đăng ký thành công → `/login` (router state `{ registered: true, email }`, giữ query `redirect` nếu có) |
| `/login` | Chỉ khách | Đã đăng nhập → chuyển `redirect` hợp lệ hoặc `/try-on` (từ Sprint 3 Task 4; trước đó `/profile`). Đọc query `redirect`, `reason=expired` và router state `registered`, `email` (banner đăng ký thành công + điền sẵn email) |
| `/profile` | Bảo vệ (cần đăng nhập) | Đích mặc định **sau đăng nhập** ở Sprint 1–2 (chưa có dashboard); từ Sprint 3 Task 4 đổi sang `/try-on` (Q19). Không phải đích sau đăng ký |
| `/admin` | Chỉ admin (Sprint 2) | Chuyển `/admin/categories`. Guest → `/login?redirect=`; user thường → trang 403 |
| `/admin/categories` | Chỉ admin | Danh sách + thêm/sửa trong hộp thoại, xác nhận xoá |
| `/admin/products` | Chỉ admin | Danh sách, query `?categoryId=` cho bộ lọc |
| `/admin/products/new` | Chỉ admin | Form thêm (chọn sẵn danh mục nếu có `?categoryId=`) |
| `/admin/products/:id/edit` | Chỉ admin | Form sửa (`GET /api/admin/products/:id`) |
| `/try-on` | Bảo vệ (Sprint 3) | Chọn danh mục (`GET /api/categories`); hồ sơ chưa đủ → màn "Hoàn thiện hồ sơ". Đích mặc định sau đăng nhập từ Sprint 3 Task 4 (Q19) |
| `/try-on/:categoryId` | Bảo vệ (Sprint 3) | Phòng thử đồ; query `?product=<productId>` giữ vị trí (cập nhật bằng `replace`). Sprint 4: nút "Thêm vào giỏ" trong `ProductPanel` |
| `/cart` | Bảo vệ (Sprint 4) | Giỏ hàng: dòng, số lượng −/+, xoá, tổng tiền, nút Đặt hàng. Badge giỏ ở header dẫn tới đây |
| `/checkout` | Bảo vệ (Sprint 4) | Form giao hàng + tóm tắt đơn; giỏ trống → `/cart` (replace) |
| `/orders/:id` | Bảo vệ (Sprint 4, chỉ chủ đơn) | Xác nhận đơn / xem lại đơn; router state `{ placed: true }` khi đến từ `/checkout` |
| `/admin/orders` | Chỉ admin (Sprint 4) | Danh sách đơn; query `?status=&page=` (push khi đổi) |
| `/admin/orders/:id` | Chỉ admin (Sprint 4) | Chi tiết đơn |
| `*` | Public | 404 |

Route admin là đề xuất của BA; bố cục chi tiết do `design/screens.md` (agent-uiux) chốt, nếu đổi path thì cập nhật bảng này.

Thêm `profile: '/profile'` vào `PATHS` và bật `AUTH_ENABLED = true` trong `frontend/src/routes/paths.js` khi Task 5–6 xong.

## 6. Quyết định thiết kế đã chốt

| # | Vấn đề | Quyết định | Lý do |
|---|--------|-----------|-------|
| D1 | Avatar upload gộp hay riêng | **Endpoint riêng** `PUT /api/user/profile/avatar` (multipart, field `avatar`); `PUT /api/user/profile` chỉ nhận JSON | Tách validate JSON/file; dữ liệu text không phải đi multipart (số thành string); upload lỗi không làm mất thay đổi số đo; `apiClient` đã hỗ trợ `FormData` |
| D2 | Thứ tự gọi khi bấm "Lưu" | Client gọi `PUT /profile` (nếu form text thay đổi) **trước**, sau đó `PUT /profile/avatar` (nếu có chọn ảnh mới). Báo kết quả từng phần | Request nhanh, ít lỗi đi trước; ảnh lỗi thì giữ file đã chọn để thử lại, không bắt nhập lại số đo |
| D3 | Sau đăng ký | **Không tự đăng nhập** (người dùng chốt 2026-10-30): register trả 201 `{ user }`, **không** phát JWT. Client chuyển `/login` bằng `navigate('/login' + giữ ?redirect, { replace: true, state: { registered: true, email } })`; trang login hiện banner "Đăng ký thành công. Vui lòng đăng nhập." và điền sẵn email | Người dùng chốt. Truyền qua router state thay vì query `?registered=1&email=` để email không nằm trong URL/lịch sử/log; banner chỉ hiện một lần (mất khi reload, chấp nhận) |
| D4 | Lưu token | `localStorage['tryon_token']` (đã có trong `apiClient`) | Đơn giản, hợp với JWT Bearer, không cần CSRF. Trade-off: XSS đọc được token → giữ React escape mặc định, không `dangerouslySetInnerHTML` với dữ liệu user, TTL vừa phải |
| D5 | JWT | HS256, payload `{ sub: profiles.id, role }` + `iat`, `exp` tự sinh; TTL = `JWT_EXPIRES_IN` (mặc định `7d`). Không đặt email/số đo vào payload. `verify` phải chỉ định `algorithms: ['HS256']` | Payload chỉ base64, không mã hoá nên không chứa PII; ghim thuật toán để chống tấn công đổi `alg` |
| D6 | Logout | **Chỉ phía client**, không có blacklist/endpoint server | Kiến trúc stateless, chưa có bảng phiên. Rủi ro: token bị lộ vẫn dùng được tới `exp` (tối đa 7 ngày). Chấp nhận ở Sprint 1; hướng nâng cấp ở mục 8 |
| D7 | Thông báo login sai | Một mã chung `INVALID_CREDENTIALS`; khi email không tồn tại vẫn chạy `bcrypt.compare` với hash giả | Không lộ email nào đã đăng ký qua message hay thời gian phản hồi |
| D8 | Chống brute-force | `express-rate-limit` (bộ nhớ trong, theo IP): login 10 lần **thất bại** / 15 phút (`skipSuccessfulRequests: true`); register 10 / giờ; avatar 20 / 15 phút theo `sub`. Vượt → 429 `TOO_MANY_REQUESTS` + header `Retry-After`. **Không khoá tài khoản** | Khoá tài khoản cho phép kẻ xấu khoá tài khoản người khác và cần thêm cột DB. Memory store đủ cho 1 instance; nhiều instance cần store chung (Redis) |
| D9 | Mật khẩu | 8–72 ký tự, ≤ 72 byte UTF-8, **bắt buộc** có chữ thường, chữ hoa, chữ số; ký tự đặc biệt chỉ khuyến nghị (thanh độ mạnh ở UI). Không trim mật khẩu | US-01 "tối thiểu 8, nên có…". bcrypt bỏ qua phần sau 72 byte. Seed (mật khẩu mới, ngoài repo) thoả |
| D10 | Kiểm tra trùng email | SELECT trước (thoát sớm, không tốn bcrypt) **và** bắt lỗi `23505` khi INSERT (race 2 request cùng lúc) → cùng trả 409 | UNIQUE ở DB là nguồn sự thật cuối cùng |
| D11 | Quay lại trang cũ sau login | Query `?redirect=<path>`, chỉ chấp nhận path nội bộ (bắt đầu `/`, không phải `//` hay `/\`, không phải `/login`, `/register`); sai → `/try-on` (Sprint 3 Task 4; trước đó `/profile`) | Sống sót khi reload; dùng được từ handler 401 ngoài React tree; chống open redirect |
| D12 | Xử lý 401 ở `apiClient` | Chỉ xoá token + gọi `unauthorizedHandler` khi request **có gửi kèm token**. 401 của login (không có token) trả về form như lỗi thường | Code hiện tại xử lý mọi 401, sẽ làm form login bị điều hướng khi sai mật khẩu |
| D13 | Khôi phục phiên khi tải lại trang | Có token → kiểm tra `exp` (decode base64url, không verify) → còn hạn thì gọi `GET /api/user/profile` để lấy user; không thêm endpoint `/auth/me` | Dùng lại endpoint có sẵn; server vẫn là nơi verify |
| D14 | Kiểm tra ảnh | Server: bắt buộc loại (MIME + magic bytes) và dung lượng. Client: kiểm tra loại/dung lượng (chặn) + tỷ lệ/kích thước (chỉ **cảnh báo**, cho phép "Vẫn dùng ảnh này") | US-02 ghi tỷ lệ/kích thước là "khuyến nghị", "kiểm tra sơ bộ". Trình duyệt đã xoay theo EXIF nên đo ở client chính xác hơn đo bytes ở server |
| D15 | Đường dẫn ảnh | `{user_id}/avatar-{Date.now()}.{jpg\|png}`, đuôi lấy theo **magic bytes**, không theo tên file client | Khớp schema + CHECK `profiles_avatar_path_owner`; không tin input client |
| D16 | Cập nhật hồ sơ | `PUT` thay toàn bộ các trường sửa được: `heightCm`, `weightKg` **bắt buộc**; `displayName` và `phone` tuỳ chọn (thiếu/`""`/`null` → `null`). Trường khác (`email`, `role`, `avatarUrl`, `password`…) **bị bỏ qua** | US-02: thiếu chiều cao/cân nặng là lỗi; email khoá |
| D17 | Thư viện mới cho backend | `multer` (multipart, `memoryStorage`, `limits.fileSize = 5 MB`, `files = 1`), `express-rate-limit` (`limit`, `standardHeaders: 'draft-8'`). agent-coder cài bản mới nhất ở thời điểm cài đặt | Chuẩn de-facto cho Express, hỗ trợ Express 5 |
| D18 | Xoá ảnh toàn thân | Endpoint riêng `DELETE /api/user/profile/avatar`, **thực hiện ngay** khi user xác nhận (không gộp vào nút Lưu). Server: đặt `avatar_path = null` **trước**, rồi xoá object Storage best-effort. Idempotent: chưa có ảnh vẫn trả 200. Dùng chung `avatarLimiter`. Không thêm mã lỗi mới | Xoá là hành động rõ ràng, độc lập với việc sửa số đo; cập nhật DB trước để không bao giờ trỏ tới file đã mất (file mồ côi nếu xoá Storage lỗi chỉ tốn dung lượng). Chi tiết: `avatar-upload.md` mục 4 |
| D19 | Kiểm tra admin (Sprint 2) | Middleware `requireAdmin` sau `requireAuth`, **SELECT `role` từ `profiles`** (không tin claim `role` trong JWT); không có dòng → 401 `INVALID_TOKEN`, khác admin → 403 `FORBIDDEN` | JWT sống 7 ngày, hạ quyền phải có hiệu lực ngay; thêm 1 query/request admin là chấp nhận được. `requireRole` cũ (đọc JWT) không dùng cho `/api/admin/*` |
| D20 | `categoryId` không tồn tại khi tạo/sửa sản phẩm | **400 `VALIDATION_ERROR`** + `fields.categoryId` (cả khi DB trả `23503`) | Là dữ liệu body, không phải tài nguyên trên URL; 404 ở endpoint sản phẩm nghĩa là "sản phẩm không tồn tại". Form hiện lỗi đúng ô |
| D21 | Giá sản phẩm | Chuỗi chữ số `^[1-9][0-9]*$`, **1 – 100.000.000** VND | VND không có số lẻ; chặn nhập "199.000"/"199,000" mơ hồ; trần 100 triệu đủ cho quần áo, chặn gõ nhầm số 0 |
| D22 | Phân trang danh sách | **Không** ở Sprint 2 | Dữ liệu demo nhỏ; xem lại khi > 200 sản phẩm hoặc > 500 ms, thêm `limit`/`cursor` tuỳ chọn không phá contract |
| D23 | Signed URL ảnh sản phẩm | TTL **3600 giây** (như avatar); danh sách ký theo lô `createSignedUrls`; ký lỗi → `imageUrl: null` | Một cơ chế cho cả 2 bucket private |
| D24 | Sắp xếp | Danh mục (admin + công khai): `created_at asc, id`. Sản phẩm admin: `created_at desc, id desc`. Sản phẩm công khai: `created_at asc, id` | Giữ thứ tự seed của PB; admin thấy sản phẩm vừa thêm; thứ tự công khai ổn định, khớp index, cố định "sản phẩm đầu tiên" US-05 |
| D25 | Upload ảnh sản phẩm | multipart field `image`; POST bắt buộc, PUT tuỳ chọn; PUT luôn multipart; ảnh thiếu báo trong `fields.image` (không dùng mã riêng như `AVATAR_REQUIRED`) | Một parser cho cả 2 endpoint; form nhiều trường hiện mọi lỗi một lần |
| D26 | (Sprint 3, đã chốt 2026-11-17) Sinh ảnh thử đồ | **Bất đồng bộ**: `POST /api/try-on` → 202 + job trong tiến trình Express (giới hạn đồng thời) → client poll `GET /api/try-on/:id` mỗi 2 s, dừng sau 120 s | Sinh ảnh mất 5–20 s; request ngắn, chuyển sản phẩm không huỷ job (quay lại là có ảnh). Hàng đợi ngoài để khi chạy nhiều instance |
| D27 | (Sprint 3, đã chốt 2026-11-17) Cache | Bảng `try_on_results`, khoá `input_key` = SHA-256(provider, model, phiên bản prompt, avatar_path, image_path sản phẩm, [số đo]); unique một phần cho `succeeded` và job đang chạy; không TTL | Đổi đầu vào tự sinh lại; request trùng không sinh 2 lần, không trừ 2 lượt |
| D28 | (Sprint 3, **đã chốt 2026-11-17**) Provider | Adapter theo env `TRY_ON_PROVIDER` = `stub` | `gemini`; mặc định `stub` (dev/test/CI); provider thật **Gemini** qua SDK `@google/genai` (tái dùng `geminiImageService.editImage`), model `GEMINI_IMAGE_MODEL` (mặc định `gemini-3.1-flash-image`), key `GEMINI_API_KEY`; prompt cố định ở backend có `promptVersion` (Q12; `try-on-room.md` mục 2) | Dev không tốn tiền, không gửi ảnh ra ngoài; đổi provider/model không đổi API; đã thử nghiệm thật 2026-11-17 (~10–12 s/ảnh) |
| D29 | (Sprint 3, đã chốt 2026-11-17) Dọn kết quả | Thay/xoá ảnh toàn thân → xoá mọi kết quả của user; thay ảnh/xoá sản phẩm → xoá kết quả của sản phẩm; row trước, object sau, best-effort | Ảnh kết quả chứa hình người dùng phải đi theo ảnh gốc; không để object mồ côi |
| D30 | (Sprint 3, đã chốt 2026-11-17) Hạn mức | 30 job thành công/đang chạy mỗi user mỗi ngày (giờ VN), đếm từ DB; cache hit và job `failed` không tính; limiter POST 20/phút, GET 120/phút theo user | Kiểm soát chi phí provider; không phạt người dùng vì lỗi hệ thống |
| D31 | (Sprint 3, đã chốt 2026-11-17) Quyền xem kết quả | Mọi truy vấn lọc `profile_id = sub`; id của người khác → 404 `TRY_ON_NOT_FOUND` | Không lộ sự tồn tại của ảnh người khác |
| D32 | (Sprint 4, đã chốt 2026-11-18) Nơi lưu giỏ | **Server**: bảng `cart_items` (PK `profile_id, product_id`), không dùng `localStorage` | Giỏ theo tài khoản, đồng nhất giữa thiết bị/tab; đặt hàng phải đọc giỏ ở server để tính tiền nên lưu client vẫn phải gửi lên; không giữ dữ liệu mua sắm trên máy dùng chung. Trade-off: mỗi thao tác 1 request (chấp nhận được) |
| D33 | (Sprint 4, đã chốt 2026-11-18) Ngữ nghĩa API giỏ | POST thêm = **cộng dồn** (201 dòng mới / 200 đã có), PUT = số lượng **tuyệt đối**, DELETE idempotent; mọi thao tác trả **toàn bộ** `cart` | PUT tuyệt đối an toàn khi gửi lại; client thay state theo server, không tự tính tổng; 201/200 cho UI chọn đúng toast |
| D34 | (Sprint 4, đã chốt 2026-11-18) Tính tiền | Giỏ **không lưu giá**; `price`, `lineTotal`, `total` tính ở server từ `products.price` hiện tại; giá chốt bằng snapshot `order_items.unit_price` lúc đặt; tổng `bigint` | Không tin client; không có "giá cũ trong giỏ" phải đồng bộ; 50 × 10 × 100.000.000 vượt `integer` |
| D35 | (Sprint 4, đề xuất) Đặt hàng nguyên tử | Hàm Postgres `public.place_order` gọi qua `supabase.rpc` (1 transaction): khoá profile, kiểm tra idempotency, khoá giỏ + `FOR SHARE` sản phẩm, so tổng, tạo đơn + dòng, xoá giỏ. `SECURITY INVOKER`, `search_path = ''`, EXECUTE chỉ `service_role` (REVOKE `public/anon/authenticated`). Lỗi nghiệp vụ `P0001` + message = mã API | supabase-js không có transaction; nhiều request rời có thể tạo đơn thiếu dòng hoặc giỏ không được xoá. Postgres mặc định cấp EXECUTE cho `PUBLIC` nên phải REVOKE |
| D36 | (Sprint 4, đề xuất) Idempotency | `idempotencyKey` (uuid) **trong body**, client sinh khi mở `/checkout`, giữ tới khi thành công; unique `(profile_id, idempotency_key)`; khoá đã dùng → 200 đơn cũ | Bấm 2 lần / gửi lại khi lỗi mạng không tạo đơn trùng. Không dùng header `Idempotency-Key` để khỏi sửa `allowedHeaders` của CORS |
| D37 | (Sprint 4, đã chốt 2026-11-18) Giỏ đổi lúc đặt | Client gửi `expectedTotal` (= `cart.total` đang hiển thị); server tính lại, lệch → 409 `CART_CHANGED`, client tải lại giỏ, giữ form | Người mua không bị tính giá khác giá đã thấy (đổi giá, sản phẩm bị xoá, tab khác sửa số lượng) |
| D38 | (Sprint 4, đã chốt 2026-11-18) Lịch sử đơn khi xoá sản phẩm | `order_items` snapshot `product_name`, `category_name`, `unit_price`; `product_id` FK `ON DELETE SET NULL`; **không** snapshot ảnh (ảnh lấy từ sản phẩm hiện tại nếu còn); `orders.profile_id` `ON DELETE RESTRICT`; `cart_items` `CASCADE` | Xoá sản phẩm (Sprint 2) không làm mất đơn; không cần bucket/copy object mới; xoá user không âm thầm mất đơn |
| D39 | (Sprint 4, đề xuất) Danh sách đơn admin | Phân trang **offset** (`page`, `pageSize` 1–50, mặc định 20, `count: 'exact'`), lọc `status`, sắp `created_at desc, id desc`; danh sách không trả SĐT/địa chỉ (chỉ ở chi tiết) | Đơn tăng dần không giới hạn (khác D22); offset đủ cho quy mô demo, dễ làm nút trang; tối thiểu hoá dữ liệu cá nhân |
| D40 | (Sprint 4, đề xuất) Chống lạm dụng | `cartLimiter` 60/phút (POST/PUT/DELETE giỏ), `cartReadLimiter` 120/phút (GET giỏ), `orderLimiter` 10/15 phút (POST đơn), theo `req.user.id` sau `requireAuth` | Cùng cơ chế `createLimiter`; đặt hàng là thao tác hiếm |
| D41 | (Sprint 4, đề xuất) Mã đơn | Cột `order_number bigint generated always as identity`; hiển thị `DH` + 6 chữ số (`DH000123`); `id` uuid vẫn dùng trên URL/API | Mã ngắn dễ đọc qua điện thoại; uuid trên URL không đoán được đơn người khác |
## 7. Câu hỏi còn mở (cần người dùng chốt)

Các mục dưới đã có **giá trị mặc định** trong flow; dev làm theo mặc định nếu người dùng chưa trả lời.

| # | Câu hỏi | Mặc định đang dùng |
|---|---------|--------------------|
| ~~Q1~~ | ~~Sau đăng ký tự đăng nhập hay chuyển `/login`?~~ | **Đã chốt** (2026-10-30): chuyển `/login`, không tự đăng nhập. Xem D3 |
| Q2 | Mật khẩu có **bắt buộc** ký tự đặc biệt không? | Không bắt buộc, chỉ khuyến nghị |
| Q3 | Ảnh ngang/không đúng tỷ lệ: chỉ cảnh báo hay **chặn** hẳn? | Chỉ cảnh báo, user xác nhận để tiếp tục |
| ~~Q4~~ | ~~`JWT_EXPIRES_IN = 7d` có chấp nhận được không?~~ | **Đã chốt** (2026-11-03): giữ `7d`. Dự án học tập, không thương mại nên chấp nhận rủi ro logout không thu hồi token (D5, D6). Nếu đưa lên production thì nâng cấp access + refresh token (mục 8) |
| ~~Q5~~ | ~~Có cần nút xoá ảnh không?~~ | **Đã chốt** (2026-11-03): có làm nút xoá ảnh ở Sprint 1. Xem D18 |
| ~~Q6~~ | ~~Có trường phone không?~~ | **Đã chốt** (2026-11-03): **có**, tuỳ chọn, SĐT di động VN, thêm cột bằng migration `004` (xem `schema.md` mục 3, 8 và `profile.md`) |
| ~~Q7~~ | ~~Sau logout về `/` hay `/login`?~~ | **Đã chốt** (2026-11-03): về `/` kèm toast "Bạn đã đăng xuất." |
| Q8 | (Sprint 2) `GET /api/categories` có ẩn danh mục chưa có sản phẩm không? | **Đã chốt 2026-11-03: ẩn.** API công khai chỉ trả danh mục có >= 1 sản phẩm (không trả `productCount`); `GET /api/categories/:id/products` với danh mục rỗng vẫn 200 + `[]`; API admin trả tất cả. Cập nhật `product-management.md` mục API công khai khi làm Task 7 |
| Q9 | (Sprint 2) Trần giá 100.000.000 ₫ có phù hợp? | Giữ 100.000.000 (D21) |
| Q10 | (Sprint 2) Có cần kiểm tra tỷ lệ/kích thước ảnh flat lay (như avatar) không? | **Đã chốt 2026-11-03:** kiểm tra kích thước tối thiểu 400×400 px (cả hai cạnh, lỗi 400 `fields.image`), không kiểm tra tỷ lệ; xem lại giới hạn tối đa ở Epic 3 khi biết yêu cầu đầu vào của model thử đồ |
| Q11 | (Sprint 2) Sprint 3 truy cập danh mục theo `id` hay `slug`? | Theo `id` (`/api/categories/:id/products`); thêm tra theo slug ở Sprint 3 nếu cần URL thân thiện |
| ~~Q12~~ | ~~(Sprint 3) Provider GenAI thật và ngân sách?~~ | **Đã chốt** (2026-11-17): `stub` mặc định; provider thật **Gemini** (`TRY_ON_PROVIDER=gemini`, model `gemini-3.1-flash-image` qua `GEMINI_IMAGE_MODEL`), dùng tier trả phí. Xem D28, `try-on-room.md` mục 2. Giá chính thức, chính sách dữ liệu và model chốt kiểm chứng ở Task 6. Phương án đã loại: FASHN `tryon-v1.6`, Vertex AI `virtual-try-on-001` |
| ~~Q13~~ | ~~(Sprint 3) Bắt buộc chiều cao/cân nặng để thử đồ?~~ | **Đã chốt** (2026-11-17): bắt buộc ảnh toàn thân + chiều cao + cân nặng; provider mặc định không dùng số đo nên không đưa vào khoá cache |
| ~~Q14~~ | ~~(Sprint 3) Hộp thoại đồng ý gửi ảnh cho dịch vụ AI?~~ | **Đã chốt** (2026-11-17): có, một lần, lưu `profiles.try_on_consent_at` (migration `008`) |
| ~~Q15~~ | ~~(Sprint 3) Sinh trước (prefetch) bao nhiêu sản phẩm?~~ | **Đã chốt** (2026-11-17, khác mặc định cũ "1 sản phẩm kế tiếp"): **không sinh trước, không prefetch**. Chỉ POST cho sản phẩm user dừng lại xem (debounce 400 ms); sản phẩm mới chờ ~8–12 s với trạng thái đang tạo, không chặn điều hướng. Lý do: tiết kiệm lượt và chi phí Gemini (`try-on-room.md` mục 3, 9) |
| ~~Q16~~ | ~~(Sprint 3) Loại trang phục (áo/quần/váy) cho provider?~~ | **Đã chốt** (2026-11-17): không thêm cột; một prompt Gemini chung cho mọi danh mục (model tự nhận món đồ trong ảnh 2); xem lại nếu Task 6 thấy quần/váy kém |
| ~~Q17~~ | ~~(Sprint 3) Cuối danh sách: dừng hay quay vòng?~~ | **Đã chốt** (2026-11-17): dừng, mũi tên phải disabled, thẻ "Đã xem hết"; vẫn lùi lại sản phẩm trước được |
| ~~Q18~~ | ~~(Sprint 3) Hạn mức mỗi ngày?~~ | **Đã chốt** (2026-11-17): 30 lượt/user/ngày (giờ VN), áp cả admin; cache hit và lỗi không tính |
| ~~Q19~~ | ~~(Sprint 3) Điểm vào phòng thử đồ, đích sau đăng nhập?~~ | **Đã chốt** (2026-11-17): nhiều lối vào (link "Phòng thử đồ" ở header/`AccountMenu`, CTA landing, link ở `/profile`); đích mặc định sau đăng nhập đổi sang `/try-on` (Sprint 3 Task 4) |
| ~~Q20~~ | ~~(Sprint 3) Có hiện nút "Thêm vào giỏ" sớm?~~ | **Đã chốt** (2026-11-17): không có nút ở Sprint 3 (US-07 thuộc Sprint 4) |
| ~~Q21~~ | ~~(Sprint 3) Test tự động phạm vi nào?~~ | **Đã chốt** (2026-11-17): Vitest (backend + frontend), supertest cho HTTP, mock Supabase và Gemini; không E2E Playwright tự động ở Sprint 3 |
| ~~Q22~~ | ~~(Sprint 3) Thời hạn giữ ảnh kết quả?~~ | **Đã chốt** (2026-11-17): giữ tới khi đầu vào đổi (thay/xoá ảnh toàn thân, thay ảnh/xoá sản phẩm); không TTL; không có nút xoá toàn bộ ảnh thử đồ |
| Q23 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Giỏ lưu ở server hay `localStorage`? | **Server** (`cart_items`, D32): đồng bộ thiết bị/tab, tính tiền ở server; `localStorage` vẫn phải gửi lên khi đặt và lệch giữa tab |
| Q24 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Có làm bước **đặt hàng** (US-10, bổ sung ngoài PB) trong Sprint 4 không? | **Có, tối thiểu**: nút Đặt hàng → form giao hàng → tạo đơn `pending`, xoá giỏ, trang xác nhận. Không có thì US-09 không có dữ liệu. Phương án thay thế bị loại: "giỏ = đơn" (admin xem giỏ người dùng) – không có thời điểm "đã đặt", lộ hành vi chưa mua |
| Q25 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Có số lượng / size / màu không? | **Có số lượng 1–10 mỗi dòng; không size/màu** (sản phẩm chưa có biến thể – US-04 ngoài phạm vi); không tồn kho |
| Q26 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Thêm sản phẩm đã có trong giỏ: tăng số lượng hay chặn? | **Tăng +1** (tối đa 10, vượt → 409 `CART_QUANTITY_LIMIT`); toast "{tên} đã có trong giỏ, số lượng: n". Chặn khiến nút trông như hỏng khi người dùng muốn mua 2 chiếc |
| Q27 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Thu thập thông tin giao hàng nào? | **Họ tên người nhận, SĐT (bắt buộc, di động VN như `profiles.phone`), địa chỉ một ô 10–500 ký tự, ghi chú tuỳ chọn**; điền sẵn tên + SĐT từ hồ sơ; **không** lưu ngược vào hồ sơ, không có sổ địa chỉ; tách tỉnh/quận/phường để sau. Chỉ chủ đơn + admin xem, không log |
| Q28 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Thanh toán và phí vận chuyển? | **Không tích hợp thanh toán**: chỉ ghi nhận "Thanh toán khi nhận hàng (COD)" (`payment_method = 'cod'`); **không phí vận chuyển** (tổng đơn = tổng giỏ). Dự án học tập (Q4), cổng thanh toán cần story riêng |
| Q29 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Trạng thái đơn và ai đổi? | **Sprint 4 chỉ có `pending` ("Chờ xử lý"), admin chỉ xem** (đúng US-09), người mua không huỷ. CHECK DB đã có đủ `pending/confirmed/shipping/completed/cancelled` để thêm "admin đổi trạng thái" ở sprint sau không cần migration (Could) |
| Q30 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Giá chốt lúc nào; sản phẩm đổi giá / bị xoá khi đang trong giỏ? | **Giá chốt lúc đặt** (snapshot); giỏ luôn hiện giá hiện tại; lệch lúc đặt → 409 `CART_CHANGED` + tải lại giỏ (D37); sản phẩm bị xoá tự biến khỏi giỏ (cascade), không thông báo riêng ngoài lúc đặt |
| Q31 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Admin có thêm vào giỏ / đặt hàng được không? | **Có** (mọi role đã đăng nhập, như phòng thử đồ – Q18); đơn của admin hiện trong danh sách như đơn khác |
| Q32 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Ảnh trong giỏ / đơn: ảnh thử đồ hay flat lay; có snapshot ảnh không? | **Flat lay** (luôn có; ảnh thử đồ có thể chưa tạo/bị dọn và là dữ liệu nhạy cảm); bấm dòng giỏ mở lại phòng thử đồ ở đúng sản phẩm. Đơn **không snapshot ảnh**: sản phẩm bị xoá → ô giữ chỗ "Sản phẩm đã ngừng bán" (tránh bucket/copy object mới) |
| Q33 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Giới hạn kích thước giỏ? | **50 dòng, 10 chiếc/dòng** (giới hạn mềm ở backend, trả trong `cart.limits`); đủ cho demo, chặn lạm dụng và tổng tiền bất thường |
| Q34 | (Sprint 4, đã chốt 2026-11-18 theo mặc định) Người mua có trang "Đơn hàng của tôi" (danh sách) không? | **Không ở Sprint 4** (PB không có): chỉ trang xác nhận `/orders/:id` (xem lại được bằng URL). Danh sách `GET /api/orders` + `/orders` là Could cho sprint sau (index `orders_profile_created_idx` đã có) |

## 8. Đề xuất thay đổi schema

**Sprint 1 cần thêm migration `004_add_profiles_phone.sql`** (cột `phone`, chốt Q6 ngày 2026-11-03). Các flow khác dùng đúng cột/constraint của `001`–`002`.

**Sprint 4 (nháp, chưa áp):** `010_create_cart_items.sql` (bảng `cart_items`), `011_create_orders.sql` (bảng `orders`, `order_items`, hàm `place_order`). Thiết kế: `schema.md` mục 15–17. Áp tuần tự `010` → `011` sau khi chốt Q23–Q34.

Ghi nhận cho sau (chỉ làm khi người dùng yêu cầu thu hồi token phía server, ví dụ "đăng xuất khỏi mọi thiết bị", đổi mật khẩu, khoá user ở Epic 2):
- `004_add_profiles_token_version.sql`: `alter table public.profiles add column token_version integer not null default 0;` JWT thêm claim `tv`; `requireAuth` so sánh với DB (thêm 1 query/request); tăng `token_version` để vô hiệu mọi token cũ.
