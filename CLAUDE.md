# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dự án

**Try-on**: web app thử đồ ảo (virtual try-on) theo hướng GenAI. Người mua tải ảnh toàn thân và thông số cơ thể, chọn danh mục để xem ảnh chính mình mặc sản phẩm, chuyển sản phẩm bằng mũi tên/vuốt, thêm vào giỏ. Admin quản lý danh mục, sản phẩm (ảnh flat lay), đơn hàng.

**Tech stack:** React + Vite + TailwindCSS (frontend) · Node.js + Express (backend, REST `/api`) · Supabase PostgreSQL + Storage · JWT do backend tự phát hành (mật khẩu hash ở backend).

## Trạng thái repo & cấu trúc

Task 7 (hồ sơ): backend (`GET/PUT /api/user/profile`, avatar PUT/DELETE; GET trả `data:{profile}`) và UI `/profile` đã nối API thật (`features/profile/profileApi.js` -> `services/userApi.js`, `AuthProvider` đọc `{ profile }` và có `updateUser`), đã validate ngày 2026-11-03 (test trình duyệt + DB + Storage thật). Task 6 (đăng nhập): backend (`/api/auth/login`, `requireAuth`, `GET /api/user/profile`) và nối frontend đã xong và validate ngày 2026-11-03 (`auth/AuthProvider.jsx`, guards `RequireAuth`/`GuestOnly` trong `routes/guards.jsx`, `/login`, `/profile` placeholder, logout + toast); các nhánh chưa test trình duyệt ghi ở `sprints/sprint1.md` Task 6. Đã hoàn tất Sprint 1 – Task 2 (Landing page `/`: `pages/LandingPage.jsx`, `components/landing/*`, mock ở `src/mocks/`, token trong `index.css`) và khung project Task 1: `backend/` (Express, `/api/health`, CORS, error handler, Supabase/JWT config) và `frontend/` (Vite + Tailwind v4 + React Router, API client dùng chung) chạy được; `design/` có `design-system.md`, `screens.md`, `database/schema.md` (Task 3: bảng `profiles`, bucket private `avatars`); `migrations/` có `001`–`005` (`001`–`003` áp ngày 2026-10-28, `004`–`005` áp ngày 2026-11-03). Chưa có test runner. Giữ mục **Commands** bên dưới đồng bộ khi thêm script mới.

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
| Test | Chưa có test runner | Chưa có test runner |

- Kiểm tra backend: `curl http://localhost:3000/api/health`.
- Áp migration Supabase: **dùng Supabase MCP** (apply migration/execute SQL) để áp các file trong `migrations/` theo thứ tự số, không chạy tay. Nếu session chưa kết nối Supabase MCP thì dừng và báo người dùng, fallback là dán vào Supabase SQL Editor – xem `migrations/README.md`.
  - Các migration hiện có: `001_create_profiles.sql` (bảng `profiles`, RLS, trigger `updated_at`) → `002_create_avatars_bucket.sql` (bucket private `avatars`, 5MB, jpeg/png) → `003_seed_profiles.sql` (3 tài khoản mẫu, **chỉ dev**, không chạy trên production) → `004_add_profiles_phone.sql` (cột `profiles.phone`, tuỳ chọn) → `005_grant_profiles_service_role.sql` (GRANT bảng `profiles` cho `service_role`).
  - `migrations/all_in_one_no_comments.sql` chỉ là bản gộp 001–003 không comment để dán tay; không dùng cùng các file đánh số.
  - Không sửa file migration đã áp dụng; thay đổi schema bằng file mới (`004_...`) và cập nhật `design/database/schema.md`.
  - Trạng thái áp dụng: `001`–`003` đã áp lên Supabase qua MCP ngày 2026-10-28 (đã verify: 3 dòng seed, RLS bật, bucket `avatars` private 5MB jpeg/png). `004` (cột `phone`) và `005` (GRANT `service_role` cho `profiles`) đã áp qua MCP ngày 2026-11-03 (đã verify: cột `phone` tồn tại, `service_role` có quyền, `anon`/`authenticated` không có).

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
