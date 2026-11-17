# Sprint 2: Quản lý kho hàng (Admin)
## Mục tiêu Sprint
Admin quản lý được danh mục và sản phẩm (kèm ảnh flat lay) để Sprint 3 (phòng thử đồ) có dữ liệu quần áo.
User Stories: US-03 (quản lý danh mục), US-04 (thêm / sửa / xoá sản phẩm)

**Trạng thái:** DONE (bắt đầu 2026-11-03; đóng sprint 2026-11-17) — 8/8 task hoàn thành, US-03 + US-04 đã merge `main` (commit `c513f01`). Các mục tồn đọng đã verify ngày 2026-11-17 trên backend/DB/Storage/trình duyệt thật (dữ liệu test đã dọn: products = 0, bucket `avatars`/`products` rỗng, avatar member về null):
- API: member nhận 403 ở `GET/POST/PUT/DELETE /api/admin/products`; limiter `PUT /api/admin/products/:id` chặn từ lần 61 (60 lượt đầu qua, sau đó 429); ảnh > 5MB -> 413 `FILE_TOO_LARGE`; Storage lỗi (giả lập) -> 502 `UPLOAD_FAILED` và không để lại dòng DB; nhánh race `23503` lúc xoá danh mục -> 409 `CATEGORY_NOT_EMPTY` (giả lập bỏ qua bước đếm, FK thật chặn); `loginLimiter` 10 lần 401 rồi 429 kèm `Retry-After`
- UI: hộp thoại xoá ảnh `/profile` đúng nội dung, focus mặc định ở `Huỷ`, Esc đóng và trả focus về nút `Xoá ảnh`, xác nhận xoá thành công; form sửa sản phẩm ở 375px không cuộn ngang, bố cục ổn; `document.title` đúng `<Tên trang> — Try-on` ở mọi route (guest và đã đăng nhập)
- Ghi chú: `GET /api/health` đôi khi trả 503 ngay lúc backend vừa khởi động lại (`node --watch` restart khi đổi file); Supabase MCP `execute_sql` báo `28P01` (mật khẩu DB), cần kết nối lại MCP trước khi áp migration ở Sprint 3. Avatar chỉ "khuyến nghị" tỉ lệ/cạnh ngắn (không chặn) theo US-02
- **Chuyển sang Sprint 3:** thêm test runner + test tự động cho các luồng đã verify tay (Backend + Frontend). Chưa làm ở Sprint 2 vì thuộc hạ tầng mới, cần ghi vào backlog Sprint 3 trước khi triển khai

**Quyết định phạm vi (2026-11-03, mặc định khuyến nghị do người dùng yêu cầu tiếp tục):**
- Xoá danh mục còn sản phẩm: chặn, trả 409 (phải xoá/chuyển sản phẩm trước)
- Bucket ảnh sản phẩm: private + signed URL (nhất quán `avatars`)
- Không có trạng thái ẩn/hiện sản phẩm; giá là số nguyên VND
- Làm cả Task 7 (API đọc công khai) và Task 8 (nợ kỹ thuật)
- Q9 (chốt 2026-11-03): trần giá 100.000.000 VND, validate ở backend
- Q11 (chốt 2026-11-03): Sprint 3 tra danh mục theo `id`
- Q8 (chốt 2026-11-03): **ẩn** danh mục rỗng ở `GET /api/categories` (chỉ trả danh mục có >= 1 sản phẩm, không trả `productCount`); `GET /api/categories/:id/products` với danh mục tồn tại nhưng rỗng vẫn trả 200 + danh sách rỗng; API admin vẫn trả tất cả. Cần ghi chú trong `screens.md`/mô tả trang admin rằng danh mục rỗng chưa hiện phía người mua
- Q10 (chốt 2026-11-03): kiểm tra **kích thước tối thiểu 400×400 px** (hằng số dễ đổi, đọc từ header PNG/JPEG, lỗi 400 `fields.image`), **không** kiểm tra tỷ lệ; xem lại giới hạn tối đa chiều rộng/cao khi cần

**Đọc trước khi làm (CLAUDE.md, từ Sprint 2):** `design/database/schema.md`, `design/flows/*` (đặc biệt `login.md`, `avatar-upload.md`), `design/screens.md`, `design/design-system.md`; code tái sử dụng: `requireAuth` (`backend/src/middlewares/auth.js`), `uploadAvatar.js` + `avatarService.js` (upload Storage, magic bytes, dọn object), `apiClient`, `routes/guards.jsx`, `AuthProvider`. Đọc `common_errors.md` (nhánh `docs/common-errors`) và đưa mục liên quan vào prompt subagent: 1.1 (GRANT `service_role` cho bảng mới), 1.2 (áp migration trước khi code), 4.3 (hợp đồng API), 7.1/7.1b (dọn dữ liệu và object test).

## Tasks
### 1. Thiết kế Database & Storage cho kho hàng (Priority: High) — agent-ba
**Mô tả:** Mở rộng schema hiện có (không tạo bản song song), thêm bảng `categories`, `products` và bucket ảnh sản phẩm.

**Công việc:**
- [x] Cập nhật `design/database/schema.md`: `categories` (id, name duy nhất không phân biệt hoa thường, slug, created_at, updated_at), `products` (id, category_id, name, price, image_path, created_at, updated_at)
- [x] Quyết định và ghi rõ: xoá danh mục còn sản phẩm (chặn 409 hay xoá theo), kiểu giá (VND, số nguyên), có "ẩn/hiện" sản phẩm hay không
- [x] Bucket Storage cho ảnh flat lay (private + signed URL như `avatars`, hay public), giới hạn dung lượng và mime
- [x] Migration `006_create_categories_products.sql`, `007_create_products_bucket.sql` (RLS bật, **kèm GRANT cho `service_role`**, không cấp `anon`/`authenticated`); seed 3 danh mục mẫu (Áo thun, Váy, Quần Jeans) theo PB
- [x] Áp migration lên Supabase qua MCP và verify (`list_migrations`, `role_table_grants`, bucket)

**Acceptance Criteria:**
- Schema, migration và trạng thái áp dụng khớp nhau; `CLAUDE.md` và `migrations/README.md` cập nhật
- `service_role` truy cập được bảng mới; `anon`/`authenticated` không có quyền
- Quyết định về xoá danh mục có sản phẩm được ghi rõ

---

### 2. Thiết kế Flow & Màn hình admin (Priority: High) — agent-ba, agent-uiux
**Công việc:**
- [x] `design/flows/category-management.md`, `product-management.md` (luồng chính, luồng lỗi, validate) và `sprints/US-03.md`, `sprints/US-04.md`
- [x] API contract: `GET/POST/PUT/DELETE /api/admin/categories`, `/api/admin/products` (+ upload/thay ảnh), shape response thống nhất với `{ success, data }` hiện có
- [x] Cập nhật `design/screens.md` và `design-system.md` (layout admin, bảng danh sách, form, hộp thoại xác nhận xoá, trạng thái rỗng/lỗi/loading)

**Acceptance Criteria:** flow, contract và screens khớp nhau và khớp schema Task 1; không mâu thuẫn với tài liệu Sprint 1.

---

### 3. Phân quyền Admin (Priority: High) — agent-coder
**Mô tả:** Chỉ tài khoản `role = admin` vào được khu vực quản trị.

**Công việc:**
- [x] Middleware `requireAdmin` (sau `requireAuth`): 401 chưa đăng nhập, 403 không phải admin; kiểm tra role từ DB, không tin payload JWT cũ
- [x] Guard `RequireAdmin` ở frontend + layout `/admin` (menu Danh mục / Sản phẩm), link vào admin ở header khi `role = admin`
- [x] User thường vào `/admin` thấy trang 403 (không lộ nội dung) — đã test trình duyệt thật ngày 2026-11-03: `member` thấy 403 và không có link "Quản trị"; `admin` vào `/admin` -> `/admin/categories`, có menu Danh mục / Sản phẩm, link "Quản trị" trong menu tài khoản; guest -> `/login?redirect=`

**Acceptance Criteria:** guest -> `/login?redirect=`; user thường -> 403; admin vào được; API `/api/admin/*` trả 401/403 đúng; không phá luồng auth Sprint 1.

---

### 4. US-03 Quản lý danh mục (Priority: High) — agent-coder (+ agent-uiux cho UI)
**Công việc:**
- [x] API CRUD danh mục + validate (tên bắt buộc, độ dài, trùng tên -> 409)
- [x] UI danh sách / thêm / sửa / xoá (xác nhận trước khi xoá), phản hồi thành công/thất bại
- [x] Xử lý xoá danh mục còn sản phẩm theo quyết định ở Task 1
- **Đã validate bởi agent chính ngày 2026-11-03:** curl (guest 401, member 403, admin CRUD, trùng tên/slug/"váy" 409, rỗng/trống/51 ký tự 400, JSON hỏng 400, id sai/không tồn tại 404, xoá khi còn sản phẩm 409 CATEGORY_NOT_EMPTY); trình duyệt thật (thêm kèm chuẩn hoá khoảng trắng, lỗi rỗng/trùng trong hộp thoại, Esc, Enter, sửa, reload giữ dữ liệu, huỷ/xác nhận xoá, hộp thoại chặn xoá khi còn sản phẩm, mobile 375px dùng thẻ không cuộn ngang); lint + build sạch; dữ liệu test đã dọn (3 danh mục seed, 0 sản phẩm). Chưa verify: nhánh race `23503` lúc xoá; `/profile` sau khi `ConfirmDialog` được mở rộng (chưa mở lại hộp thoại xoá ảnh).
- **Phát sinh (cần làm ở Task 5):** (1) validator tên từ chối ký tự thay thế U+FFFD (tên lỗi encoding như `v�y` hiện được lưu, slug `v-y`); (2) focus sau khi xoá danh mục rơi về `body` thay vì `h2` như `screens.md` mô tả, kiểm tra lại cách trả focus.
- Ghi chú triển khai của agent-coder: code xong backend (`categoryController/Service/Validator`, route trong `adminRoutes.js`) và frontend (`AdminCategoriesPage`, `CategoryFormDialog`, `CategoryList`, `adminApi.js`, `FormDialog`/`EmptyState`/`ErrorState`, Toast `tone: error`, ConfirmDialog `busyLabel`/`confirmTone`). Đã verify: lint + build sạch, validator/slug bằng node, service với DB thật (tạo/trùng tên/trùng slug/sửa/404/xoá, đã dọn). Chưa verify: HTTP qua curl (401/403/uuid sai), UI trên trình duyệt, nhánh 409 CATEGORY_NOT_EMPTY thực (chưa có sản phẩm). (Đã được agent chính validate sau đó, xem mục "Đã validate" ở trên nên 3 công việc đã `[x]`.)

**Acceptance Criteria:** admin thêm, sửa, xoá được danh mục; trùng tên bị chặn; xoá có xác nhận; dữ liệu lưu bền sau reload; user thường không gọi được API.

---

### 5. US-04 Thêm sản phẩm + upload ảnh flat lay (Priority: High) — agent-coder (+ agent-uiux)
**Công việc:**
- [x] API tạo sản phẩm (tên, giá, danh mục, ảnh flat lay) + validate (giá > 0, danh mục tồn tại, ảnh jpeg/png đúng magic bytes, giới hạn dung lượng, kích thước tối thiểu 400×400 px) + `GET /api/admin/products[/:id]`
- [x] Tái sử dụng logic upload/dọn object của avatar (tổng quát hoá thay vì sao chép): `storageService.js` (bucket tham số), `utils/image.js`, `middlewares/imageUpload.js`
- [x] UI danh sách sản phẩm (lọc theo danh mục) và form thêm có xem trước ảnh
- **Đã validate bởi agent chính ngày 2026-11-03:** lint + build sạch; curl (guest 401, member 403, admin 201; ảnh 399×400 -> 400 `fields.image`; file giả đuôi .png -> 415; thiếu ảnh/giá 0/danh mục không tồn tại -> 400 đúng `fields`; list lọc theo danh mục, `imageUrl` signed tải được, `productCount` cập nhật); trình duyệt thật (danh sách + thumbnail 400px, lọc đồng bộ URL, `categoryId=abc` tự bỏ query, form: lỗi rỗng + focus ô đầu, chặn ảnh nhỏ/`.txt` ở client, xem trước ảnh, giá tách nghìn, lưu -> về danh sách giữ `?categoryId=` + toast, mobile 375px không cuộn ngang, focus về `h2` sau khi xoá danh mục, `/profile` tải bình thường); dữ liệu test đã dọn (0 sản phẩm, `storage.objects` products = 0, avatars = 0). Chưa verify: limiter 60/15 phút, lỗi 413 (>5MB) và 502 qua giao diện, hộp thoại xoá ảnh trên `/profile` sau khi tái cấu trúc upload (agent-coder đã chạy regression avatar bằng script với Storage thật).
- **Ghi chú agent-coder:** đã test bằng node với DB/Storage thật: 30 unit (đọc kích thước PNG/JPEG, validator, U+FFFD) + 12 integration (201 PNG/JPEG, 399×400 -> 400, file giả đuôi .png -> 415, >5MB -> 413, nhiều lỗi cùng lúc, danh mục không tồn tại, multer limits, lỗi INSERT 23503/23514 -> object được dọn, list/lọc/detail) + regression avatar (upload/thay/xoá); dữ liệu test đã dọn (bucket `products` 0 object). Chưa test: HTTP có token (401/403, limiter 60/15 phút), UI trình duyệt. Nút Sửa/Xoá ở danh sách bị ẩn (Task 6). Đã xử lý 2 việc phát sinh từ Task 4: validator tên từ chối U+FFFD (danh mục + sản phẩm); trả focus về `h2` sau khi xoá danh mục (chưa kiểm tra lại trên trình duyệt).

**Acceptance Criteria:** thêm sản phẩm kèm ảnh thành công; ảnh lưu đúng bucket; file sai định dạng / quá lớn bị từ chối với thông báo rõ; lỗi DB không để lại object mồ côi.

---

### 6. US-04 Sửa / xoá sản phẩm (Priority: Medium) — agent-coder (+ agent-uiux)
**Công việc:**
- [x] API sửa (kể cả thay ảnh, xoá object cũ) và xoá sản phẩm (xoá luôn object ảnh) — `PUT/DELETE /api/admin/products/:id` (`productController.putProduct/removeProduct`, `productService.updateProduct/deleteProduct/getProductImagePath`)
- [x] UI form sửa (`AdminProductFormPage` dùng chung với form thêm, route `/admin/products/:id/edit`), hộp thoại xác nhận xoá, nút Sửa/Xoá ở danh sách
- **Đã validate bởi agent chính ngày 2026-11-03 (trình duyệt thật, admin đăng nhập, DB/Storage thật):** lint + build sạch; thêm sản phẩm; form sửa điền sẵn, nút Lưu khoá khi chưa đổi; sửa tên/giá/danh mục + thay ảnh (DB cập nhật, `image_path` đổi, object cũ bị xoá, còn đúng 1 object); lỗi validate (tên rỗng, giá 0) hiện đúng và focus ô lỗi đầu tiên; lọc theo danh mục giữ `?categoryId=` ở link Sửa, Huỷ và Thêm; hộp thoại xoá: Esc không xoá + trả focus về nút Xoá, xác nhận xoá -> toast "Đã xoá sản phẩm.", focus về `h2`, trạng thái rỗng theo bộ lọc; id không tồn tại -> API 404, UI về danh sách; 375px không cuộn ngang. Dữ liệu test đã dọn (`products` = 0, `storage.objects` products = 0, avatars = 0). **Chưa verify:** 403 user thường qua HTTP, limiter 60/15 phút cho PUT, 502 `UPLOAD_FAILED` khi sửa, hộp thoại xoá ảnh trên `/profile` sau khi mở rộng `ConfirmDialog`, bố cục form sửa ở 375px (chỉ kiểm tra không cuộn ngang trên trang danh sách).

**Acceptance Criteria:** sửa/xoá hoạt động và dọn Storage; không còn object mồ côi sau xoá (`storage.objects` về 0 sau test).
- **Ghi chú agent-coder (Task 6):** đã test API (node, server thật + DB/Storage thật, token admin ký bằng JWT_SECRET): PUT chỉ text (200, tên chuẩn hoá, đổi danh mục, `image_path` giữ nguyên, 1 object); PUT kèm ảnh mới (200, `image_path` đổi, object cũ bị xoá, còn đúng 1 object); ảnh 399×400 -> 400 `fields.image`; file giả -> 415; >5MB -> 413; text sai + danh mục sai định dạng -> 400 mọi `fields`; danh mục không tồn tại -> 400; tên U+FFFD -> 400; id không tồn tại hoặc không phải uuid -> 404 (không upload); không multipart -> 400 `INVALID_UPLOAD`; lỗi UPDATE sau upload (gọi thẳng service với danh mục không tồn tại, 23503) -> object mới được dọn, ảnh cũ và DB giữ nguyên; DELETE -> 200, object về 0; xoá lại / id sai -> 404; không token -> 401. Dữ liệu test đã dọn (`products` = 0, `storage.objects` bucket `products` = 0). **Chưa verify:** UI trên trình duyệt (không có thông tin đăng nhập admin) gồm form sửa, thay ảnh, hộp thoại xoá, focus về `h2`, giữ `?categoryId=`; HTTP 403 user thường và limiter 60/15 phút cho PUT; lỗi 502 `UPLOAD_FAILED` khi sửa; responsive.


---

### 7. API đọc công khai cho Sprint 3 (Priority: Low, tuỳ chọn) — agent-coder
**Công việc:**
- [x] `GET /api/categories`, `GET /api/categories/:id/products` (cần đăng nhập, trả ảnh qua signed URL) để Sprint 3 dùng ngay. Verify 2026-11-03 trên DB/Storage thật: guest 401; user thường 200 (và 403 ở `/api/admin/*`); danh mục rỗng bị ẩn khỏi list nhưng `/:id/products` -> 200 `products: []`; id sai/không tồn tại -> 404; `imageUrl` tải được (200 image/png); thứ tự cũ nhất trước; không lộ `image_path`/`category_id`/timestamps. Dữ liệu test đã dọn (products = 0, `storage.objects` bucket `products` = 0, tài khoản test đã xoá). Response `/:id/products` theo flow: `{ category: {id,name,slug}, products }`. Chưa có test tự động (chưa có test runner); chưa nối frontend (Sprint 3)

**Acceptance Criteria:** user đã đăng nhập đọc được danh mục và sản phẩm; không lộ trường nội bộ.

---

### 8. Nợ kỹ thuật từ Sprint 1 (Priority: Low)
- [x] `document.title` riêng cho mỗi route (hook `src/hooks/useDocumentTitle.js`, định dạng "<Tên trang> — Try-on"), áp cho landing, login, register, profile, 403, 404 và 3 trang admin; đã bỏ các `document.title` rải rác. Verify: lint + build sạch; CHƯA kiểm tra trên trình duyệt (chỉ đọc code)
- [x] `loginLimiter` chỉ tính lần đăng nhập sai (401), không tính 400 (`skipSuccessfulRequests` + `requestWasSuccessful: res.statusCode !== 401`). Verify bằng curl: 3 lần 400 và 1 lần 200 không giảm bộ đếm, 401 giảm từng lượt; chưa test chạm ngưỡng 429 (tránh khoá IP)

## Definition of Done
- Code được review; lint/build chạy không lỗi
- Chức năng được test trên trình duyệt thật + DB/Storage thật; dữ liệu test được dọn (`common_errors.md` 7.1/7.1b)
- Mỗi user story trên branch `feature/US-xx-<tên>`, chỉ merge `main` (`--no-ff`) sau khi đạt acceptance criteria
- Tài liệu (`schema.md`, flows, `screens.md`, `CLAUDE.md`, README) cập nhật; lỗi mới ghi vào `common_errors.md`
- Không đưa `.env*`, `.mcp.json`, mật khẩu plaintext vào repo public

## Notes
- Thứ tự: Task 1, 2 trước; Task 3 trước Task 4–6; Task 4 trước Task 5 (sản phẩm cần danh mục)
- Mọi phát sinh ngoài danh sách này phải được ghi vào đây trước khi làm
