# Sprint 4: Mua sắm & Giỏ hàng
## Mục tiêu Sprint
Người mua thêm sản phẩm vào giỏ ngay trong phòng thử đồ, xem/sửa giỏ với tổng tiền do server tính và đặt hàng (COD, chưa thanh toán online); admin xem danh sách và chi tiết đơn đã đặt. Hoàn thành luồng thương mại cơ bản của Epic 4.
User Stories: US-07 (thêm vào giỏ ở phòng thử đồ), US-08 (xem giỏ + tổng tiền), **US-10 (đặt hàng từ giỏ – bổ sung ngoài PB, chờ duyệt)**, US-09 (admin xem đơn)

**Trạng thái:** IN PROGRESS (nhánh `feature/US-07-cart`). Task 1 hoàn thành 2026-11-18: thiết kế xong, Q23–Q34 đã chốt và US-10 đã duyệt, migration `010`/`011` đã áp qua MCP và verify. Flow `design/flows/cart-and-orders.md`, contract/mã lỗi/route/D32–D41 ở `design/flows/README.md`, schema `design/database/schema.md` mục 15–17. Task 2 (UI mock) hoàn thành 2026-11-18 (lint/build/test 111 xanh, chưa test trình duyệt với backend thật); Task 3 (backend giỏ hàng) hoàn thành 2026-11-23; Task 4 (backend đặt hàng + admin đơn) hoàn thành 2026-11-24; Task 5 (nối frontend + verify trình duyệt) hoàn thành 2026-11-24; Task 6 chưa bắt đầu.

**Khoảng trống PB đã xử lý:** PB Epic 4 không có story tạo đơn nhưng US-09 cần "đơn hàng đã đặt". Đã thêm **US-10** vào `PB.md` (đánh dấu chờ duyệt) và `sprints/US-10.md` với phạm vi tối thiểu (form giao hàng → đơn `pending`, COD, xoá giỏ, trang xác nhận). Theo quy tắc Scrum của `CLAUDE.md`, mọi thứ ngoài backlog được ghi vào đây trước khi làm.

**Quyết định phạm vi (Q23–Q34 đã chốt 2026-11-18 theo mặc định khuyến nghị; US-10 được duyệt):**
- Giỏ lưu ở **server** (`cart_items`, Q23/D32); mọi role đã đăng nhập dùng được, kể cả admin (Q31)
- Số lượng 1–10 mỗi dòng, tối đa 50 dòng; không size/màu/tồn kho (Q25, Q33); thêm sản phẩm đã có → +1 (Q26)
- Giỏ không lưu giá; tổng **tính ở server** từ giá hiện tại; giá chốt lúc đặt (snapshot); lệch → 409 `CART_CHANGED` (Q30, D34, D37)
- Đặt hàng nguyên tử qua hàm Postgres `place_order` (D35), idempotency key trong body (D36)
- Thông tin giao hàng: họ tên, SĐT (bắt buộc), địa chỉ một ô, ghi chú; không lưu ngược hồ sơ (Q27); COD ghi nhận, không phí ship, không thanh toán online (Q28)
- Trạng thái đơn chỉ `pending`; admin **chỉ xem** (Q29); không danh sách "Đơn hàng của tôi" (Q34) – chỉ trang xác nhận `/orders/:id`
- Ảnh trong giỏ/đơn = flat lay hiện tại; đơn không snapshot ảnh (Q32); xoá sản phẩm → `order_items.product_id` NULL (D38)
- Admin danh sách đơn phân trang offset 20/trang, lọc trạng thái (D39)

**Đọc trước khi làm (CLAUDE.md, từ Sprint 2):**
- Yêu cầu: `PB.md` (Epic 4 + US-10), `sprints/US-07.md`, `US-08.md`, `US-10.md`, `US-09.md`, `sprints/sprint3.md` (Q20, phần chưa verify).
- Thiết kế: `design/flows/cart-and-orders.md` (chính), `design/flows/README.md` (mục 2–7: envelope, contract Sprint 4, mã lỗi, route, D32–D41, Q23–Q34), `design/flows/try-on-room.md` mục 9 (chỗ chừa nút, Q20), `product-management.md` (xoá sản phẩm – nay ảnh hưởng `cart_items` cascade, `order_items` SET NULL), `design/database/schema.md` mục 15–17, `design/screens.md` (Phòng thử đồ – `ProductPanel`; Khu vực Admin – `AdminLayout` ghi "khi Epic 4 thêm Đơn hàng"), `design/design-system.md`.
- Code tái sử dụng: backend `requireAuth`/`requireAdmin` (`middlewares/auth.js`), `createLimiter` (`rateLimiters.js`), `HttpError`, `validators/common.js` (`isUuid`, `normalizeName`, `hasInvalidNameChars`), chuẩn hoá SĐT trong `profileValidator.js`, `storageService.signUrls`, `PRODUCT_BUCKET`, mẫu router/controller/service (`tryOnRoutes.js`, `productService.js`), test mẫu `backend/test/http/*`; frontend `apiClient`, `AuthProvider`/`useAuth`, guards `RequireAuth`/`RequireAdmin`, `MainLayout`, `AccountMenu`, `LandingHeader`, `ProductPanel` (comment chỗ chừa nút), `AdminLayout`, `ProductList` (mẫu bảng/thẻ), `EmptyState`, `ErrorState`, `ConfirmDialog`, `ToastProvider` (`tone`), `TextField`, `useDocumentTitle`, `utils/format.js` (`formatVnd`), `profileValidation.js` (SĐT).
- `common_errors.md`: 1.1 (GRANT `service_role` – đã có trong `010`/`011`, kể cả sequence và EXECUTE hàm), 1.2 (áp migration và verify **trước** khi code backend), 1.3 (xoá dữ liệu qua MCP do agent chính chạy), 1.4 (áp `010` rồi mới `011`, không song song), 3.5 (mock còn sót khi bàn giao UI), 4.2 (cập nhật trạng thái tài liệu cùng lúc: `CLAUDE.md`, `migrations/README.md`, `schema.md`, PRD), 4.3 (hợp đồng API giữa backend và UI làm song song – shape `Cart`, `Order`), 5.2 (tự chạy lint/build/test, router phải import trang mới), 5.3/6.2/6.3 (cổng 3100/5174, không kill theo tên), 7.1/7.1b (dọn user/đơn test: **xoá `orders` trước user** vì FK RESTRICT).
- **Điều kiện tiên quyết:** người dùng chốt Q23–Q34 và duyệt US-10; Supabase MCP kết nối được.

## Tasks
### 1. Thiết kế flow, API contract, DB và migration (Priority: High) — agent-ba (+ agent chính áp migration)
**Mô tả:** Làm rõ phạm vi Epic 4, xử lý khoảng trống PB (US-10), thiết kế giỏ/đơn/API/race/quyền riêng tư; mở rộng tài liệu hiện có (không tạo bản song song).

**Công việc:**
- [x] `design/flows/cart-and-orders.md` (phạm vi, đối tượng response, API + validate, sequence server thêm giỏ / `place_order`, activity frontend thêm giỏ / giỏ / đặt hàng / admin, tình huống biên, bảo mật, kiểm thử) và cập nhật `design/flows/README.md` (danh sách flow, contract Sprint 4, mã lỗi mới, route mới, D32–D41, Q23–Q34, mục 8)
- [x] `sprints/US-07.md`, `US-08.md`, `US-09.md`, `US-10.md`; thêm US-10 vào `PB.md` (đánh dấu chờ duyệt)
- [x] `design/database/schema.md` (ERD, mục 5, 6, 9, 15–17); `migrations/010_create_cart_items.sql`, `011_create_orders.sql` (nháp, RLS bật, REVOKE anon/authenticated, GRANT `service_role`, EXECUTE `place_order` chỉ `service_role`); `migrations/README.md`
- [x] Cập nhật `design/PRD.md` (tính năng US-07..US-10, NFR, rủi ro, chỉ mục API, lộ trình S4)
- [x] Người dùng chốt Q23–Q34 và duyệt US-10 (2026-11-18, theo mặc định khuyến nghị); agent-ba cập nhật tài liệu theo câu trả lời (bỏ chữ "đề xuất" ở D32–D41, sửa migration nếu chốt khác mặc định)
- [x] Agent chính áp `010` → `011` **tuần tự** qua Supabase MCP và verify: `list_migrations`; `role_table_grants` của `cart_items`/`orders`/`order_items` chỉ `service_role`; RLS bật; `has_function_privilege` của `anon`/`authenticated` trên `place_order` = false, `service_role` = true; thử `place_order` trong transaction **rollback** (giỏ trống → `CART_EMPTY`; tổng lệch → `CART_CHANGED`; cùng khoá 2 lần → 1 đơn; xoá sản phẩm có trong đơn → `product_id` NULL); cập nhật trạng thái "đã áp" ở `CLAUDE.md`, `migrations/README.md`, `schema.md`, comment đầu file migration (common_errors 4.2)

**Acceptance Criteria:**
- Flow, contract, schema, migration khớp nhau và không mâu thuẫn tài liệu Sprint 1–3 (envelope, mã lỗi, route, D19/D23/D24)
- `service_role` truy cập được 3 bảng mới và gọi được `place_order`; `anon`/`authenticated` không có quyền bảng lẫn EXECUTE
- Mọi câu hỏi mở Q23–Q34 có trả lời hoặc được người dùng chấp nhận mặc định; US-10 được duyệt (hoặc phạm vi US-09 được định nghĩa lại)

---

### 2. Màn hình + UI layer giỏ hàng, đặt hàng, đơn hàng admin (Priority: High) — agent-uiux
**Mô tả:** Mô tả màn hình và code UI (mock, happy case + đủ trạng thái). Làm sau khi Task 1 chốt contract; song song Task 3–4.

**Công việc:**
- [x] Cập nhật `design/screens.md`: nút "Thêm vào giỏ" trong `ProductPanel` (thay comment chỗ chừa; trạng thái default / đang thêm / disabled; toast thành công / đã có / lỗi; không ảnh hưởng phím ←/→ và focus); badge giỏ ở `MainLayout`/`AccountMenu`/`LandingHeader`; mục mới "Giỏ hàng & Đặt hàng" (`/cart`, `/checkout`, `/orders/:id`); mục Admin "Đơn hàng" (`/admin/orders`, `/admin/orders/:id`, menu `AdminLayout` 3 mục); 4 trạng thái loading/rỗng/lỗi/có dữ liệu; responsive 375/768/1280; a11y
- [x] Cập nhật `design/design-system.md` nếu thêm component dùng chung (ví dụ `QuantityStepper`, `Pagination`, badge trạng thái đơn, `CartBadge`)
- [x] Code UI với mock (`src/mocks/cartMock.js`, `orderMock.js`): `CartProvider` (context badge), trang `CartPage`, `CheckoutPage`, `OrderPage`, `pages/admin/AdminOrdersPage.jsx`, `AdminOrderDetailPage.jsx`; route trong `router.jsx` + `PATHS` (`cart`, `checkout`, `order`, `adminOrders`, `adminOrder`)
- [x] Ghi danh sách điểm TODO nối API cụ thể cho agent-coder (common_errors 3.5) ở cuối mục mới của `screens.md` + `TODO(Task5)` trong file API của feature

**Acceptance Criteria:** `screens.md` khớp `cart-and-orders.md` mục 6–9 và US-07..US-10; UI chạy được với mock ở mọi trạng thái (gồm `CART_CHANGED`, `CART_EMPTY`, `CART_QUANTITY_LIMIT`, `CART_FULL`, 404 đơn, admin lọc rỗng, nhiều trang); nút "Thêm vào giỏ" không làm hỏng điều hướng phòng thử đồ; lint + build sạch; router import trang mới (common_errors 5.2); 375px không cuộn ngang.

---

### 3. Backend API giỏ hàng (Priority: High) — agent-coder
**Mô tả:** Cài đặt đúng `cart-and-orders.md` mục 2–4 và `schema.md` mục 15. Chỉ bắt đầu sau khi `010` đã áp và verify (common_errors 1.2).

**Công việc:**
- [x] `routes/cartRoutes.js` (`requireAuth`), `controllers/cartController.js`, `services/cartService.js`, `validators/cartValidator.js`; gắn `/cart` vào `routes/index.js`
- [x] `GET /api/cart`, `POST /api/cart/items` (201/200, cộng dồn optimistic tối đa 3 lần, `23505` → cộng dồn, `23503` → 404), `PUT /api/cart/items/:productId` (tuyệt đối), `DELETE /api/cart/items/:productId` (idempotent); trả `cart` đầy đủ, ký URL theo lô, không lộ `image_path`
- [x] Mã lỗi mới `CART_FULL`, `CART_QUANTITY_LIMIT`, `CART_ITEM_NOT_FOUND` đúng message bảng mã lỗi; limiter `cartLimiter` (60/phút), `cartReadLimiter` (120/phút) theo user
- [x] Test Vitest + supertest (mock `config/supabase.js`) theo `cart-and-orders.md` mục 12; regression xoá sản phẩm admin vẫn đúng (cascade giỏ)

**Kết quả (2026-11-23):** `npm test` 331 xanh (20 file), lint sạch; chạy thật cổng 3100 + Supabase thật: 2 POST song song -> 1 dòng quantity 2 (200 + 201), >10 -> 409, user khác 404/giỏ trống, DELETE idempotent, ảnh ký URL; dữ liệu test đã dọn (cart_items 0). **Chưa verify trên DB thật:** dòng thứ 51 `CART_FULL` (chỉ có 6 sản phẩm; đã có test mock), limiter 429 (chỉ test mock).

**Acceptance Criteria:** mọi mã lỗi/shape đúng contract; 2 POST song song cùng sản phẩm → 1 dòng quantity 2; > 10 → 409; dòng thứ 51 → 409; user khác không chạm được giỏ; `npm test` + lint sạch; chạy thật trên Supabase (cổng 3100) đạt các kịch bản trên.

---

### 4. Backend đặt hàng + đơn hàng admin (Priority: High) — agent-coder
**Mô tả:** Cài đặt `cart-and-orders.md` mục 2, 3, 5 và `schema.md` mục 16–17. Sau Task 3 (dùng chung `cartService` để đọc giỏ) và sau khi `011` đã áp.

**Công việc:**
- [x] `routes/orderRoutes.js` (`POST /api/orders`, `GET /api/orders/:id`), thêm `GET /api/admin/orders`, `GET /api/admin/orders/:id` vào `adminRoutes.js`; `services/orderService.js`, `validators/orderValidator.js` (tái dùng chuẩn hoá SĐT của `profileValidator`, `normalizeName`)
- [x] Gọi `supabase.rpc('place_order', …)`; ánh xạ `P0001` `CART_EMPTY`/`CART_CHANGED` → 409, `PROFILE_NOT_FOUND` → 401 `INVALID_TOKEN`, `23505` → đọc lại → 200, khác → 500; 201 khi `out_created`, 200 khi khoá đã dùng
- [x] Shape `Order`/`AdminOrder`/`AdminOrderSummary`/`Pagination` (mã `DH` + 6 số; `bigint` → number; ảnh dòng ký từ sản phẩm còn tồn tại; danh sách admin không có SĐT/địa chỉ/ghi chú); phân trang `range` + `count: 'exact'`, lọc `status`, validate query
- [x] `orderLimiter` (POST 10 / 15 phút / user); log không chứa body đơn, tham số RPC, SĐT, địa chỉ
- [x] Test Vitest (mock RPC và query) theo `cart-and-orders.md` mục 12

**Kết quả (2026-11-24):** `npm test` 396 xanh (21 file, test mới `backend/test/http/orders.http.test.js` 65 ca; fake Supabase thêm `rpc`, `range`), lint sạch. Chạy thật cổng 3100 + Supabase thật (token ký cho tài khoản seed @tryon.dev): đặt hàng 201 tạo 1 đơn + dòng snapshot + giỏ trống; cùng khoá gửi lại -> 200 đúng đơn cũ; 2 request song song cùng khoá -> 201 + 200, 1 đơn; song song khác khoá -> 201 + 409 CART_EMPTY; `expectedTotal` sai và đổi giá thật (sửa giá rồi khôi phục) -> 409 CART_CHANGED, gửi lại với tổng mới -> 201; đơn user khác 404, id sai 404; user thường gọi `/api/admin/orders[/:id]` 403, guest 401; admin: phân trang pageSize 2, page vượt -> 200 rỗng, lọc status, query sai 400, danh sách không có SĐT/địa chỉ/ghi chú; xoá sản phẩm có trong đơn -> `productId: null`, `imageUrl: null`, giữ snapshot; `orderLimiter` 429 ở lần thứ 11 (đã thấy trên server thật). Dữ liệu test đã dọn: orders 0 -> 5 -> 0, order_items 0 -> 0, cart_items 0 -> 0, products 6 -> 6 (sản phẩm tạm đã xoá, giá sản phẩm sửa đã khôi phục 199000). Lưu ý: identity `orders.order_number` đã tăng tới 5 nên mã đơn kế tiếp là DH000006; `products.updated_at` của 1 sản phẩm đổi do thử giá. **Chưa verify:** admin lọc ≥ 21 đơn trên DB thật (chỉ test mock 57 đơn), giao diện (Task 5).

**Acceptance Criteria:** đặt hàng tạo đúng 1 đơn + dòng snapshot + giỏ trống; cùng khoá gửi 2 lần (kể cả song song) → 1 đơn; đổi giá sau khi mở checkout → 409 `CART_CHANGED`; đơn user khác → 404; user thường gọi API admin → 403; phân trang/lọc đúng; regression xoá sản phẩm có trong đơn → đơn còn nguyên, `productId: null`; `npm test` + lint sạch; chạy thật trên Supabase đạt.

---

### 5. Nối frontend – API + verify trình duyệt thật + dọn dữ liệu (Priority: High) — agent-coder (+ agent chính verify, dọn DB)
**Mô tả:** Thay mock Task 2 bằng API thật; verify toàn luồng thử đồ → giỏ → đặt hàng → admin xem trên trình duyệt + DB thật (provider `stub`).

**Công việc:**
- [x] `services/cartApi.js`, `services/orderApi.js`, `services/adminApi.js` (thêm đơn); `CartProvider` nạp `GET /api/cart` khi đăng nhập/khôi phục phiên/`visibilitychange`, xoá khi đăng xuất
- [x] Checkout: sinh `idempotencyKey` khi mở trang, giữ khi gửi lại; `CART_CHANGED` tải lại giỏ, giữ form; thành công → `/orders/:id` (replace, state `{ placed: true }`), badge 0
- [x] `grep` không còn mock (`cartMock`, `orderMock`); test frontend (`CartProvider`, stepper, checkout giữ khoá) theo `cart-and-orders.md` mục 12
- [x] Verify trình duyệt (Chrome headless, backend 3100 / frontend 5174 – common_errors 6.3, 6.8): thêm từ phòng thử đồ ở trạng thái đang tạo và đã có ảnh; thêm trùng → số lượng 2; −/+/Xoá; đổi giá ở tab admin → `CART_CHANGED`; bấm đặt 2 lần → 1 đơn; hai tab; admin lọc + phân trang (≥ 21 đơn test) + chi tiết; user thường vào `/admin/orders` → 403; 375px
- [x] Dọn dữ liệu (agent chính, common_errors 1.3, 7.1, 7.1b): xoá `orders` của user test **trước** khi xoá user (FK RESTRICT), xoá đơn test của tài khoản seed theo danh sách id; `cart_items` về trạng thái trước test; sản phẩm/ảnh test và `try-on-results` về 0

**Acceptance Criteria:** đạt Acceptance Criteria của US-07, US-08, US-10, US-09 trên trình duyệt thật + DB thật (desktop + 375px); không có POST đơn trùng khi bấm lặp; dữ liệu test đã dọn và báo cáo số dòng trước/sau.

---

**Kết quả (2026-11-24):** `services/cartApi.js`, `orderApi.js`, `adminApi.js` (thêm `adminListOrders`, `adminGetOrder`) thay hẳn mock; xoá `features/cart/cartApi.js`, `features/orders/orderApi.js`, `mocks/cartMock.js`, `orderMock.js`, `mockFlags.js` (grep sạch); `AddToCartButton`/`ProductPanel` bỏ tham số `hint`/`category` chỉ dành cho mock. Lint, build sạch; frontend 130 test xanh (thêm `test/unit/cartOrderApi.test.js`), backend 396 xanh. Verify trình duyệt (Playwright, backend 3100 + frontend 5174, provider `stub`, token ký cho tài khoản seed member/admin/newuser, DB Supabase thật): thêm từ phòng thử đồ khi đang tạo ảnh và khi đã có ảnh; thêm trùng -> 2 (toast + badge); −/+/10 là tối đa (nút + `aria-disabled`)/Xoá không hộp thoại; bấm nhanh nhiều lần -> 1 PUT; đổi giá DB 459.000 -> 469.000 rồi đặt -> `CART_CHANGED` (giữ form, tóm tắt cập nhật, thông báo), gửi lại -> 201; bấm đúp + click -> đúng 1 POST và 1 đơn; thành công -> `/orders/:id`, badge 0; hai tab (badge đồng bộ qua visibilitychange, đặt ở tab A rồi tab B đặt -> `CART_EMPTY` về `/cart` rỗng); user khác xem đơn -> 404; user thường vào `/admin/orders` -> trang 403 và API 403; admin: 23 đơn, trang 1 = 20, trang 2 = 3, lọc "Đã xác nhận" = 2, "Đã huỷ" = rỗng, `?page=99` UI hiện trang cuối, chi tiết đơn và 404; 375px không cuộn ngang ở `/cart`, `/checkout`, `/orders/:id`, `/admin/orders[/:id]`, phòng thử đồ. Dữ liệu test đã dọn: orders 0 -> 23 -> 0, order_items 0 -> 26 -> 0, cart_items 0 -> 0, products 6 -> 6 (giá 459.000 khôi phục; `updated_at` của sản phẩm này đã đổi), try_on_results 6 -> 8 -> 6 (kèm 2 file Storage đã xoá), identity `order_number` đã tăng tới 28. **Chưa verify:** thiết bị cảm ứng/Safari/Firefox, trình đọc màn hình, đăng xuất bằng UI (chỉ có unit test), tài khoản admin dùng giỏ, 768px; 20 đơn phân trang được tạo bằng SQL (không qua `place_order`).

### 6. Nợ kỹ thuật tồn đọng từ Sprint 3 (Priority: Low)
- [ ] Landing: thẻ danh mục (`components/landing/Categories.jsx`, đang dùng `mocks/landingContent.js` và cùng dẫn tới `/try-on`) – user đã đăng nhập dẫn tới danh mục thật (`/try-on/:categoryId` từ `GET /api/categories`; lỗi/rỗng → giữ thẻ mock dẫn `/try-on`); guest giữ nguyên (`/login?redirect=%2Ftry-on`) vì API cần Bearer — agent-uiux + agent-coder. **AC:** không thêm request cho guest; 375px không cuộn ngang
- [ ] Kiểm tra model Gemini khi khởi động bằng `ai.models.get` (best-effort, `try-on-room.md` mục 2.2; chỉ khi `TRY_ON_PROVIDER=gemini` và có key; lỗi 404/401 → đánh dấu provider không khả dụng, không chặn khởi động; test mock) — agent-coder. **AC:** backend vẫn khởi động khi lỗi; POST sau đó 503 `TRY_ON_UNAVAILABLE`
- [ ] Bấm thử trên trình duyệt hộp thoại xoá sản phẩm admin và `ConsentDialog` sau khi chuyển `ConfirmDialog` (sprint3 Task 7, mục "CHƯA bấm thử"); thêm test Testing Library nếu thiếu — agent chính / agent-coder
- [ ] (Người dùng) xác nhận project Gemini dùng tier trả phí trong Google AI Studio Billing (sprint3 Task 6, PRD mục 7) trước khi bật `gemini` cho ảnh người thật
- [ ] Ghi chú: các mục chưa verify của Sprint 3 (thiết bị cảm ứng thật, Safari/Firefox, trình đọc màn hình) – kiểm nếu có thiết bị; nếu không, giữ nguyên trong PRD mục 7
**Acceptance Criteria:** mỗi mục không phá tính năng cũ; lint + build + `npm test` sạch.

## Definition of Done
- Code được review; lint/build chạy không lỗi; `npm test` pass ở `backend/` và `frontend/` (test mới cho giỏ/đơn, không cần mạng/DB thật)
- Chức năng được test trên trình duyệt thật + DB thật (provider `stub`); dữ liệu test được dọn (common_errors 7.1/7.1b; xoá đơn trước user)
- Migration `010`/`011` đã áp tuần tự và verify trước khi code backend; trạng thái cập nhật ở `CLAUDE.md`, `migrations/README.md`, `schema.md`
- Mỗi user story trên branch `feature/US-xx-<tên>` (gợi ý một branch `feature/US-07-cart` cho cả Epic 4 vì cùng dữ liệu), chỉ merge `main` (`--no-ff`) sau khi đạt acceptance criteria
- Tài liệu (`schema.md`, flows, `screens.md`, `design-system.md`, PRD, `CLAUDE.md`, README) cập nhật; lỗi mới ghi vào `common_errors.md`
- Không đưa `.env*`, API key, `.mcp.json`, mật khẩu plaintext, dữ liệu cá nhân test (SĐT/địa chỉ thật) vào repo

## Notes
- Thứ tự: Task 1 (chốt Q23–Q34 + duyệt US-10 + áp `010` → `011`) → Task 2 song song Task 3 → Task 4 (sau Task 3) → Task 5. Task 6 khi rảnh, độc lập.
- US-08 phụ thuộc US-07 (cùng bảng `cart_items`); US-10 phụ thuộc US-08; US-09 phụ thuộc US-10 (dữ liệu đơn).
- Thay đổi hành vi cũ cần chú ý: xoá sản phẩm admin giờ còn cascade `cart_items` và SET NULL `order_items` (do FK, không đổi code `productService`); `AdminLayout` thêm mục thứ 3; `ProductPanel` thay comment chỗ chừa bằng nút thật (Q20 hết hiệu lực từ Sprint 4).
- Mọi phát sinh ngoài danh sách này phải được ghi vào đây trước khi làm.
