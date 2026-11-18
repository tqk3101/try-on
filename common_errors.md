# Common errors

Nhật ký các lỗi đã gặp khi làm dự án và cách sửa, nhóm theo loại lỗi. **Đọc file này trước khi code mỗi task** (và đưa các mục liên quan vào prompt khi giao việc cho subagent). Thêm lỗi mới bằng `/learn-by-mistake`.

Mỗi mục: **Triệu chứng** → **Nguyên nhân** → **Cách sửa / phòng tránh**.

Cập nhật lần cuối: 2026-11-17 (Sprint 3, Task 1).

## Mục lục
1. [Database / Supabase](#1-database--supabase)
2. [Bảo mật](#2-bảo-mật)
3. [Logic frontend (auth, routing)](#3-logic-frontend-auth-routing)
4. [Thiết kế & quy trình Scrum](#4-thiết-kế--quy-trình-scrum)
5. [Subagent & điều phối](#5-subagent--điều-phối)
6. [Môi trường Windows & công cụ](#6-môi-trường-windows--công-cụ)
7. [Kiểm thử & dữ liệu test](#7-kiểm-thử--dữ-liệu-test)
8. [Git & repo public](#8-git--repo-public)

---

## 1. Database / Supabase

### 1.1 `42501 permission denied for table profiles`
- **Triệu chứng:** backend dùng service role key nhưng đọc/ghi bảng `profiles` lỗi `42501`.
- **Nguyên nhân:** project Supabase này KHÔNG tự `GRANT` bảng mới trong schema `public` cho `service_role`. `service_role` bypass RLS nhưng vẫn cần `GRANT` mức bảng. Migration `001` chỉ `REVOKE` anon/authenticated, giả định mặc định đã có quyền.
- **Cách sửa:** migration `005_grant_profiles_service_role.sql` (`grant usage on schema public` + `grant select, insert, update, delete on table public.profiles to service_role`).
- **Phòng tránh:** mọi migration tạo bảng mới phải kèm `grant ... to service_role` (và KHÔNG cấp cho `anon`/`authenticated`). Sau khi áp, verify bằng `information_schema.role_table_grants`.

### 1.2 Migration viết xong nhưng chưa áp lên Supabase → task bị chặn
- **Triệu chứng:** code đăng ký đã viết nhưng không verify được 201/409; sprint backlog treo `[ ]`.
- **Nguyên nhân:** Supabase MCP bị ngắt khi viết `004`/`005`, không áp được; tài liệu ghi "chưa áp".
- **Cách sửa:** kết nối lại MCP, áp `004` rồi `005`, kiểm tra bằng `list_migrations` + truy vấn schema, rồi mới test API.
- **Phòng tránh:** khi bắt đầu task cần schema mới, kiểm tra `list_migrations` trước. Nếu MCP ngắt thì dừng và báo người dùng (theo `CLAUDE.md`), không code tiếp rồi "chờ verify". Cập nhật trạng thái áp dụng ở `CLAUDE.md`, `migrations/README.md`, `design/database/schema.md` ngay sau khi áp.

### 1.3 Lệnh `execute_sql` hết hạn xác nhận sau 2 phút
- **Triệu chứng:** `This confirmation expired after 2 minutes` (subagent gọi 2 lần đều bị từ chối).
- **Nguyên nhân:** Supabase MCP yêu cầu người dùng xác nhận các câu lệnh ghi (DELETE/UPDATE); chạy trong subagent nền thì không ai xác nhận kịp.
- **Cách sửa:** agent chính chạy lại lệnh ở foreground để người dùng xác nhận.
- **Phòng tránh:** subagent KHÔNG chịu trách nhiệm xoá dữ liệu test qua MCP: yêu cầu nó liệt kê email test, agent chính xoá. Dùng `delete ... where email like 'test.%@example.com' returning email` để xoá gọn và thấy kết quả.

### 1.4 `apply_migration` gọi song song -> trùng version
- **Triệu chứng:** gọi 2 `apply_migration` cùng lúc, cái sau lỗi `23505 duplicate key ... schema_migrations_pkey (version)`.
- **Nguyên nhân:** version migration lấy theo thời gian đến giây; hai lệnh chạy song song nhận cùng version. Lệnh lỗi bị rollback hoàn toàn nên chưa áp gì.
- **Cách sửa / phòng tránh:** chạy migration **tuần tự** (008 xong mới 009), rồi `list_migrations` để xác nhận.

---

## 2. Bảo mật

### 2.1 Mật khẩu tài khoản mẫu ghi plaintext trong tài liệu của repo public
- **Triệu chứng:** `design/database/schema.md` ghi `admin@tryon.dev` / `Admin@123`...; `migrations/003` chứa hash tương ứng; 3 tài khoản (có 1 `admin`) đang tồn tại trong DB Supabase thật.
- **Nguyên nhân:** coi seed là "chỉ dev" nên ghi mật khẩu rõ ràng; chưa tính tới việc đưa repo lên GitHub public.
- **Cách sửa:** sinh mật khẩu ngẫu nhiên mới, cập nhật hash trong DB thật và trong `003` + `all_in_one_no_comments.sql`; bỏ plaintext khỏi docs; lưu mật khẩu mới ở `backend/.env.seed-accounts` (khớp `.env.*` trong `.gitignore`).
- **Phòng tránh:** trước khi push repo public, quét `grep` mật khẩu mẫu, khoá (`eyJ`, `sb_secret`, `sbp_`), project ref. Không ghi mật khẩu plaintext vào file được commit. Seed dev có quyền admin nên dùng mật khẩu ngẫu nhiên từ đầu.

### 2.2 File cấu hình cục bộ suýt bị commit
- **Triệu chứng:** `.mcp.json` (chứa project ref Supabase), `.playwright-mcp/` (ảnh chụp, log), `.claude/settings.local.json` chưa nằm trong `.gitignore`.
- **Cách sửa:** thêm 3 mục vào `.gitignore` trước commit đầu tiên.
- **Phòng tránh:** sau `git add -A` luôn xem `git diff --cached --name-only | grep -E "\.env|mcp|playwright|settings.local"` trước khi commit.

### 2.3 Hạn mức đăng nhập đếm cả request 400
- **Triệu chứng:** `loginLimiter` (10 lần / 15 phút) dùng `skipSuccessfulRequests`, mà thư viện chỉ bỏ qua status < 400, nên request thiếu trường (400) cũng bị tính.
- **Trạng thái:** chấp nhận ở Sprint 1, đã ghi backlog (chỉ tính 401).
- **Phòng tránh:** khi dùng `express-rate-limit`, nói rõ status nào được tính; viết `requestWasSuccessful` hoặc kiểm tra `res.statusCode` nếu cần đếm riêng lần sai mật khẩu.

---

## 3. Logic frontend (auth, routing)

### 3.1 Mất `reason=expired` khi token bị từ chối giữa phiên
- **Triệu chứng:** token bị 401 khi đang ở `/profile` → URL cuối là `/login?redirect=%2Fprofile` (thiếu `reason=expired`), banner "Phiên đăng nhập đã hết hạn" không hiện.
- **Nguyên nhân:** race giữa hai lần điều hướng: `unauthorizedHandler` gọi `navigate('/login?...&reason=expired')` rồi `setSession(GUEST)`; ngay sau đó `RequireAuth` (còn mount ở `/profile`) render `<Navigate to="/login?redirect=...">` không có reason và ghi đè.
- **Cách sửa:** lưu `expiredFor` (đường dẫn nơi 401 xảy ra) trong session; `RequireAuth` thêm `&reason=expired` khi `expiredFor` trùng đường dẫn hiện tại. Không dùng cờ boolean (sẽ gắn `reason=expired` nhầm cho khách vào `/profile` sau đó).
- **Phòng tránh:** khi vừa đổi trạng thái auth vừa `navigate()`, nhớ rằng route guard đang mount sẽ phản ứng với trạng thái mới và có thể điều hướng đè. Mọi nơi tạo URL `/login` phải cho ra cùng kết quả. Test bằng trình duyệt thật, đọc URL cuối, không chỉ đọc code.

### 3.2 Đăng xuất từ trang bảo vệ bị đưa sang `/login` thay vì `/`
- **Triệu chứng:** bấm Đăng xuất ở `/profile` → `navigate('/')` rồi `setSession(guest)` nhưng `RequireAuth` chen ngang, kết quả `/login?redirect=%2Fprofile`.
- **Cách sửa:** lưu `logoutKey` (location key của trang lúc bấm Đăng xuất); `RequireAuth` thấy guest + `logoutKey === key` thì `<Navigate to="/">`.
- **Phòng tránh:** cùng gốc với 3.1. Đăng xuất phải được test: về `/`, Back không vào lại được trang bảo vệ.

### 3.3 `GuestOnly` và `LoginPage` cùng điều hướng sau đăng nhập
- **Nguy cơ:** hai nơi cùng `navigate` sau login gây chạy đua.
- **Cách sửa:** chỉ `GuestOnly` điều hướng (tới `safeRedirect(redirect) ?? /profile`); `LoginPage` không `navigate` nữa.
- **Phòng tránh:** mỗi hành vi điều hướng chỉ có MỘT chủ sở hữu.

### 3.4 401 của request đăng nhập bị coi là "hết hạn phiên"
- **Nguy cơ:** `POST /auth/login` sai mật khẩu trả 401 → `apiClient` xoá token và kích hoạt luồng hết hạn.
- **Cách sửa:** `apiClient` chỉ xử lý 401 khi request ĐÃ gửi token (`hadToken`); login/register gọi với `auth:false` để không gửi token cũ.
- **Phòng tránh:** phân biệt 401 "sai thông tin đăng nhập" với 401 "phiên không hợp lệ".

### 3.5 Placeholder/mock còn sót khi bàn giao UI
- **Triệu chứng:** UI layer bàn giao với `mockLogin`, `MOCK_USER`, `user = null` trong `MainLayout`, `logout = () => {}`.
- **Cách sửa:** liệt kê TODO nối thật cho agent-coder; sau khi nối, `grep` đảm bảo không còn `authMock|mockLogin|MOCK_USER`; xoá `mocks/authMock.js`.
- **Phòng tránh:** yêu cầu agent-uiux ghi danh sách điểm TODO cụ thể; agent-coder chạy `grep` xác nhận sạch mock.

### 3.6 `document.title` không được đặt lại ở landing và 404
- **Triệu chứng:** sau khi rời `/profile` hoặc `/login`, tab còn tiêu đề trang trước.
- **Trạng thái:** chưa sửa, đã ghi backlog.
- **Phòng tránh:** mỗi route đặt title riêng (hoặc một hook `useDocumentTitle`).

---

## 4. Thiết kế & quy trình Scrum

### 4.1 Task phụ thuộc phần thuộc task sau
- **Triệu chứng:** Task 6 (đăng nhập, protected routes) cần `GET /api/user/profile` và trang `/profile`, nhưng cả hai nằm ở Task 7.
- **Cách sửa:** ghi mục "Phát sinh" vào sprint backlog TRƯỚC khi làm; Task 6 làm bản tối thiểu (GET chỉ đọc + `/profile` placeholder), Task 7 mở rộng.
- **Phòng tránh:** đọc flow + sprint backlog, tìm dependency chéo giữa các task trước khi giao việc; ghi vào backlog rồi mới làm (đúng quy tắc Scrum trong `CLAUDE.md`).

### 4.2 Tài liệu ghi trạng thái cũ sau khi thay đổi
- **Triệu chứng:** `CLAUDE.md`, `migrations/README.md`, `schema.md`, `screens.md` còn ghi "chưa áp", "`/login` sắp ra mắt".
- **Phòng tránh:** sau mỗi thay đổi trạng thái (áp migration, xong task), `grep` các cụm cũ ("chưa áp", "sắp ra mắt", "chờ") và cập nhật cùng lúc; đánh `[x]` sprint backlog sau khi validate chứ không phải khi agent báo xong.
- **Ví dụ gặp lại (Task 7):** `design/screens.md` mục /login còn nhắc `mocks/authMock.js` đã bị xoá từ Task 6; chỉ phát hiện khi `grep` cụm `authMock|mockLogin|MOCK_`.

### 4.3 Đổi hợp đồng API (shape response) khi backend và UI làm song song
- **Triệu chứng:** backend Task 7 đổi `GET /api/user/profile` từ `data:{user}` (Task 6) sang `data:{profile}` (đúng `profile.md`), nhưng `AuthProvider` vẫn đọc `{ user }` → khôi phục phiên khi reload sẽ hỏng. May là agent backend báo lại nên bắt được trước khi nối.
- **Cách sửa:** đổi `AuthProvider.checkSession` và `userApi.js` sang `{ profile }` (chỉ giữ `id, email, role, displayName` trong AuthContext) trong CÙNG bước nối; test reload `/profile` khi đang đăng nhập.
- **Phòng tránh:** khi giao việc song song, nêu rõ shape request/response trong cả hai prompt; yêu cầu agent backend báo mọi thay đổi hợp đồng so với task trước; `grep` mọi nơi dùng endpoint đó ở frontend trước khi nối.

---

## 5. Subagent & điều phối

### 5.1 `Agent type 'agent-coder' not found`
- **Triệu chứng:** gọi `Agent` với `subagent_type: agent-coder` / `agent-uiux` báo không tìm thấy; chỉ có `claude`, `general-purpose`, `Explore`, `Plan`...
- **Nguyên nhân:** agent định nghĩa trong `.claude/agents/` chưa được nạp trong session.
- **Cách sửa:** dùng `general-purpose` và bắt đầu prompt bằng "đọc `.claude/agents/agent-xxx.md` và tuân theo vai trò trong đó".
- **Phòng tránh:** thử đúng tên agent trước; nếu lỗi, dùng cách trên ngay (đừng làm thay phần việc chuyên môn).

### 5.2 Báo cáo subagent không đủ để coi là xong
- **Phòng tránh:** luôn tự đọc code bàn giao, chạy `lint`/`build`, chạy lại kịch bản chính trên trình duyệt. Ví dụ: `npm run build` của agent-uiux "thành công" nhưng trang mới chưa được router import nên chưa vào bundle; chỉ lint phủ chúng. Lỗi 3.1 chỉ lộ ra khi chạy luồng thật.

### 5.3 Subagent không có quyền/không biết giới hạn môi trường
- **Phòng tránh:** nêu trong prompt: không dùng `taskkill /IM node.exe`, chỉ tắt đúng PID mình bật; cổng 3000 có thể bị tiến trình khác giữ (dùng `PORT=3100`); không xoá dữ liệu qua MCP (xem 1.3).

---

## 6. Môi trường Windows & công cụ

### 6.1 `Python was not found`
- **Triệu chứng:** script sửa file bằng `python` không chạy (lệnh trỏ tới Microsoft Store), nên các chỉnh sửa tài liệu CHƯA được áp dù lệnh có vẻ hoàn tất.
- **Cách sửa:** viết script bằng Node (`node file.mjs`) hoặc dùng công cụ Edit.
- **Phòng tránh:** dùng Node cho script tạm; sau khi chạy script sửa file, `grep` kiểm tra thay đổi thực sự có trong file.

### 6.2 `taskkill /IM node.exe` bị chặn (quá rộng)
- **Triệu chứng:** lệnh tắt mọi `node.exe` bị từ chối, backend test vẫn chạy.
- **Cách sửa:** tắt đúng tiến trình theo cổng: `Get-NetTCPConnection -LocalPort <port> -State Listen` → `Stop-Process -Id <OwningProcess>`.
- **Phòng tránh:** không bao giờ kill theo tên tiến trình; luôn theo PID/cổng của chính mình. Tiến trình giữ cổng 3000 không phải của agent thì để nguyên.

### 6.3 Cổng 3000 bị tiến trình khác giữ
- **Cách làm:** chạy backend test ở cổng khác: `PORT=3100 CLIENT_URL=http://localhost:5174`; frontend `VITE_API_URL=http://localhost:3100/api npx vite --port 5174 --strictPort`. Biến môi trường trong shell được ưu tiên hơn `--env-file`, không cần sửa `.env`.

### 6.4 Tham số công cụ Playwright MCP
- **Triệu chứng:** `Invalid input: expected string, received undefined at target` khi truyền `ref`.
- **Cách sửa:** dùng tham số `target` (ref từ snapshot hoặc locator dạng `getByRole('button', { name: '...' })`); `textbox "Email"` KHÔNG phải target hợp lệ. Sau khi trang điều hướng, ref cũ mất hiệu lực (`Ref e27 not found`): chụp snapshot lại.
- **Mẹo:** gọi `apiClient` thật trong trang qua `await import('/src/services/apiClient.js')` (dev server Vite) để tạo request giữa phiên.
- **Upload file (`browser_file_upload`):** chỉ đọc được file trong các thư mục gốc cho phép (`C:src	ry-on-claude` và `C:src	ry-on-claude.playwright-mcp`); file ở scratchpad/Temp bị từ chối ("outside allowed roots"). Tạo ảnh test ở scratchpad (ngoài repo), copy vào `C:src	ry-on-claude.playwright-mcp` (thư mục cha, không thuộc repo git) rồi xoá sau test. Khi file chooser đang mở thì `browser_click` bị chặn: xử lý bằng `browser_file_upload` trước.

### 6.5 Edit báo cần Read lại sau khi file bị sửa bằng shell
- **Triệu chứng:** "This command modified N files you've previously read: Call Read before editing."
- **Phòng tránh:** sau khi sửa file bằng `sed`/script, đọc lại bằng Read trước khi dùng Edit.

### 6.6 Git: `Author identity unknown`
- **Cách sửa:** đặt danh tính riêng cho repo (`git config user.name/user.email`, không `--global`). Với repo public dùng địa chỉ noreply của GitHub (`<user>@users.noreply.github.com`), không dùng email cá nhân. Cảnh báo `LF will be replaced by CRLF` là bình thường trên Windows.

### 6.7 `git status` báo gần như mọi file đã sửa (nhiễu CRLF)
- **Triệu chứng:** sau khi chuyển nhánh, `git status` liệt kê hàng chục file backend là `M` dù agent chỉ sửa vài file; Prettier cũng báo ~37 file "khác kiểu xuống dòng". Script Node đọc file trong worktree/checkout cũng có thể gặp CRLF làm chuỗi tìm kiếm nhiều dòng không khớp.
- **Nguyên nhân:** `core.autocrlf=true` trên Windows (working copy LF/CRLF khác nhau giữa các lần checkout).
- **Cách xử lý:** `git diff --ignore-space-at-eol --stat` để xem thay đổi thật; script sửa file nhiều dòng phải `replace(/
/g, '
')` khi đọc. KHÔNG "sửa" bằng cách format lại cả repo (tạo diff khổng lồ).

### 6.8 Playwright MCP báo `Browser is already in use for ...ms-playwright-mcpmcp-chrome-...`
- **Triệu chứng:** mọi lệnh Playwright MCP (kể cả `browser_close`) lỗi; subagent không verify được trình duyệt và bàn giao thiếu.
- **Nguyên nhân:** một Chrome cũ của chính Playwright MCP vẫn giữ profile (tiến trình cha là `@playwright/mcp/cli.js`); `browser_close` không còn điều khiển được nó.
- **Cách sửa / phòng tránh:** KHÔNG kill tiến trình khi chưa chắc là của mình (6.2). Chạy kịch bản bằng `playwright-core` trong cache npx (`%LOCALAPPDATA%
pm-cache_npx*
ode_modules`) với `chromium.launch({ executablePath: chrome.exe, headless: true })` (profile tạm riêng) và cổng dev riêng (backend 3100, frontend 5174 + `VITE_API_URL`). Đặt script ngoài repo; không in mật khẩu seed. Khi giao verify trình duyệt cho subagent, nói trước phương án dự phòng này.

---

## 7. Kiểm thử & dữ liệu test

### 7.1 User test còn sót trong DB thật
- **Triệu chứng:** test đăng ký/đăng nhập tạo dòng trong `public.profiles` (Supabase thật, không có DB test riêng).
- **Phòng tránh:** dùng email có tiền tố cố định `test.<mục đích>.<timestamp>@example.com`; sau mỗi đợt test xoá bằng `delete from public.profiles where email like 'test.%@example.com' returning email;` và xác nhận kết quả. KHÔNG xoá tài khoản `@tryon.dev`.

### 7.1b Object test còn sót trong Supabase Storage
- **Phòng tránh:** sau mỗi đợt test avatar, kiểm tra `select count(*) from storage.objects where bucket_id = 'avatars';` về 0 (xoá ảnh qua UI/API `DELETE /user/profile/avatar` rồi mới xoá user). Xoá user trước khi xoá object sẽ để lại object mồ côi.
- **Bucket cần kiểm tra (từ Sprint 3):** `avatars`, `products` và `try-on-results`. Kiểm tra gộp: `select bucket_id, count(*) from storage.objects where bucket_id in ('avatars','products','try-on-results') group by bucket_id;` phải rỗng sau test, và `select count(*) from public.try_on_results;` về 0. Ảnh kết quả thử đồ nằm ở `{profile_id}/{product_id}/{id}.{jpg|png|webp}`; xoá row `try_on_results` (hoặc user/sản phẩm gây cascade) KHÔNG xoá object: lấy `result_path` trước rồi xoá object bằng service role. Khi nhiều agent test song song, mỗi agent chỉ dọn dữ liệu CỦA MÌNH (tiền tố tên sản phẩm, user test riêng) và kiểm tra theo tiền tố/user thay vì đòi bảng global = 0.

### 7.2 Token cũ trong localStorage làm nhiễu test
- **Triệu chứng:** mở app có 2 lỗi console `401 /user/profile` trước khi làm gì.
- **Nguyên nhân:** token của user test đã bị xoá nằm lại trong `localStorage` (cùng origin); app kiểm tra phiên khi khởi động nhận 401, đúng thiết kế.
- **Phòng tránh:** đọc nguyên nhân trước khi coi là lỗi; xoá `tryon_token` giữa các đợt test nếu cần trạng thái sạch.

### 7.3 Hạn mức đăng nhập làm test dừng giữa chừng
- **Triệu chứng:** sau 10 lần sai liên tiếp mọi lần đăng nhập (kể cả đúng) bị 429 trong 15 phút.
- **Cách làm:** limiter lưu trong bộ nhớ nên khởi động lại backend để reset; test 429 để CUỐI hoặc chuẩn bị restart.

### 7.4 Kịch bản test auth tối thiểu cần chạy trên trình duyệt thật
Guest vào trang bảo vệ → `/login?redirect=`; đăng ký → `/login` có banner; đăng nhập sai (thông báo chung); đăng nhập đúng; reload giữ phiên; đăng xuất → `/`; Back sau đăng xuất; token giả khi khởi động; 401 giữa phiên (banner hết hạn, nhiều request song song chỉ xử lý một lần); đồng bộ nhiều tab; mất kết nối backend (màn lỗi + Thử lại); 429; responsive 375px.

---

## 8. Git & repo public

### 8.1 Commit đầu tiên gộp toàn bộ code vào `main`
- **Vấn đề:** quy trình dự án là mỗi chức năng một branch, chỉ merge vào `main` sau khi kiểm tra; commit đầu gom mọi thứ vào `main`.
- **Cách sửa (khi chưa push):** `main` chỉ giữ baseline (`.gitignore`, `README.md`, `PB.md`); code nằm ở `feature/US-01-auth`; merge `--no-ff` vào `main` sau khi test xong.
- **Phòng tránh:** `git init` xong thì tạo branch tính năng ngay; làm mỗi user story trên branch `feature/US-xx-<tên>`; push branch trước, merge `main` sau khi validate.

### 8.2 Checklist trước khi push repo public
1. `git diff --cached --name-only` không chứa `.env`, `.env.seed-accounts`, `.mcp.json`, `.playwright-mcp`, `settings.local.json`.
2. `grep` mật khẩu mẫu, `eyJ`, `sb_secret`, `sbp_`, project ref.
3. `.env.example` chỉ chứa giá trị mẫu.
4. Đặt danh tính git noreply (6.6).
5. Hỏi người dùng xác nhận trước khi push lên remote lần đầu.
