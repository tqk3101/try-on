# Flows: Auth, Profile & Kho hàng

> Sprint 1, Task 4: US-01 (đăng ký, đăng nhập, logout, bảo vệ route), US-02 (hồ sơ, ảnh toàn thân).
> Sprint 2, Task 2: US-03 (danh mục), US-04 (sản phẩm) – khu vực admin và API đọc cho Sprint 3.
> Sprint 3, Task 1 (2026-11-17; Q12 đã chốt: Gemini, `stub` mặc định; Q13–Q22 đã chốt theo mặc định 2026-11-17): US-05, US-06 – phòng thử đồ, sinh ảnh GenAI bất đồng bộ + cache.
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
| [try-on-room.md](try-on-room.md) | **Sprint 3.** Provider GenAI (Gemini, `stub` mặc định; prompt cố định, ánh xạ lỗi), `POST /api/try-on` (202 + polling `GET /api/try-on/:id`), cache `try_on_results`, hạn mức, đồng ý xử lý ảnh, dọn kết quả khi đổi ảnh, luồng `/try-on` (mũi tên/vuốt, prefetch) | S3 Task 1, 3, 4, 6 |

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
| 409 | `PROFILE_INCOMPLETE` | Bạn cần hoàn thiện hồ sơ (ảnh toàn thân, chiều cao, cân nặng) để thử đồ. | Sprint 3: kèm `fields` (`avatar`, `heightCm`, `weightKg`) – ngoại lệ có chủ đích với quy tắc "`fields` chỉ đi với `VALIDATION_ERROR`" để client liệt kê mục thiếu |
| 409 | `TRY_ON_CONSENT_REQUIRED` | Bạn cần đồng ý cho phép xử lý ảnh trước khi thử đồ. | Sprint 3: `profiles.try_on_consent_at` null |
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
| `/register` | Chỉ khách (guest-only) | Đã đăng nhập → chuyển `/profile`. Đăng ký thành công → `/login` (router state `{ registered: true, email }`, giữ query `redirect` nếu có) |
| `/login` | Chỉ khách | Đã đăng nhập → chuyển `redirect` hợp lệ hoặc `/profile`. Đọc query `redirect`, `reason=expired` và router state `registered`, `email` (banner đăng ký thành công + điền sẵn email) |
| `/profile` | Bảo vệ (cần đăng nhập) | Đích mặc định **sau đăng nhập** ở Sprint 1 (chưa có dashboard). Không phải đích sau đăng ký |
| `/admin` | Chỉ admin (Sprint 2) | Chuyển `/admin/categories`. Guest → `/login?redirect=`; user thường → trang 403 |
| `/admin/categories` | Chỉ admin | Danh sách + thêm/sửa trong hộp thoại, xác nhận xoá |
| `/admin/products` | Chỉ admin | Danh sách, query `?categoryId=` cho bộ lọc |
| `/admin/products/new` | Chỉ admin | Form thêm (chọn sẵn danh mục nếu có `?categoryId=`) |
| `/admin/products/:id/edit` | Chỉ admin | Form sửa (`GET /api/admin/products/:id`) |
| `/try-on` | Bảo vệ (Sprint 3) | Chọn danh mục (`GET /api/categories`); hồ sơ chưa đủ → màn "Hoàn thiện hồ sơ" |
| `/try-on/:categoryId` | Bảo vệ (Sprint 3) | Phòng thử đồ; query `?product=<productId>` giữ vị trí (cập nhật bằng `replace`) |
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
| D11 | Quay lại trang cũ sau login | Query `?redirect=<path>`, chỉ chấp nhận path nội bộ (bắt đầu `/`, không phải `//` hay `/\`, không phải `/login`, `/register`); sai → `/profile` | Sống sót khi reload; dùng được từ handler 401 ngoài React tree; chống open redirect |
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
| D26 | (Sprint 3, đã chốt 2026-11-17) Sinh ảnh thử đồ | **Bất đồng bộ**: `POST /api/try-on` → 202 + job trong tiến trình Express (giới hạn đồng thời) → client poll `GET /api/try-on/:id` mỗi 2 s, dừng sau 120 s | Sinh ảnh mất 5–20 s; request ngắn, chuyển sản phẩm không huỷ job, prefetch tự nhiên. Hàng đợi ngoài để khi chạy nhiều instance |
| D27 | (Sprint 3, đã chốt 2026-11-17) Cache | Bảng `try_on_results`, khoá `input_key` = SHA-256(provider, model, phiên bản prompt, avatar_path, image_path sản phẩm, [số đo]); unique một phần cho `succeeded` và job đang chạy; không TTL | Đổi đầu vào tự sinh lại; request trùng không sinh 2 lần, không trừ 2 lượt |
| D28 | (Sprint 3, **đã chốt 2026-11-17**) Provider | Adapter theo env `TRY_ON_PROVIDER` = `stub` | `gemini`; mặc định `stub` (dev/test/CI); provider thật **Gemini** qua SDK `@google/genai` (tái dùng `geminiImageService.editImage`), model `GEMINI_IMAGE_MODEL` (mặc định `gemini-3.1-flash-image`), key `GEMINI_API_KEY`; prompt cố định ở backend có `promptVersion` (Q12; `try-on-room.md` mục 2) | Dev không tốn tiền, không gửi ảnh ra ngoài; đổi provider/model không đổi API; đã thử nghiệm thật 2026-11-17 (~10–12 s/ảnh) |
| D29 | (Sprint 3, đã chốt 2026-11-17) Dọn kết quả | Thay/xoá ảnh toàn thân → xoá mọi kết quả của user; thay ảnh/xoá sản phẩm → xoá kết quả của sản phẩm; row trước, object sau, best-effort | Ảnh kết quả chứa hình người dùng phải đi theo ảnh gốc; không để object mồ côi |
| D30 | (Sprint 3, đã chốt 2026-11-17) Hạn mức | 30 job thành công/đang chạy mỗi user mỗi ngày (giờ VN), đếm từ DB; cache hit và job `failed` không tính; limiter POST 20/phút, GET 120/phút theo user | Kiểm soát chi phí provider; không phạt người dùng vì lỗi hệ thống |
| D31 | (Sprint 3, đã chốt 2026-11-17) Quyền xem kết quả | Mọi truy vấn lọc `profile_id = sub`; id của người khác → 404 `TRY_ON_NOT_FOUND` | Không lộ sự tồn tại của ảnh người khác |
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
| Q13 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Bắt buộc chiều cao/cân nặng để thử đồ? | Có bắt buộc (cùng ảnh toàn thân); provider mặc định không dùng số đo nên không đưa vào khoá cache |
| Q14 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Hộp thoại đồng ý gửi ảnh cho dịch vụ AI? | Có, một lần, lưu `profiles.try_on_consent_at` (migration `008`) |
| Q15 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Prefetch bao nhiêu sản phẩm? | 1 sản phẩm kế tiếp, sau khi ảnh hiện tại xong |
| Q16 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Loại trang phục (áo/quần/váy) cho provider? | Không thêm cột; một prompt Gemini chung cho mọi danh mục (model tự nhận món đồ trong ảnh 2); xem lại nếu Task 6 thấy quần/váy kém |
| Q17 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Cuối danh sách: dừng hay quay vòng? | Dừng, mũi tên phải disabled, thẻ "Đã xem hết" |
| Q18 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Hạn mức mỗi ngày? | 30 lượt/user/ngày (giờ VN), áp cả admin; cache hit và lỗi không tính |
| Q19 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Điểm vào phòng thử đồ, đích sau đăng nhập? | Link "Phòng thử đồ" ở header + CTA landing; đích mặc định sau đăng nhập đổi sang `/try-on` |
| Q20 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Có hiện nút "Thêm vào giỏ" sớm? | Không ở Sprint 3 (US-07 thuộc Sprint 4) |
| Q21 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Test tự động phạm vi nào? | Vitest (backend + frontend), supertest cho HTTP với Supabase được mock; không E2E Playwright tự động ở Sprint 3 |
| Q22 | (Sprint 3, đã chốt 2026-11-17 theo mặc định) Thời hạn giữ ảnh kết quả? | Giữ tới khi đầu vào đổi hoặc user xoá ảnh; không TTL |

## 8. Đề xuất thay đổi schema

**Sprint 1 cần thêm migration `004_add_profiles_phone.sql`** (cột `phone`, chốt Q6 ngày 2026-11-03). Các flow khác dùng đúng cột/constraint của `001`–`002`.

Ghi nhận cho sau (chỉ làm khi người dùng yêu cầu thu hồi token phía server, ví dụ "đăng xuất khỏi mọi thiết bị", đổi mật khẩu, khoá user ở Epic 2):
- `004_add_profiles_token_version.sql`: `alter table public.profiles add column token_version integer not null default 0;` JWT thêm claim `tv`; `requireAuth` so sánh với DB (thêm 1 query/request); tăng `token_version` để vô hiệu mọi token cũ.
