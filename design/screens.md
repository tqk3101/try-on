# Screen Descriptions

Tài liệu gốc cho các màn hình. Các sprint sau cập nhật/ bổ sung vào đây, không tạo bản song song. Design token: xem `design/design-system.md`.

---

## Landing page — `/`

Code: `frontend/src/pages/LandingPage.jsx`, `frontend/src/components/landing/*`, nội dung mock: `frontend/src/mocks/landingContent.js`.

### Mục đích
Giới thiệu Try-on và dẫn khách vào đăng ký/đăng nhập. Truyền tải ngay giá trị: thấy chính mình mặc sản phẩm trước khi mua.

### Quyền truy cập
Public.

### Các thành phần chính
1. **Skip link** ("Bỏ qua tới nội dung chính")
   - Ẩn thị giác, hiện khi focus bàn phím; nhảy tới `#main`.
2. **Header** (`LandingHeader`) — sticky, nền canvas mờ + blur
   - Logo "Try-on" (link `/`).
   - Nav anchor: Tính năng `#features`, Cách hoạt động `#how-it-works`, Danh mục `#categories` (cuộn mượt, `scroll-mt-16` để không bị header che).
   - Nút "Đăng nhập" (outline) và "Đăng ký" (primary).
   - Mobile: nút hamburger (`aria-expanded`, `aria-controls="mobile-menu"`, `aria-label` đổi Mở/Đóng menu); panel xổ xuống chứa nav + 2 nút auth; đóng khi bấm link hoặc nhấn Esc.
   - Trạng thái: default / hover (đổi màu chữ) / focus-visible / menu mở-đóng.
3. **Hero**
   - Eyebrow "Virtual try-on · GenAI"; H1 "Mặc thử trước, *mua sau.*"; mô tả 2 câu; CTA chính "Bắt đầu thử đồ" (đăng ký) + CTA phụ "Xem cách hoạt động" (`#how-it-works`).
   - Hình minh hoạ (`HeroVisual`, SVG/CSS thuần): khung 3:4 người mẫu cách điệu mặc váy, nhãn "Váy lụa · 1/12", 2 mũi tên trái/phải, thanh "Thêm vào giỏ 890.000đ", 2 thẻ flat lay nổi (Áo thun, Quần jeans). Chỉ trang trí, `role="img"` + `aria-label`.
   - Hiệu ứng: `animate-rise` khi vào trang (hình trễ 150ms); thẻ nổi `animate-float`.
4. **Features** (`#features`) — 4 card: Thử đồ bằng chính bạn, Vuốt để đổi sản phẩm, Chọn theo danh mục, Thêm vào giỏ ngay (bám US-01..US-07). Hover: card nhích lên + bóng, icon đổi nền accent.
5. **Cách hoạt động** (`#how-it-works`) — danh sách có thứ tự 3 bước (Tạo hồ sơ, Chọn danh mục, Vuốt & chọn mua) với số lớn trang trí (`aria-hidden`), tiêu đề có "Bước N:" cho trình đọc màn hình.
6. **Danh mục** (`#categories`) — 3 thẻ gradient: Áo thun, Váy, Quần jeans (mock, chỉ minh hoạ, chưa liên kết).
7. **CTA band** — khối gradient accent, tiêu đề "Sẵn sàng thấy mình trong outfit mới?", nút "Tạo hồ sơ miễn phí" (variant light).
8. **Footer** — logo, tagline, link anchor, "© {năm} Try-on. Bảo lưu mọi quyền."

### Responsive
- Mobile (< 640px): hero 1 cột, căn giữa, 2 CTA xếp dọc full width; hình minh hoạ dưới chữ; features 1 cột; bước 1 cột; danh mục 1 cột (4:3); header chỉ logo + hamburger.
- Tablet (640–1024px): features 2 cột; danh mục 3 cột (3:4); CTA ngang. Từ 768px header hiện nav + nút auth, ẩn hamburger.
- Desktop (> 1024px): hero 2 cột (chữ trái, hình phải, thẻ nổi tràn ra ngoài khung); features 4 cột; bước 3 cột căn trái.
- Đã kiểm tra 360 / 768 / 1280px không tràn ngang.

### Navigation
- Đến màn hình này từ: truy cập trực tiếp `/`, logo ở mọi trang.
- Từ màn hình này đến: `/register`, `/login`; các section cùng trang qua anchor.

### Ghi chú
- **Đăng ký và Đăng nhập:** `/register` (Task 5) và `/login` (Task 6) đã có thiết kế. `AuthLink` đọc `AUTH_ROUTES_READY` trong `frontend/src/routes/paths.js` (cả hai đã `true`, nút "Đăng nhập" là link thật; trang nào chưa có route thì hiển thị nút `aria-disabled` "Sắp ra mắt"). `LandingPage` lấy `user`/`logout` từ `useAuth()`.
- **Header khi đã đăng nhập:** `LandingHeader` nhận `user`/`onLogout`; có `user` thì thay hai nút Đăng nhập/Đăng ký bằng `AccountMenu` (xem mục "Nút Đăng xuất ở header" bên dưới). CTA hero đổi thành "Thử ngay" cho user đã đăng nhập: để sprint sau.
- Trang 404 (`*`) dùng `MainLayout` (header tối giản); landing tự có header/footer.
- Nội dung là mock tĩnh; không gọi API. Badge health cũ của placeholder đã bỏ khỏi UI (giữ `services/healthApi.js`).
- Hình minh hoạ không dùng ảnh ngoài; khi có ảnh thật sẽ thay trong `HeroVisual` (giữ tỉ lệ 3:4, thêm `alt`).
- `prefers-reduced-motion` tắt animation và smooth scroll.

---

## Đăng ký — `/register`

Code: `frontend/src/pages/RegisterPage.jsx`, khung `components/AuthLayout.jsx`, `components/TextField.jsx`, `components/PasswordStrength.jsx`, validate `utils/authValidation.js`, API `services/authApi.js`. Flow: `design/flows/register.md`.

### Mục đích
Khách tạo tài khoản bằng email + mật khẩu. Thành công **không** tự đăng nhập: chuyển `/login` kèm thông báo và email điền sẵn (README flows D3).

### Quyền truy cập
Chỉ khách (guest-only). Người đã đăng nhập bị `GuestOnly` chuyển sang `/profile` (Task 6, do agent-coder nối cùng AuthProvider).

### Các thành phần chính
1. **Khung `AuthLayout`**: nền canvas, header chỉ có logo, thẻ trắng `rounded-3xl shadow-card` rộng tối đa `max-w-md` ở giữa; skip link tới `#main`.
2. **Tiêu đề** "Tạo tài khoản" (Playfair) + mô tả một câu.
3. **Form** (`noValidate`, validate bằng JS cùng quy tắc với backend):
   - Email (`type=email`, `autoComplete=email`, không viết hoa/sửa chính tả tự động).
   - Mật khẩu (`autoComplete=new-password`, nút Hiện/Ẩn `aria-pressed`) + `PasswordStrength`: thanh 4 đoạn, nhãn Yếu / Trung bình / Khá / Mạnh, danh sách 4 điều kiện bắt buộc (✓/○ kèm chữ "đạt/chưa đạt" cho trình đọc màn hình), gợi ý thêm ký tự đặc biệt.
   - Xác nhận mật khẩu (có nút Hiện/Ẩn).
   - Nút "Đăng ký" (primary, full width, `min-h-12`); khi đang gửi: disabled, nhãn "Đang tạo tài khoản…", các ô bị khoá.
4. **Liên kết** "Đã có tài khoản? Đăng nhập" (chữ gạch chân; hiển thị chữ thường không bấm được tới khi `AUTH_ROUTES_READY.login = true`).

### Trạng thái
- Lỗi trường: viền đỏ, message đỏ dưới ô (`aria-invalid`, `aria-describedby`); báo khi rời ô (nếu đã nhập) hoặc khi bấm Đăng ký; sửa ô nào thì xoá lỗi ô đó; focus ô lỗi đầu tiên.
- `EMAIL_EXISTS` (409): lỗi dưới ô email "Email này đã được đăng ký." kèm liên kết Đăng nhập.
- `VALIDATION_ERROR`: map `error.fields` vào từng ô.
- Lỗi chung (429, 500, mạng): khung `role="alert"` nền đỏ nhạt phía trên form; dữ liệu đã nhập được giữ.
- Thành công: `navigate('/login', { replace, state: { registered: true, email } })`, giữ `?redirect=` nếu hợp lệ (`routes/safeRedirect.js`).

### Responsive
Một cột ở mọi cỡ: thẻ `w-full max-w-md`, padding `p-6` (mobile) / `p-8` (từ `sm`); danh sách điều kiện mật khẩu 1 cột (mobile) / 2 cột (từ `sm`).

### Ghi chú
- Sau khi đăng ký thành công chuyển tới `/login` (màn bên dưới). `/register` bọc `GuestOnly`.
- Link "Đăng nhập" ở màn này giữ `?redirect=` hợp lệ (`AuthLink` nhận prop `redirect`).

---

## Đăng nhập — `/login`

Code: `frontend/src/pages/LoginPage.jsx`, khung `AuthLayout`, `TextField`, validate `validateLoginForm` (`utils/authValidation.js`), API `loginAccount` (`services/authApi.js`), mock `mocks/authMock.js`. Flow: `design/flows/login.md`.

### Mục đích
Khách đăng nhập bằng email + mật khẩu; thành công chuyển tới `redirect` hợp lệ hoặc `/profile`.

### Quyền truy cập
Chỉ khách (`GuestOnly`): người đã đăng nhập được chuyển tới `safeRedirect(redirect)` hoặc `/profile`.

### Các thành phần chính
1. **Khung `AuthLayout`** giống `/register` (thẻ `max-w-md`, skip link, header chỉ có logo).
2. **Tiêu đề** "Đăng nhập" (Playfair) + mô tả "Chào mừng bạn quay lại với Try-on.".
3. **Banner thông tin** (đặt giữa mô tả và form, `role="status"`):
   - `registered` (router state `{ registered: true, email }` từ `/register`): nền xanh lá nhạt "Đăng ký thành công. Vui lòng đăng nhập."; ô Email điền sẵn `state.email`; **focus ô Mật khẩu** khi mở trang. State bị xoá ngay (`navigate(..., { replace, state: null })`) nên reload/Back không hiện lại; banner vẫn hiển thị trong lần mở này.
   - `?reason=expired`: nền sand viền gold "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." (không hiện nếu đã có banner `registered`).
4. **Form** (`noValidate`):
   - Email (`type=email`, `autoComplete=email`).
   - Mật khẩu (`autoComplete=current-password`, nút Hiện/Ẩn `aria-pressed`). **Không** hiện thanh độ mạnh và không áp quy tắc độ mạnh (chỉ bắt buộc nhập).
   - Nút "Đăng nhập" (primary, full width, `min-h-12`); đang gửi: disabled, nhãn "Đang đăng nhập…", các ô bị khoá.
5. **Liên kết** "Chưa có tài khoản? Đăng ký" -> `/register`, giữ `?redirect=` nếu hợp lệ (đã qua `safeRedirect`).

### Trạng thái
- Lỗi trường (client): "Vui lòng nhập email." / "Email không đúng định dạng." / "Vui lòng nhập mật khẩu."; viền đỏ + message dưới ô (`aria-invalid`, `aria-describedby`); email kiểm tra khi rời ô (nếu đã nhập) hoặc khi bấm Đăng nhập; sửa ô nào xoá lỗi ô đó; focus ô lỗi đầu tiên.
- `INVALID_CREDENTIALS` (401): khung đỏ nhạt `role="alert"` trên form "Email hoặc mật khẩu không đúng."; **xoá ô mật khẩu, giữ email, focus lại ô mật khẩu**. Không chỉ ra email hay mật khẩu sai.
- `VALIDATION_ERROR`: map `error.fields` vào từng ô.
- Lỗi chung (429, 500, mạng): khung đỏ nhạt `role="alert"` với `error.message`; dữ liệu giữ nguyên, nút bật lại.
- Thành công: `navigate(safeRedirect(redirect) ?? '/profile', { replace: true })`.

### Responsive
Một cột ở mọi cỡ như `/register`: `w-full max-w-md`, padding `p-6` (mobile) / `p-8` (từ `sm`); vùng chạm >= 44px (ô và nút `min-h-12`).

### Navigation
- Đến từ: Landing (nút Đăng nhập), `/register` (sau khi đăng ký thành công), `RequireAuth` (`?redirect=<path>`, thêm `&reason=expired` khi token hết hạn).
- Đi tới: `/profile` hoặc `redirect`; `/register`.

### Ghi chú
- Đã nối thật: `LoginPage` gọi `useAuth().login()` (`auth/AuthProvider.jsx`), mock đã xoá. Điều hướng sau đăng nhập do `GuestOnly` làm (một nơi duy nhất). 401 `INVALID_CREDENTIALS` hiện thông báo chung; request đăng nhập/đăng ký không gửi token cũ nên không kích hoạt luồng hết hạn.
- A11y: label gắn `htmlFor`, lỗi trường qua `aria-describedby`, lỗi chung `role="alert"`, banner `role="status"`, focus ring accent mặc định.

---

## Hồ sơ — `/profile` (placeholder Task 6)

Code: `frontend/src/pages/ProfilePage.jsx` (trong `MainLayout`). **Toàn bộ nội dung chỉ là placeholder; Task 7 thay bằng form hồ sơ đầy đủ** (tên, số đo, phone, avatar).

### Mục đích
Có một route được bảo vệ thật để kiểm thử đăng nhập/đăng xuất.

### Quyền truy cập
Đã đăng nhập (`RequireAuth`; khách bị chuyển `/login?redirect=/profile`).

### Các thành phần chính
1. **Tiêu đề** "Hồ sơ của tôi" + câu "Chào mừng bạn quay lại. Tính năng chỉnh sửa hồ sơ sẽ sớm có mặt." (placeholder).
2. **Thẻ thông tin** (`dl`): Tên hiển thị (hoặc "Chưa đặt tên"), Email. Dữ liệu từ `GET /api/user/profile`.
3. **Nút "Đăng xuất"** (outline, `min-h-12`; full width trên mobile, tự co từ `sm`): gọi `logout()`, không hỏi xác nhận.

### Responsive
Nội dung `max-w-xl` căn giữa trong `MainLayout`; thẻ `p-6`/`sm:p-8`.

### Ghi chú
- Sau đăng xuất: về `/`, toast "Bạn đã đăng xuất." (`components/ToastProvider.jsx`, `useToast`). Dữ liệu hồ sơ lấy từ `GET /api/user/profile` qua `AuthProvider`.

---

## Nút Đăng xuất ở header (khi đã đăng nhập)

Code: `frontend/src/components/AccountMenu.jsx`; gắn vào `MainLayout` và `components/landing/LandingHeader.jsx`. Ẩn hoàn toàn khi `user = null`.

- **Desktop/tablet (từ 768px):** ở góc phải header, nút pill viền gồm avatar chữ cái đầu (nền accent) + tên (hoặc email, rút gọn). Bấm mở panel dropdown (pattern disclosure: `aria-expanded`, `aria-controls`): dòng email, link "Hồ sơ của tôi" (`/profile`), nút "Đăng xuất" (màu accent-dark). Đóng bằng Esc (trả focus về nút), bấm ra ngoài hoặc chọn mục.
- **Mobile (< 768px):** ở `LandingHeader`, khối `AccountMenu inline` nằm trong menu hamburger thay cho hai nút auth: "Đăng nhập với {email}", Hồ sơ của tôi, Đăng xuất (hàng cao >= 44px); bấm mục nào cũng đóng menu. Ở `MainLayout` (header chỉ logo) nút pill luôn hiện bên phải.
- Landing khi đã đăng nhập: không hiện Đăng nhập/Đăng ký.
- Props: `user` ({ email, displayName }), `onLogout`, `inline`, `onNavigate`. Trạng thái nối: `MainLayout` và `LandingHeader` hiện nhận/để `user = null` (chưa nối AuthProvider).
