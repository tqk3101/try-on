# Flows Sprint 1: Auth & Profile

> Sprint 1, Task 4. Áp dụng cho US-01 (đăng ký, đăng nhập, logout, bảo vệ route) và US-02 (hồ sơ, ảnh toàn thân).
> Đọc kèm `design/database/schema.md` (bảng `profiles`, bucket `avatars`). Task 5–7 cài đặt **đúng** theo tài liệu này. Nếu cần đổi, cập nhật tài liệu trước.

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
| 403 | `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này. | Dự phòng cho `requireRole('admin')` (Epic 2), chưa dùng ở Sprint 1 |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên yêu cầu. | Đã có |
| 409 | `EMAIL_EXISTS` | Email này đã được đăng ký. | Register trùng email |
| 413 | `FILE_TOO_LARGE` | Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn. | multer `LIMIT_FILE_SIZE` |
| 415 | `UNSUPPORTED_FILE_TYPE` | Chỉ hỗ trợ ảnh JPG hoặc PNG. | MIME hoặc magic bytes không phải jpeg/png |
| 429 | `TOO_MANY_REQUESTS` | Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút. | Rate limit |
| 500 | `INTERNAL_ERROR` | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | Lỗi không lường trước, lỗi DB (đã có) |
| 502 | `UPLOAD_FAILED` | Không thể tải ảnh lên lúc này. Vui lòng thử lại. | Supabase Storage lỗi khi upload |
| 0 (client) | `NETWORK_ERROR` | Không thể kết nối tới máy chủ. Vui lòng thử lại. | Fetch lỗi mạng (đã có trong `apiClient`) |

## 5. Route frontend

| Path | Loại | Ghi chú |
|------|------|---------|
| `/` | Public | Landing. Đã đăng nhập vẫn xem được |
| `/register` | Chỉ khách (guest-only) | Đã đăng nhập → chuyển `/profile`. Đăng ký thành công → `/login` (router state `{ registered: true, email }`, giữ query `redirect` nếu có) |
| `/login` | Chỉ khách | Đã đăng nhập → chuyển `redirect` hợp lệ hoặc `/profile`. Đọc query `redirect`, `reason=expired` và router state `registered`, `email` (banner đăng ký thành công + điền sẵn email) |
| `/profile` | Bảo vệ (cần đăng nhập) | Đích mặc định **sau đăng nhập** ở Sprint 1 (chưa có dashboard). Không phải đích sau đăng ký |
| `*` | Public | 404 |

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

## 8. Đề xuất thay đổi schema

**Sprint 1 cần thêm migration `004_add_profiles_phone.sql`** (cột `phone`, chốt Q6 ngày 2026-11-03). Các flow khác dùng đúng cột/constraint của `001`–`002`.

Ghi nhận cho sau (chỉ làm khi người dùng yêu cầu thu hồi token phía server, ví dụ "đăng xuất khỏi mọi thiết bị", đổi mật khẩu, khoá user ở Epic 2):
- `004_add_profiles_token_version.sql`: `alter table public.profiles add column token_version integer not null default 0;` JWT thêm claim `tv`; `requireAuth` so sánh với DB (thêm 1 query/request); tăng `token_version` để vô hiệu mọi token cũ.
