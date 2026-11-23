# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dự án

**Try-on**: web app thử đồ ảo (virtual try-on) theo hướng GenAI. Người mua tải ảnh toàn thân và thông số cơ thể, chọn danh mục để xem ảnh chính mình mặc sản phẩm, chuyển sản phẩm bằng mũi tên/vuốt, thêm vào giỏ. Admin quản lý danh mục, sản phẩm (ảnh flat lay), đơn hàng.

**Tech stack:** React + Vite + TailwindCSS (frontend) · Node.js + Express (backend, REST `/api`) · Supabase PostgreSQL + Storage · JWT do backend tự phát hành (mật khẩu hash ở backend).

## Trạng thái repo & cấu trúc

Sprint 2 (kho hàng admin) hoàn thành 8/8 task, đã merge `main` ngày 2026-11-03 (commit `c513f01`) (US-03 danh mục, US-04 sản phẩm + ảnh flat lay, `requireAdmin`/`RequireAdmin`, API đọc `GET /api/categories[/:id/products]`); các mục kiểm thử tồn đọng đã verify ngày 2026-11-17 (xem đầu `sprints/sprint2.md`), đã bổ sung test tự động ở Sprint 3 Task 5. Sprint 3 (phòng thử đồ, US-05/06) hoàn thành và đã merge `main` ngày 2026-11-18 (commit `372f9a0`). Sprint 4 (giỏ hàng + đặt hàng, US-07/08/09 và US-10 bổ sung) đang lập kế hoạch trên nhánh `feature/US-07-cart`: Task 1 xong (thiết kế, Q23–Q34 chốt, migration `010`/`011` áp ngày 2026-11-18), Task 3 xong ngày 2026-11-23 (backend `/api/cart`: `cartRoutes`/`cartController`/`cartService`/`cartValidator`, limiter `cartLimiter`/`cartReadLimiter`, test `backend/test/http/cart.http.test.js`; backlog `sprints/sprint4.md`, flow `design/flows/cart-and-orders.md`); Task 2 xong ngày 2026-11-18 (UI giỏ/checkout/đơn/admin đơn bằng mock, commit `86950db`, lint/build/test xanh, chưa test với backend thật); Task 4 xong ngày 2026-11-24 (backend đặt hàng `POST /api/orders` qua RPC `place_order`, `GET /api/orders/:id`, `GET /api/admin/orders[/:id]`: `routes/orderRoutes.js`, `controllers/orderController.js`, `services/orderService.js`, `validators/orderValidator.js`, `orderLimiter` 10/15 phút/user, test `backend/test/http/orders.http.test.js`; `npm test` 396 xanh, lint sạch; đã chạy thật cổng 3100 trên Supabase và dọn dữ liệu test); Task 5–6 (nối frontend + verify trình duyệt, nợ kỹ thuật) chưa bắt đầu. Chi tiết Sprint 3: API `/api/try-on` (cache, hạn mức 30 lượt/ngày, job bất đồng bộ), UI `/try-on`, test Vitest, `design/PRD.md`; migration `008`/`009` áp ngày 2026-11-17; provider GenAI thật = Gemini (đã đo 13 cặp: p95 10,4 s; `backend/src/services/geminiImageService.js`, model `gemini-3.1-flash-image`, `promptVersion` p2; chưa xác nhận tier trả phí; key `GEMINI_API_KEY` trong `backend/.env`), `stub` mặc định cho dev/test; backlog ở `sprints/sprint3.md`, flow ở `design/flows/try-on-room.md`. Task 7 (hồ sơ): backend (`GET/PUT /api/user/profile`, avatar PUT/DELETE; GET trả `data:{profile}`) và UI `/profile` đã nối API thật (`features/profile/profileApi.js` -> `services/userApi.js`, `AuthProvider` đọc `{ profile }` và có `updateUser`), đã validate ngày 2026-11-03 (test trình duyệt + DB + Storage thật). Task 6 (đăng nhập): backend (`/api/auth/login`, `requireAuth`, `GET /api/user/profile`) và nối frontend đã xong và validate ngày 2026-11-03 (`auth/AuthProvider.jsx`, guards `RequireAuth`/`GuestOnly` trong `routes/guards.jsx`, `/login`, `/profile` placeholder, logout + toast); các nhánh chưa test trình duyệt ghi ở `sprints/sprint1.md` Task 6. Đã hoàn tất Sprint 1 – Task 2 (Landing page `/`: `pages/LandingPage.jsx`, `components/landing/*`, mock ở `src/mocks/`, token trong `index.css`) và khung project Task 1: `backend/` (Express, `/api/health`, CORS, error handler, Supabase/JWT config) và `frontend/` (Vite + Tailwind v4 + React Router, API client dùng chung) chạy được; `design/` có `design-system.md`, `screens.md`, `database/schema.md` (Sprint 1: bảng `profiles`, bucket private `avatars`; Sprint 2 Task 1: bảng `categories`, `products`, bucket private `products`); `migrations/` có `001`–`011` (`001`–`003` áp ngày 2026-10-28, `004`–`007` áp ngày 2026-11-03, `008`–`009` áp ngày 2026-11-17, `010`–`011` áp ngày 2026-11-18). Test tự động: Vitest ở cả `backend/test/` (supertest, Supabase/Gemini được mock) và `frontend/test/` (jsdom), không cần mạng/DB thật (xem mục **Commands**). Giữ mục **Commands** bên dưới đồng bộ khi thêm script mới.

| Đường dẫn | Nội dung |
|-----------|----------|
| `PB.md` | Product backlog: Epic 1–4, US-01 → US-09 |
| `sprints/sprint<N>.md` | Sprint backlog: tasks, công việc, acceptance criteria, Definition of Done |
| `sprints/US-xx.md` | User story chi tiết: luồng chính, luồng lỗi, validate, phi chức năng |
| `design/` | PRD.md, `flows/` (activity diagrams), `database/schema.md`, `screens.md`, `design-system.md` |
| `migrations/` | SQL migration + seed cho Supabase, đánh số thứ tự; cách áp dụng ở `migrations/README.md` |
| `frontend/`, `backend/` | Code React app và Express API |
| `common_errors.md` | Nhật ký lỗi và cách sửa (ghi bằng `/learn-by-mistake`) |
| `.claude/agents/` | 3 subagent: agent-ba, agent-uiux, agent-coder |
| `.claude/commands/` | `/branch`, `/commit`, `/push`, `/pull`, `/merge`, `/learn-by-mistake`, `/wrap-up` |

## Commands

Cài đặt: `npm install` trong từng thư mục `backend/` và `frontend/`; copy `.env.example` -> `.env` ở mỗi thư mục (xem `README.md`).

| Việc | Backend (`cd backend`) | Frontend (`cd frontend`) |
|------|------------------------|--------------------------|
| Chạy dev | `npm run dev` (node --watch, http://localhost:3000/api) | `npm run dev` (http://localhost:5173) |
| Chạy production | `npm start` | `npm run build` rồi `npm run preview` |
| Lint | `npm run lint` | `npm run lint` |
| Format | `npm run format` | `npm run format` |
| Build | (không có) | `npm run build` |
| Test | `npm test` (Vitest + supertest; `npm run test:watch` để chạy liên tục) | `npm test` (Vitest + jsdom + Testing Library; `npm run test:watch`) |

- Kiểm tra backend: `curl http://localhost:3000/api/health`. Phân quyền admin: `GET /api/admin/ping` (cần Bearer token admin; 401 guest, 403 user thường) — router `/api/admin` dùng `requireAuth` + `requireAdmin` (đọc role từ DB).
- Áp migration Supabase: **dùng Supabase MCP** (apply migration/execute SQL) để áp các file trong `migrations/` theo thứ tự số, không chạy tay. Nếu session chưa kết nối Supabase MCP thì dừng và báo người dùng, fallback là dán vào Supabase SQL Editor – xem `migrations/README.md`.
  - Các migration hiện có: `001_create_profiles.sql` (bảng `profiles`, RLS, trigger `updated_at`) → `002_create_avatars_bucket.sql` (bucket private `avatars`, 5MB, jpeg/png) → `003_seed_profiles.sql` (3 tài khoản mẫu, **chỉ dev**, không chạy trên production) → `004_add_profiles_phone.sql` (cột `profiles.phone`, tuỳ chọn) → `005_grant_profiles_service_role.sql` (GRANT bảng `profiles` cho `service_role`) → `006_create_categories_products.sql` (bảng `categories`, `products`, FK `ON DELETE RESTRICT`, RLS, GRANT `service_role`, seed 3 danh mục) → `007_create_products_bucket.sql` (bucket private `products`, 5MB, jpeg/png) → `008_create_try_on_results.sql` (cột `profiles.try_on_consent_at`, bảng `try_on_results`, RLS, GRANT `service_role`) → `009_create_try_on_results_bucket.sql` (bucket private `try-on-results`, 10MB, jpeg/png/webp) → `010_create_cart_items.sql` (bảng `cart_items`, giỏ hàng server) → `011_create_orders.sql` (bảng `orders`, `order_items`, hàm `place_order` đặt hàng nguyên tử qua `supabase.rpc`, chỉ `service_role` chạy được).
  - `migrations/all_in_one_no_comments.sql` chỉ là bản gộp 001–003 không comment để dán tay; không dùng cùng các file đánh số.
  - Không sửa file migration đã áp dụng; thay đổi schema bằng file mới (`004_...`) và cập nhật `design/database/schema.md`.
  - Trạng thái áp dụng: `001`–`003` đã áp lên Supabase qua MCP ngày 2026-10-28 (đã verify: 3 dòng seed, RLS bật, bucket `avatars` private 5MB jpeg/png). `004` (cột `phone`) và `005` (GRANT `service_role` cho `profiles`) đã áp qua MCP ngày 2026-11-03 (đã verify: cột `phone` tồn tại, `service_role` có quyền, `anon`/`authenticated` không có). `006`–`007` đã áp qua MCP ngày 2026-11-03 (đã verify: grant `service_role` có, `anon`/`authenticated` không; RLS bật; 3 danh mục seed; FK RESTRICT; bucket `products` private 5MB jpeg/png). `008`–`009` đã áp qua MCP ngày 2026-11-17 (đã verify: GRANT chỉ `service_role`, RLS bật, 2 unique index một phần, cột consent, bucket `try-on-results` private 10MB). `010`–`011` đã áp qua MCP ngày 2026-11-18 (đã verify quyền bảng/hàm, RLS, thử `place_order` trong giao dịch bị huỷ). Lưu ý: gọi `apply_migration` tuần tự, không song song (trùng version); xác nhận của MCP hết hạn sau 10 phút nếu không ai bấm.

## Quy trình phát triển: Scrum

- Mọi công việc đi theo sprint backlog. Làm từng task một theo thứ tự ưu tiên và dependencies ghi trong `sprints/sprint<N>.md` (ví dụ Sprint 1: Task 1 trước tiên; Task 3, 4 xong trước Task 5).
- **Mọi chỉnh sửa, nâng cấp, sửa lỗi phát sinh ngoài task hiện tại phải được thêm vào sprint backlog trước rồi mới làm** (task mới trong sprint hiện tại hoặc ghi cho sprint sau, kèm mô tả và acceptance criteria). Không sửa ngầm ngoài backlog.
- Một task chỉ được coi là xong khi đạt acceptance criteria của task/user story và Definition of Done của sprint; đánh dấu `[x]` các công việc đã hoàn thành trong sprint backlog.
- **Từ Sprint 2 trở đi:** trước khi thiết kế hay cài đặt bất kỳ task nào, đọc lại thiết kế (`design/`) và code liên quan của các sprint trước để tái sử dụng, giữ nhất quán và không phá vỡ tính năng cũ. Thiết kế mới phải cập nhật vào tài liệu hiện có (schema, flows, screens), không tạo bản song song mâu thuẫn.

## Điều phối agents

Agent chính (bạn) là Scrum Master / tech lead: **điều phối 3 subagent làm việc, không tự làm thay phần việc chuyên môn của chúng**, và chịu trách nhiệm validate mọi kết quả bàn giao.

| Agent | Vai trò | Đầu ra |
|-------|---------|--------|
| `agent-ba` | Yêu cầu, PRD, activity diagrams, database/storage schema, API contract, tư vấn công nghệ | `design/PRD.md`, `design/flows/*`, `design/database/schema.md`, `migrations/*.sql` |
| `agent-uiux` | Design system, mô tả màn hình, code UI layer (mock data, happy case) | `design/design-system.md`, `design/screens.md`, components/pages trong `frontend/` |
| `agent-coder` | Code backend + frontend, nối UI với API, bảo mật, migration | `backend/`, `frontend/`, cập nhật README, `.env.example` |

Luồng điển hình cho một tính năng: **agent-ba** (làm rõ yêu cầu → flows/schema) → **agent-uiux** (screens → UI) → **agent-coder** (API + nghiệp vụ + nối UI). Task thuần thiết kế (ví dụ "Thiết kế Database", "Thiết kế Flow") chỉ cần agent-ba; task setup project giao agent-coder.

Khi giao việc cho subagent: nêu rõ task trong sprint backlog, các file yêu cầu/thiết kế liên quan (kể cả thiết kế/code sprint trước), phạm vi và acceptance criteria cần đạt. Subagent không thấy hội thoại này nên prompt phải tự đủ thông tin.

**Validate bàn giao (bắt buộc trước khi báo xong):**
- Đối chiếu từng acceptance criteria của task và user story với kết quả thực tế; đọc lại file/code được bàn giao, không chỉ tin vào tóm tắt của subagent.
- Kiểm tra tính nhất quán chéo: schema ↔ migration ↔ code backend; API contract ↔ frontend; `screens.md` ↔ UI.
- Với code: tự chạy lint/build/test và chạy thử endpoint/màn hình liên quan.
- Nếu chưa đạt: trả lại đúng agent kèm danh sách lỗi cụ thể, lặp đến khi đạt. Báo cáo trung thực những gì đã verify và chưa verify được.

## Ghi nhận lỗi: `/learn-by-mistake`

- Mỗi khi gặp lỗi đáng kể trong quá trình phát triển (bug, build/lint fail, sai thiết kế, subagent bàn giao sai, hiểu sai yêu cầu) và đã sửa xong, chạy `/learn-by-mistake` để ghi lỗi và cách sửa vào `common_errors.md`, nhóm theo loại lỗi. `/wrap-up` cuối phiên cũng gọi lệnh này.
- **Đọc `common_errors.md` trước khi bắt đầu mỗi task** và đưa các lỗi liên quan vào prompt khi giao việc cho subagent để tránh lặp lại.

## Git

- Làm mỗi user story trên một branch riêng (`/branch`, đặt tên theo user story), merge về `main` bằng `/merge`.
