# PRD — Try-on (thử đồ ảo GenAI)

> Tài liệu tổng hợp cấp sản phẩm. **Không chép lại** chi tiết: contract API, mã lỗi, quyết định (D1–D31, Q1–Q22) nằm ở [flows/README.md](flows/README.md); flow ở `flows/*.md`; DB/Storage ở [database/schema.md](database/schema.md); màn hình ở [screens.md](screens.md). Khi có mâu thuẫn, tài liệu chi tiết là nguồn đúng và PRD phải được sửa theo.

## Mục lục
1. [Tóm tắt điều hành](#1-tóm-tắt-điều-hành)
2. [Phạm vi](#2-phạm-vi)
3. [Vai trò và quyền](#3-vai-trò-và-quyền)
4. [Tính năng và trạng thái](#4-tính-năng-và-trạng-thái)
5. [Yêu cầu phi chức năng](#5-yêu-cầu-phi-chức-năng)
6. [Công nghệ, phụ thuộc, ràng buộc và giả định](#6-công-nghệ-phụ-thuộc-ràng-buộc-và-giả-định)
7. [Rủi ro đã biết](#7-rủi-ro-đã-biết)
8. [Chỉ mục tài liệu và API](#8-chỉ-mục-tài-liệu-và-api)
9. [Lộ trình sprint](#9-lộ-trình-sprint)

## 1. Tóm tắt điều hành

- **Sản phẩm:** web app responsive (desktop + mobile) cho phép người mua xem ảnh **chính mình** mặc sản phẩm, do GenAI tạo từ ảnh toàn thân của họ và ảnh flat lay của sản phẩm.
- **Đối tượng:** người mua (tải ảnh toàn thân + chiều cao/cân nặng, chọn danh mục, lướt sản phẩm bằng mũi tên/vuốt/phím); admin (quản lý danh mục, sản phẩm, sau này đơn hàng).
- **Giá trị:** giảm phỏng đoán "mặc lên trông thế nào" trước khi mua; trải nghiệm lướt như xem lookbook nhưng người mẫu là chính mình.
- **Bối cảnh:** dự án học tập (không thương mại – xem Q4 ở [flows/README.md](flows/README.md) mục 7), 1 instance backend.
- **Đo thành công:** chưa có KPI kinh doanh được chốt. Tiêu chí đo được hiện có nằm trong acceptance criteria: với provider thật p95 thời gian tới khi có ảnh ≤ 30 s ([US-05](../sprints/US-05.md); **đang đo ở Sprint 3 Task 6**); `stub` hiện ảnh ≤ 5 s; đổi sản phẩm cập nhật thông tin < 100 ms ([sprint3.md](../sprints/sprint3.md) Task 2).

## 2. Phạm vi

**Trong phạm vi (Epic 1–4, [PB.md](../PB.md)):** đăng ký/đăng nhập email + mật khẩu; hồ sơ (ảnh toàn thân, chiều cao, cân nặng, tên hiển thị, SĐT tuỳ chọn); admin quản lý danh mục và sản phẩm (ảnh flat lay); phòng thử đồ GenAI (chọn danh mục, ảnh sản phẩm đầu tiên, chuyển sản phẩm, cache, hạn mức, đồng ý xử lý ảnh); giỏ hàng và danh sách đơn hàng (Sprint 4).

**Ngoài phạm vi (đã chốt trong tài liệu chi tiết):**
- Đăng xuất phía server / thu hồi token, refresh token (D6, Q4).
- Phân trang danh sách (D22), trạng thái ẩn/hiện sản phẩm, tra danh mục theo slug (Q11).
- Sinh trước ảnh sản phẩm chưa xem – **không prefetch** (Q15); quay vòng cuối danh sách (Q17).
- Người dùng nhập prompt; cột loại trang phục (Q16); gợi ý size theo số đo; chia sẻ/tải ảnh; lịch sử ảnh đã thử; nút xoá toàn bộ ảnh thử đồ (Q22) – xem [US-05](../sprints/US-05.md) mục Phạm vi.
- Nút "Thêm vào giỏ" ở Sprint 3 (Q20; thuộc US-07).
- Thanh toán, vận chuyển: PB không nêu; **chưa xác định** cho Sprint 4.

## 3. Vai trò và quyền

| Vai trò | Xác định | Được làm | Chặn bởi |
|---------|----------|----------|----------|
| Khách | Không có JWT | Landing `/`, `/register`, `/login` | Route bảo vệ → `/login?redirect=` (`RequireAuth`) |
| Người mua (`user`) | JWT hợp lệ, `profiles.role = 'user'` | Hồ sơ, ảnh toàn thân, API đọc danh mục/sản phẩm, phòng thử đồ; giỏ hàng (Sprint 4) | `/api/admin/*` → 403 `FORBIDDEN`; UI `/admin/*` → trang 403 |
| Admin (`admin`) | `profiles.role = 'admin'` **đọc từ DB** mỗi request (D19) | Mọi quyền của người mua + CRUD danh mục/sản phẩm; xem đơn hàng (Sprint 4) | Hạn mức thử đồ áp cả admin (Q18) |

Không có màn tự đăng ký admin; tài khoản mẫu seed ở `003` (chỉ dev). Chi tiết: [flows/logout-protected-routes.md](flows/logout-protected-routes.md), [flows/category-management.md](flows/category-management.md) (phân quyền admin), [flows/README.md](flows/README.md) mục 5 (route).

## 4. Tính năng và trạng thái

Trạng thái tại **2026-11-18**. Ưu tiên MoSCoW: toàn bộ US-01…US-09 là **Must** của PB (luồng thử đồ + thương mại cơ bản).

| US | Tính năng | Vai trò | Phụ thuộc | Sprint | Trạng thái | Tài liệu |
|----|-----------|---------|-----------|--------|-----------|----------|
| US-01 | Đăng ký, đăng nhập, đăng xuất, bảo vệ route | Khách / User | – | S1 | **Xong**, đã merge `main` | [US-01](../sprints/US-01.md) · [register](flows/register.md) · [login](flows/login.md) · [logout-protected-routes](flows/logout-protected-routes.md) |
| US-02 | Hồ sơ: ảnh toàn thân, chiều cao/cân nặng, xoá ảnh | User | US-01 | S1 | **Xong**, đã merge `main` | [US-02](../sprints/US-02.md) · [profile](flows/profile.md) · [avatar-upload](flows/avatar-upload.md) |
| US-03 | Quản lý danh mục | Admin | US-01 | S2 | **Xong**, đã merge `main` (`c513f01`) | [US-03](../sprints/US-03.md) · [category-management](flows/category-management.md) |
| US-04 | Thêm/sửa/xoá sản phẩm + ảnh flat lay; API đọc cho người mua | Admin | US-03 | S2 | **Xong**, đã merge `main` (`c513f01`) | [US-04](../sprints/US-04.md) · [product-management](flows/product-management.md) |
| US-05 | Chọn danh mục → ảnh mình mặc sản phẩm đầu tiên | User | US-02, US-04 | S3 | **Xong về code, chờ merge `main`** (verify 2026-11-18; xem dưới) | [US-05](../sprints/US-05.md) · [try-on-room](flows/try-on-room.md) |
| US-06 | Mũi tên / vuốt / phím → sản phẩm tiếp theo | User | US-05 | S3 | **Xong về code, chờ merge `main`** (cùng branch US-05) | [US-06](../sprints/US-06.md) · [try-on-room](flows/try-on-room.md) mục 9 |
| US-07 | "Thêm vào giỏ" trên màn thử đồ | User | US-05/06 | S4 (dự kiến) | Chưa bắt đầu, chưa có US/flow chi tiết | [PB.md](../PB.md) |
| US-08 | Xem giỏ hàng và tổng tiền | User | US-07 | S4 (dự kiến) | Chưa bắt đầu | [PB.md](../PB.md) |
| US-09 | Admin xem danh sách đơn hàng | Admin | US-08 (đặt hàng) | S4 (dự kiến) | Chưa bắt đầu | [PB.md](../PB.md) |

**US-05/06 – chi tiết tiến độ** (nguồn: [sprint3.md](../sprints/sprint3.md), branch `feature/US-05-try-on-room`, chưa merge `main`):

| Task Sprint 3 | Trạng thái |
|---------------|-----------|
| 1. Thiết kế flow, DB/Storage, chọn provider (Q12–Q22 chốt, migration `008`/`009` áp 2026-11-17) | Xong |
| 2. Màn hình + UI layer (mock) | Xong |
| 3. Backend API thử đồ, cache, hạn mức, dọn kết quả, adapter `stub` + `gemini` | Xong (verify 2026-11-18); còn thiếu kiểm tra model khi khởi động (`ai.models.get`, best-effort) |
| 4. Nối frontend – API (poll, debounce, không prefetch, đích sau đăng nhập `/try-on`) | Xong, đã verify trình duyệt thật với `stub` 2026-11-18. Chưa verify: cảm ứng thật, Safari/Firefox, trình đọc màn hình, ảnh Gemini thật |
| 5. Test runner + test tự động (Vitest, backend + frontend) | Xong |
| 6. Tích hợp Gemini thật + đo chất lượng/độ trễ/chi phí | Xong 2026-11-18: 13 cặp ảnh hư cấu, 13/13 thành công, p50 9,0 s / p95 10,4 s; chốt `gemini-3.1-flash-image` + `promptVersion` `p2`; giá và chính sách dữ liệu đã tra trang chính thức. **Chưa xác nhận** project dùng tier trả phí (người dùng cần kiểm tra Billing trong Google AI Studio) |
| 7. Nợ kỹ thuật & tài liệu (PRD, CTA landing, `ConfirmDialog`, 7a badge lượt, 7b focus bàn phím, 7c `finishReason`) | Xong 2026-11-18 (PRD, CTA/thẻ danh mục landing, `ConfirmDialog`, 7a, 7b, 7c) |

Acceptance criteria từng story: xem file US tương ứng; không nhắc lại ở đây.

## 5. Yêu cầu phi chức năng

| Nhóm | Yêu cầu | Nguồn chi tiết |
|------|---------|----------------|
| Xác thực | JWT HS256 do backend phát hành, TTL `7d`, payload chỉ `sub` + `role`, `verify` ghim thuật toán; token ở `localStorage`; mật khẩu hash `bcrypt`, 8–72 ký tự, có chữ thường/hoa/số; login sai trả một mã chung | [flows/README.md](flows/README.md) D4–D9 |
| Phân quyền dữ liệu | Chỉ backend truy cập Supabase bằng service role; RLS bật trên mọi bảng, không policy cho `anon`/`authenticated`, GRANT chỉ `service_role`; frontend không có key Supabase | [database/schema.md](database/schema.md) mục 1, 5, 13 |
| Storage | 3 bucket **private** (`avatars`, `products` 5 MB jpeg/png; `try-on-results` 10 MB jpeg/png/webp); client chỉ nhận signed URL TTL 3600 s; loại file kiểm tra bằng MIME + magic bytes | [database/schema.md](database/schema.md) mục 4, 12, 14 |
| Chống lạm dụng | Rate limit `express-rate-limit` (login, register, avatar, ảnh sản phẩm, POST/GET thử đồ) → 429 + `Retry-After`; không khoá tài khoản | D8, D30; [try-on-room.md](flows/try-on-room.md) mục 10 |
| Quyền riêng tư | Ảnh toàn thân, ảnh kết quả, chiều cao/cân nặng là dữ liệu nhạy cảm. Ảnh chỉ gửi tới **Google Gemini API** khi `TRY_ON_PROVIDER=gemini` **và** user đã đồng ý (`profiles.try_on_consent_at`, Q14); chỉ dùng tier trả phí; kết quả chỉ chủ sở hữu xem (id người khác → 404); dọn kết quả khi đổi/xoá ảnh đầu vào (D29); không log ảnh/base64/URL ký/số đo/key/phản hồi thô; prompt cố định ở backend | [try-on-room.md](flows/try-on-room.md) mục 2.3, 2.4, 8, 10 |
| Hiệu năng | API thử đồ trả < 500 ms (không chờ provider); client poll mỗi 2 s, dừng sau 120 s; sinh ảnh Gemini p50 9,0 s / p95 10,4 s (đo 13 cặp tuần tự, 2026-11-18, chưa đo song song 3 job); mục tiêu p95 ≤ 30 s đạt; `stub` ≤ 5 s; job đồng thời `TRY_ON_MAX_CONCURRENCY` (3), timeout `TRY_ON_TIMEOUT_MS` (90 s) | [US-05](../sprints/US-05.md), [try-on-room.md](flows/try-on-room.md) mục 2.1, 2.2, 3 |
| Chi phí | `stub` mặc định ở dev/test/CI; hạn mức **30 lượt/user/ngày** (giờ VN, cache hit và job lỗi không tính); cache không TTL; debounce 400 ms, không prefetch. Giá/ảnh `gemini-3.1-flash-image` 0,067 USD (ảnh 1K, tra 2026-11-18, xem try-on-room.md mục 2.1) | D27, D30, Q15, Q18 |
| Khả dụng | 1 instance, job chạy trong tiến trình (D26); restart giữa chừng → job thành `GENERATION_TIMEOUT`, người dùng Thử lại được; provider lỗi/thiếu key → 503 `TRY_ON_UNAVAILABLE`, backend vẫn khởi động; `GET /api/health` kiểm tra Supabase. Chưa có SLA/giám sát | [try-on-room.md](flows/try-on-room.md) mục 2.4, 7 |
| Accessibility | Trạng thái có chữ (không chỉ spinner), `aria-live`, phím ←/→, vùng chạm 44 px, focus rõ, `prefers-reduced-motion`. Lỗi mất focus bàn phím cuối danh sách đã sửa (Task 7b) | [design-system.md](design-system.md) mục Accessibility, [screens.md](screens.md) |
| Responsive | Kiểm tra ở 375 / 768 / 1280 px; 375 px không cuộn ngang | [screens.md](screens.md), [sprint3.md](../sprints/sprint3.md) Task 2 |
| Chất lượng | Test tự động Vitest ở `backend/` (supertest) và `frontend/` (jsdom + Testing Library), mock Supabase và Gemini, **không cần mạng/DB thật**; lint/build sạch; verify tay trên trình duyệt + DB/Storage thật trước khi đóng task, dọn dữ liệu test | [CLAUDE.md](../CLAUDE.md) mục Commands, Definition of Done trong `sprints/sprint<N>.md` |
| Bảo mật repo | Không commit `.env*`, `GEMINI_API_KEY`, mật khẩu plaintext, `.mcp.json` | [sprint3.md](../sprints/sprint3.md) DoD, [common_errors.md](../common_errors.md) mục 2, 8 |

## 6. Công nghệ, phụ thuộc, ràng buộc và giả định

**Công nghệ** (phiên bản cụ thể: [README.md](../README.md), `package.json`):
- Frontend: React + Vite + TailwindCSS v4 + React Router.
- Backend: Node.js + Express 5, REST prefix `/api`; `jsonwebtoken`, `bcrypt`, `multer`, `express-rate-limit`.
- Supabase: PostgreSQL + Storage, truy cập bằng `@supabase/supabase-js` với service role; migration áp qua Supabase MCP ([migrations/README.md](../migrations/README.md)).
- GenAI: Google Gemini API qua SDK `@google/genai`, sau **adapter** `TRY_ON_PROVIDER` = `stub` (mặc định) | `gemini`; model `GEMINI_IMAGE_MODEL` (mặc định `gemini-3.1-flash-image`). Phương án đã loại: FASHN `tryon-v1.6`, Vertex AI `virtual-try-on-001` (D28, Q12).
- Test: Vitest, supertest, jsdom, Testing Library.

**Phụ thuộc chức năng:** US-05 cần US-02 (ảnh toàn thân + số đo) và US-04 (sản phẩm có ảnh flat lay); US-06 cần US-05; US-07 → US-08 → US-09 (chuỗi giỏ hàng – đơn hàng). Phụ thuộc ngoài: Supabase (DB/Storage), Google Gemini API (chỉ khi bật `gemini`).

**Ràng buộc:** một instance backend (limiter memory store, job trong tiến trình); không dùng Supabase Auth; frontend không truy cập DB trực tiếp; thay đổi schema chỉ bằng migration mới, không sửa migration đã áp.

**Giả định:** dữ liệu demo nhỏ (không phân trang); một ảnh toàn thân/user, một ảnh flat lay/sản phẩm; giá là số nguyên VND (1 – 100.000.000); một prompt chung cho mọi danh mục (Q16); project Gemini dùng tier trả phí (**chưa xác nhận**, Task 6).

## 7. Rủi ro đã biết

| Rủi ro | Trạng thái | Giảm thiểu |
|--------|-----------|-----------|
| Model Gemini bị gỡ/đổi tên (bản `-preview` đã bị gỡ) | Đã xảy ra một lần | Model qua env; 404 → `PROVIDER_UNAVAILABLE` + POST 503; kiểm tra danh sách model trước demo; có model dự phòng (chưa đo chất lượng) |
| Chi phí provider | Giá chính thức đã tra 2026-11-18 (0,067 USD/ảnh 1K với `gemini-3.1-flash-image`; `gemini-2.5-flash-image` deprecated, dự kiến tắt 2027-03-15) – xem [try-on-room.md](flows/try-on-room.md) mục 2.1; giá có thể đổi | `stub` mặc định, hạn mức 30/ngày, cache, không prefetch, limiter |
| Chất lượng thử đồ theo loại trang phục (áo thun, sơ mi, váy, quần, hoa văn nhỏ); lệch sắc độ màu | Đã đo (Task 6, n=13, ảnh hư cấu): áo thun/sơ mi/áo khoác/quần/váy tốt; hoa văn chấm bi yếu nhất (lệch mật độ chấm); ảnh ra luôn là JPEG nén lại. Chưa kiểm ảnh người thật chụp điện thoại | Prompt chặt + `promptVersion`; xem lại cột loại trang phục nếu quần/váy kém (Q16) |
| Chính sách dữ liệu Gemini (huấn luyện, thời gian lưu) | Đã tra điều khoản 2026-11-18: tier trả phí không dùng để huấn luyện, tier miễn phí có dùng. **Chưa xác nhận** project đang ở tier trả phí (cả ba model ảnh không có free tier, nên khả năng cao là có) | Chỉ tier trả phí; đồng ý trước khi gửi; người dùng kiểm tra Billing trước khi bật `gemini` cho người dùng thật |
| Hạn mức là "mềm" | Đã biết | Đếm từ DB khi tạo job; limiter memory store mất khi restart và không dùng chung được nếu chạy nhiều instance (D8) |
| Token không thu hồi được tới khi hết hạn (7 ngày) | Chấp nhận (Q4) | Hướng nâng cấp ở [flows/README.md](flows/README.md) mục 8 |
| Chưa verify thiết bị cảm ứng thật, Safari/Firefox, trình đọc màn hình | Mở | Kiểm thử bổ sung trước khi đóng Sprint 3 |

## 8. Chỉ mục tài liệu và API

| Tài liệu | Nội dung |
|----------|----------|
| [flows/README.md](flows/README.md) | **Nguồn chính của API**: danh sách flow, envelope response, contract mọi endpoint (mục 3), bảng mã lỗi (mục 4), route frontend (mục 5), quyết định D1–D31 (mục 6), Q1–Q22 (mục 7) |
| [flows/register.md](flows/register.md), [flows/login.md](flows/login.md), [flows/logout-protected-routes.md](flows/logout-protected-routes.md) | US-01 |
| [flows/profile.md](flows/profile.md), [flows/avatar-upload.md](flows/avatar-upload.md) | US-02 |
| [flows/category-management.md](flows/category-management.md), [flows/product-management.md](flows/product-management.md) | US-03, US-04, `requireAdmin`, API đọc cho người mua |
| [flows/try-on-room.md](flows/try-on-room.md) | US-05, US-06: provider Gemini, đối tượng `TryOn`/`TryOnQuota` (mục 4), job, cache, dọn dữ liệu, luồng frontend, hạn mức, kiểm thử |
| [database/schema.md](database/schema.md) | ERD, bảng `profiles`, `categories`, `products`, `try_on_results`; bucket; RLS; ánh xạ API ↔ cột |
| [../migrations/README.md](../migrations/README.md) | Thứ tự và trạng thái áp `001`–`009` |
| [screens.md](screens.md), [design-system.md](design-system.md) | Mô tả màn hình, trạng thái UI, component, token, a11y |
| [../sprints/sprint1.md](../sprints/sprint1.md), [sprint2.md](../sprints/sprint2.md), [sprint3.md](../sprints/sprint3.md) | Sprint backlog, acceptance criteria, Definition of Done, ghi chú verify |
| `../sprints/US-01.md` … `US-06.md` | User story chi tiết |
| [../common_errors.md](../common_errors.md) | Lỗi đã gặp và cách phòng tránh |

**Nhóm endpoint** (contract đầy đủ: [flows/README.md](flows/README.md) mục 3):

| Nhóm | Endpoint | Auth |
|------|----------|------|
| Hệ thống | `GET /api/health` | Không |
| Auth | `POST /api/auth/register`, `POST /api/auth/login` | Không |
| Hồ sơ | `GET/PUT /api/user/profile`, `PUT/DELETE /api/user/profile/avatar` | Bearer |
| Admin | `/api/admin/categories[/:id]`, `/api/admin/products[/:id]` (GET/POST/PUT/DELETE) | Bearer + admin |
| Người mua – kho | `GET /api/categories`, `GET /api/categories/:id/products` | Bearer |
| Thử đồ | `POST /api/try-on`, `GET /api/try-on/:id`, `GET /api/try-on/quota`, `POST /api/try-on/consent` | Bearer |
| Giỏ hàng, đơn hàng | Chưa thiết kế (Sprint 4) | – |

## 9. Lộ trình sprint

| Sprint | Mục tiêu | US | Trạng thái |
|--------|----------|----|-----------|
| S1 | Setup project, landing, xác thực, hồ sơ | US-01, US-02 | Xong, đã merge `main` |
| S2 | Kho hàng admin (danh mục, sản phẩm, ảnh flat lay) + API đọc cho người mua | US-03, US-04 | Xong (đóng 2026-11-17), đã merge `main` |
| S3 | Phòng thử đồ GenAI + test tự động | US-05, US-06 | Task 1–7 xong 2026-11-18 (chạy `stub` đầy đủ, Gemini thật đã đo); chờ merge `main` |
| S4 | Mua sắm & giỏ hàng | US-07, US-08, US-09 | Chưa lập kế hoạch (chưa có `sprints/sprint4.md`) |

---
Cập nhật: 2026-11-18
