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

Code: `frontend/src/pages/LoginPage.jsx`, khung `AuthLayout`, `TextField`, validate `validateLoginForm` (`utils/authValidation.js`), API `loginAccount` (`services/authApi.js`), phiên qua `useAuth().login`. Flow: `design/flows/login.md`.

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

## Hồ sơ — `/profile`

Code: `frontend/src/pages/ProfilePage.jsx` (trong `RequireAuth` + `MainLayout`), component ở `components/profile/` (`ProfileForm`, `AvatarField`, `ConfirmDialog`), trạng thái/hành động ở `features/profile/useProfile.js`, dữ liệu qua `features/profile/profileApi.js` (nối API thật qua `services/userApi.js`). Validate: `utils/profileValidation.js`, `utils/avatarCheck.js`. Flow: `design/flows/profile.md`, `avatar-upload.md`.

### Mục đích
Xem và cập nhật hồ sơ (tên hiển thị, số điện thoại tuỳ chọn, chiều cao, cân nặng) và ảnh toàn thân dùng cho phòng thử đồ.

### Quyền truy cập
Đã đăng nhập (`RequireAuth`; khách bị chuyển `/login?redirect=/profile`). `document.title` = "Hồ sơ — Try-on".

### Các thành phần chính
1. **Tiêu đề** "Hồ sơ của tôi" + câu mô tả ngắn.
2. **Skeleton khi tải**: khung ảnh 3:4 + 4 ô nhập + nút (animate-pulse; `role="status"`, chữ ẩn "Đang tải hồ sơ…").
3. **Khối lỗi tải** (lỗi mạng/5xx): thẻ `role="alert"` "Không tải được hồ sơ" + message + nút **Thử lại** (gọi lại GET). Không hiện form rỗng.
4. **Banner** "Hoàn thiện hồ sơ để bắt đầu thử đồ" (`role="status"`, nền blush) khi chưa có chiều cao hoặc cân nặng; biến mất sau khi lưu đủ số đo.
5. **Khối ảnh toàn thân** (`AvatarField`): khung `aspect-[3/4]` `object-contain` (không méo/cắt), placeholder (icon người + "Chưa có ảnh toàn thân") khi chưa có ảnh hoặc ảnh lỗi; lớp phủ spinner "Đang tải ảnh lên…/Đang xoá ảnh…" khi bận. Nút:
   - **Chọn ảnh / Thay ảnh** (input file `accept="image/jpeg,image/png"`, trên mobile hệ điều hành cho chọn chụp trực tiếp).
   - **Xoá ảnh** (chỉ khi có ảnh đã lưu và chưa chọn ảnh mới) → hộp thoại xác nhận → `DELETE` ngay, độc lập nút Lưu.
   - **Bỏ ảnh đã chọn** (chỉ khi có ảnh mới chờ lưu): chỉ phía client.
   - Chú thích "Ảnh mới chưa được lưu. Bấm Lưu để cập nhật."
   - Hướng dẫn ảnh chuẩn: toàn thân, JPG/PNG ≤ 5MB, dọc 3:4 hoặc 9:16, cạnh ngắn ≥ 720px.
6. **Kiểm tra ảnh phía client** (`avatarCheck.js`): loại file (jpg/jpeg/png) và dung lượng ≤ 5MB là **lỗi chặn** ("Chỉ hỗ trợ ảnh JPG hoặc PNG." / "Ảnh vượt quá 5MB…"), ảnh không đọc được cũng chặn; ảnh không dọc / lệch tỉ lệ > ±0.05 so với 3:4 hoặc 9:16 / cạnh ngắn < 720px chỉ **cảnh báo** (`role="alert"`, nền amber) kèm hướng dẫn chụp và 2 nút "Chọn ảnh khác" / "Vẫn dùng ảnh này" (chưa bấm thì ảnh chưa được tính là ảnh chờ lưu).
7. **Form** (thẻ trắng `rounded-3xl`): Email (chỉ đọc, nền sand, gợi ý không thể đổi), Tên hiển thị, Số điện thoại (không bắt buộc, `type="tel"`), Chiều cao (cm) và Cân nặng (kg) (`inputMode="decimal"`, chấp nhận dấu phẩy `50,5`, làm tròn 1 chữ số thập phân). Quy tắc khớp server: tên ≤ 50 ký tự; SĐT chuẩn hoá VN 10 số; cao 100–250; nặng 30–250; ô số rỗng → "Vui lòng nhập chiều cao/cân nặng.". Lỗi hiện dưới từng ô (`aria-invalid`, `aria-describedby`), submit lỗi thì focus ô lỗi đầu tiên; sửa ô nào thì lỗi ô đó biến mất. Lỗi `fields` của server (400) map vào đúng ô.
8. **Nút Lưu**: disabled khi không có thay đổi (text không đổi và không có ảnh chờ lưu) hoặc đang lưu/đang tải ảnh; khi lưu hiện "Đang lưu…", ô nhập chuyển readOnly (chặn submit lặp).
9. **Toast** (`ToastProvider`): "Đã lưu hồ sơ." (PUT ok, có/không ảnh ok), "Đã cập nhật ảnh." (chỉ ảnh), "Đã xoá ảnh.", lỗi một phần "Đã lưu thông tin, nhưng chưa tải được ảnh: {message}" (nếu text không đổi: "Chưa tải được ảnh: {message}"), lỗi PUT 5xx/mạng → toast message lỗi và giữ dữ liệu đã nhập. Lỗi tải ảnh còn hiện dưới khung ảnh; lỗi 429/5xx/mạng kèm nút **Thử lại tải ảnh** (giữ file đã chọn, chỉ gọi lại PUT avatar); 400/413/415 chỉ hiện message để chọn ảnh khác.
10. **Hộp thoại xác nhận xoá** (`ConfirmDialog`, `<dialog>` gốc + `showModal`): tiêu đề "Xoá ảnh toàn thân?", mô tả "Bạn cần tải ảnh mới để dùng tính năng thử đồ.", nút "Huỷ" (focus ban đầu) và "Xoá ảnh" (accent-dark). Focus trap và nền inert do trình duyệt xử lý, Esc/bấm nền đóng (bị chặn khi đang xoá), trả focus về nút "Xoá ảnh", `aria-labelledby`/`aria-describedby`.

### Trạng thái ảnh / signed URL
`<img onError>` (URL hết hạn sau 1 giờ): gọi lại GET **một lần** để lấy URL mới; vẫn lỗi thì hiện placeholder ("Không tải được ảnh. Bạn có thể chọn ảnh khác."). `URL.createObjectURL` của ảnh chờ lưu được `revokeObjectURL` khi đổi ảnh, bỏ ảnh, upload xong và khi rời trang (unmount, kể cả đăng xuất).

### Responsive
- Mobile (< 640px): một cột; ảnh (tối đa 16rem, căn giữa) rồi tới thẻ form; hai ô chiều cao/cân nặng xếp dọc; nút Lưu full width, nút ảnh xếp dọc; không tràn ngang ở 375px.
- Tablet (640–1024px): hai ô số cạnh nhau; từ `md` (768px) bố cục hai cột: ảnh trái (16rem), form phải.
- Desktop (> 1024px): cột ảnh 18rem, khoảng cách lớn hơn; container `max-w-5xl` của `MainLayout`.

### Navigation
- Đến từ: `/login` (sau đăng nhập), `AccountMenu` (Hồ sơ của tôi), `RequireAuth`.
- Đi tới: Đăng xuất và các mục khác qua header (`AccountMenu`). Trang không có nút Đăng xuất riêng.

### Ghi chú
- Đã nối API thật (Task 7): `profileApi.js` re-export `fetchProfile/updateProfile/uploadAvatar/deleteAvatar` từ `services/userApi.js`, mỗi hàm trả `{ profile }`; không còn mock.
- Sau khi lưu text thành công, `ProfileForm` gọi `updateUser({ displayName })` (AuthProvider) một lần để `AccountMenu` hiện tên mới; không điều hướng.
- 401 ở bất kỳ bước nào do `apiClient` xử lý chung (về `/login`), trang không tự điều hướng.
- A11y: label gắn `htmlFor`, lỗi trường qua `aria-describedby`, banner/skeleton `role="status"`, lỗi `role="alert"`, vùng chạm ≥ 44px, trạng thái không chỉ dựa vào màu.

---

## Nút Đăng xuất ở header (khi đã đăng nhập)

Code: `frontend/src/components/AccountMenu.jsx`; gắn vào `MainLayout` và `components/landing/LandingHeader.jsx`. Ẩn hoàn toàn khi `user = null`.

- **Desktop/tablet (từ 768px):** ở góc phải header, nút pill viền gồm avatar chữ cái đầu (nền accent) + tên (hoặc email, rút gọn). Bấm mở panel dropdown (pattern disclosure: `aria-expanded`, `aria-controls`): dòng email, link "Hồ sơ của tôi" (`/profile`), nút "Đăng xuất" (màu accent-dark). Đóng bằng Esc (trả focus về nút), bấm ra ngoài hoặc chọn mục.
- **Mobile (< 768px):** ở `LandingHeader`, khối `AccountMenu inline` nằm trong menu hamburger thay cho hai nút auth: "Đăng nhập với {email}", Hồ sơ của tôi, Đăng xuất (hàng cao >= 44px); bấm mục nào cũng đóng menu. Ở `MainLayout` (header chỉ logo) nút pill luôn hiện bên phải.
- Landing khi đã đăng nhập: không hiện Đăng nhập/Đăng ký.
- Props: `user` ({ email, displayName }), `onLogout`, `inline`, `onNavigate`. Đã nối `useAuth()` ở `MainLayout` và `LandingPage`. Tên hiển thị sau khi lưu hồ sơ chưa tự cập nhật (TODO ở `ProfileForm.jsx`).
