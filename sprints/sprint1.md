# Sprint 1: Project Setup & Authentication
## Mục tiêu Sprint
Thiết lập project và xây dựng các tính năng authentication cơ bản
User Stories: US-01, US-02
## Tasks
### 1. Thiết lập Project (Priority: High)
**Mô tả:** Khởi tạo và cấu hình project
**Công việc:**
- [x] Khởi tạo project backend với NodeJS/ExpressJS trong `backend/` (ES modules, script `dev` có auto-reload, script `start`)
- [x] Cấu hình ESLint, Prettier cho backend
- [x] Khởi tạo project frontend với ReactJS/Vite trong `frontend/`
- [x] Cài đặt và cấu hình TailwindCSS cho frontend (theo hướng dẫn tích hợp Vite của phiên bản hiện tại)
- [x] Cài đặt React Router, tạo khung routing (layout chung, trang 404)
- [x] Cấu hình ESLint, Prettier cho frontend
- [x] Tạo Supabase project, cài `@supabase/supabase-js` cho backend, tạo module Supabase client dùng service role key (chỉ ở backend)
- [x] Cấu hình JWT cho authentication (cài `jsonwebtoken`, `bcrypt`; secret và TTL lấy từ env)
- [x] Setup environment variables (`backend/.env.example`: `PORT`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; `frontend/.env.example`: `VITE_API_URL`)
- [x] Tạo cấu trúc thư mục cho frontend, backend và các thư mục `design/`, `migrations/`
- [x] Setup CORS cho API (chỉ cho phép origin `CLIENT_URL`)
- [x] Tạo error-handling middleware chung và endpoint `GET /api/health` (kiểm tra kết nối Supabase)
- [x] Tạo API client dùng chung ở frontend (đọc `VITE_API_URL`, tự gắn JWT)
- [x] Tạo file README với hướng dẫn setup & run project
- [x] Cập nhật mục Commands trong `CLAUDE.md` với lệnh dev/build/lint/test thực tế

**Acceptance Criteria:**
- Frontend và backend chạy được trên local; frontend gọi được `GET /api/health` thành công (không lỗi CORS)
- TailwindCSS hoạt động trên frontend
- Backend kết nối được Supabase
- Environment variables được cấu hình đúng; `.env` không bị commit, có `.env.example` cho cả hai project
- Lint chạy không lỗi trên cả frontend và backend
- File README được tạo và chứa hướng dẫn setup & run project

---

### 2. Tạo Landing Page (Priority: Medium)
**Mô tả:** Xây dựng trang landing page cho ứng dụng

**Công việc:**
- [x] Thiết kế layout landing page
- [x] Tạo header với logo và navigation
- [x] Tạo hero section
- [x] Tạo features section
- [x] Tạo footer
- [x] Responsive design cho mobile và tablet
- [x] Thêm routing cho landing page

**Acceptance Criteria:**
- Landing page hiển thị đầy đủ các sections
- Responsive trên các thiết bị
- Navigation hoạt động
- UI/UX thân thiện, đẹp mắt và fashionista

---

### 3. Thiết kế Database (Priority: High)
**Mô tả:** Thiết kế schema cho sprint 1 (auth/profile)

**Công việc:**
- [x] Xác định bảng cho các tính năng trong sprint 1 và các cột cần thiết
- [x] Thiết lập indexes và constraints
- [x] Viết script/migration SQL trên Supabase (đã viết `migrations/001`–`003`; đã áp lên Supabase qua MCP ngày 2026-10-28 và verify)
- [x] Thiết kế storage cho các tính năng trong sprint 1 trên Supabase
- [x] Thiết kế script/migration cho storage (`migrations/002`; đã áp lên Supabase ngày 2026-10-28)

**Acceptance Criteria:**
- Schema `profiles` được tạo trên Supabase, có unique email
- Có sẵn dữ liệu mẫu cho bảng `profiles` ứng với user stories trong sprint 1
- Storage được tạo trên Supabase cho avatar
- Lưu được schema vào thư mục /design, scripts vào thư mục /migrations

---

### 4. Thiết kế Flow (Priority: High)
**Mô tả:** Xác định luồng auth/profile cho sprint 1

**Công việc:**
- [x] Phác thảo flow đăng ký (register)
- [x] Phác thảo flow đăng nhập (login + JWT)
- [x] Phác thảo flow lấy/cập nhật profile và upload avatar (Storage)
- [x] Phác thảo flow logout và bảo vệ routes
- [x] Lưu lại sơ đồ/ngắn gọn trong thư mục thiết kế (`design/flows/`: README, register, login, logout-protected-routes, profile, avatar-upload)

**Acceptance Criteria:**
- Có tài liệu flow rõ ràng cho register, login, profile (get/update), upload avatar, logout
- Flow được review và chốt trước khi dev tính năng

---

### 5. Tạo tính năng Đăng ký (Priority: High)
**Mô tả:** Xây dựng chức năng đăng ký tài khoản mới dựa trên flow đã chốt

**Công việc:**
- [x] Tạo API endpoint đăng ký (POST /api/auth/register) — `backend/src/{routes,controllers,services,validators}`; đã verify với DB thật 2026-11-03: 201 khi đăng ký mới, 409 `EMAIL_EXISTS` khi trùng email
- [x] Validate dữ liệu đầu vào (email, password, etc.) — đã test các nhánh 400 trên API và UI
- [x] Hash password trước khi lưu — bcrypt cost 10; đã verify bản ghi (`$2b$10$…`, 60 ký tự)
- [x] Tạo UI form đăng ký (`/register`, xem `design/screens.md`)
- [x] Kết nối frontend với API đăng ký (CORS, fields lỗi, chuyển `/login` kèm state)
- [x] Xử lý error và success messages — đã test lỗi trường, lỗi chung; thành công chuyển `/login` (trang login làm ở Task 6)
- [x] Email validation và unique check — validate xong; unique check (SELECT + bắt 23505) đã verify 409 với DB thật
- [x] **Phát sinh:** áp `migrations/005_grant_profiles_service_role.sql` (cấp quyền bảng `profiles` cho `service_role`; thiếu thì backend lỗi `42501 permission denied for table profiles`) cùng `004` lên Supabase, rồi test lại 201/409 (đã áp và test xong 2026-11-03)

**Acceptance Criteria:**
- User có thể đăng ký tài khoản mới
- Password được hash an toàn
- Validation hoạt động đúng
- Error handling đầy đủ
- Không cho phép email trùng lặp

---

### 6. Tạo tính năng Đăng nhập (Priority: High)
**Mô tả:** Xây dựng chức năng đăng nhập

**Công việc:**
- [x] Tạo API endpoint đăng nhập (POST /api/auth/login)
- [x] Verify email và password
- [x] Generate JWT token khi đăng nhập thành công
- [x] Tạo UI form đăng nhập
- [x] Kết nối frontend với API đăng nhập
- [x] Lưu JWT token (localStorage/cookie)
- [x] Implement logout functionality
- [x] Protected routes setup (backend `requireAuth` + `verifyToken` HS256; frontend `AuthProvider`, `RequireAuth`, `GuestOnly`, xử lý 401 trong `apiClient`)
- [x] Xử lý error messages
- [x] **Phát sinh (ghi 2026-11-03):** `AuthProvider` kiểm tra phiên bằng `GET /api/user/profile` và login chuyển tới `/profile` (cả hai thuộc Task 7), nên Task 6 làm bản tối thiểu: `GET /api/user/profile` chỉ đọc (id, email, role, displayName) qua `requireAuth` và trang `/profile` placeholder (có nút Đăng xuất) để có route bảo vệ thật mà test. Task 7 mở rộng tiếp (PUT, số đo, phone, avatar). Bật `AUTH_ROUTES_READY.login = true`, cập nhật `design/screens.md` (màn `/login`, header đăng xuất)
- [x] `loginLimiter` (10 lần thất bại / 15 phút / IP, `skipSuccessfulRequests`) và `DUMMY_HASH` chống timing theo `design/flows/login.md`

**Ghi chú verify (2026-11-03):** đã test thật trên DB + trình duyệt (Playwright): login đúng/sai, form trống, 400, 429 (hiện thông báo, giữ dữ liệu form), GET profile (token hợp lệ/thiếu/sai/hết hạn/HS512), guest vào `/profile` → `/login?redirect=`, đăng ký → `/login` có banner, reload giữ phiên, logout, Back sau logout, token giả khi khởi động, 401 giữa phiên (`reason=expired` + banner, hai request song song chỉ xử lý một lần), đồng bộ nhiều tab (`storage`), mất kết nối backend → màn lỗi + Thử lại, responsive 375px + menu mobile. Lỗi tìm thấy khi test và đã sửa: `RequireAuth` ghi đè URL làm mất `reason=expired` (nay lưu `expiredFor` trong session). Lưu ý: `skipSuccessfulRequests` chỉ bỏ qua status < 400 nên request 400 cũng tính vào hạn mức 10 lần.

**Acceptance Criteria:**
- User có thể đăng nhập với email/password
- JWT token được tạo và lưu trữ
- Redirect sau khi đăng nhập thành công
- Logout hoạt động đúng
- Protected routes chỉ truy cập khi đã login

---

### 7. Tạo tính năng Cập nhật Hồ sơ (Priority: Medium)
**Mô tả:** Cho phép user cập nhật thông tin cá nhân

**Công việc:**
- [ ] Tạo API endpoint lấy thông tin user (GET /api/user/profile)
- [ ] Tạo API endpoint cập nhật profile (PUT /api/user/profile)
- [ ] Implement JWT verification middleware
- [ ] Tạo UI profile page
- [ ] Form cập nhật thông tin (tên hiển thị, số điện thoại tuỳ chọn, chiều cao, cân nặng; email chỉ đọc)
- [x] Áp migration `004_add_profiles_phone.sql` lên Supabase (thêm cột `phone`) trước khi làm API profile — đã áp 2026-11-03
- [ ] Upload avatar (sử dụng Supabase Storage)
- [ ] Xoá ảnh toàn thân: API `DELETE /api/user/profile/avatar` + nút "Xoá ảnh" có hộp thoại xác nhận (flow: `design/flows/avatar-upload.md` mục 4)
- [ ] Validate dữ liệu cập nhật
- [ ] Xử lý upload file
- [ ] Update UI sau khi save thành công

**Acceptance Criteria:**
- User có thể xem thông tin profile
- User có thể cập nhật thông tin
- Avatar upload hoạt động với Supabase Storage
- User xoá được ảnh toàn thân (có xác nhận); sau khi xoá hồ sơ về trạng thái chưa có ảnh và object cũ bị dọn khỏi Storage
- Validation đầy đủ
- Chỉ user đã login mới truy cập được
- UI phản hồi khi save thành công/thất bại

### Backlog phát sinh (ghi cho Task 7 / sprint sau)
- [ ] `document.title` chưa được đặt lại ở landing và trang 404 nên còn tiêu đề của trang trước (ví dụ "Hồ sơ — Try-on"). Acceptance: mỗi route đặt title riêng.
- [ ] Cân nhắc chỉ tính lần đăng nhập sai (401) vào `loginLimiter`, không tính 400.

## Definition of Done
- Code được review
- Unit tests passed (nếu có)
- Functionality tested trên môi trường local
- Documentation cập nhật
- Code được merge vào branch chính

## Notes
- Ưu tiên hoàn thành Task 1 trước để các task khác có thể triển khai
- Task 3 và 4 cần hoàn thành trước Task 5
- Tập trung vào security cho authentication features
