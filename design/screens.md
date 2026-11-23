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
- **Header khi đã đăng nhập:** `LandingHeader` nhận `user`/`onLogout`; có `user` thì thay hai nút Đăng nhập/Đăng ký bằng `AccountMenu` (xem mục "Nút Đăng xuất ở header" bên dưới). Khi đã đăng nhập (Sprint 3 Task 2): CTA hero và nút của CTA band đổi thành "Thử ngay" (link `/try-on`), header desktop có thêm link "Phòng thử đồ" cạnh `AccountMenu`; thẻ danh mục (mock, không dùng id thật) là link tới trang chọn danh mục `/try-on` cho cả khách lẫn user (khách bị `RequireAuth` đưa về `/login?redirect=%2Ftry-on`); mỗi thẻ có `aria-label` "<tên>: vào phòng thử đồ", hover nâng nhẹ, focus-visible outline accent (Sprint 3 Task 7).
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
Chỉ khách (guest-only). Người đã đăng nhập bị `GuestOnly` chuyển sang `/try-on` (Q19; Task 6, do agent-coder nối cùng AuthProvider).

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
Khách đăng nhập bằng email + mật khẩu; thành công chuyển tới `redirect` hợp lệ hoặc `/try-on` (Q19).

### Quyền truy cập
Chỉ khách (`GuestOnly`): người đã đăng nhập được chuyển tới `safeRedirect(redirect)` hoặc `/try-on`.

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
- Thành công: `navigate(safeRedirect(redirect) ?? '/try-on', { replace: true })`.

### Responsive
Một cột ở mọi cỡ như `/register`: `w-full max-w-md`, padding `p-6` (mobile) / `p-8` (từ `sm`); vùng chạm >= 44px (ô và nút `min-h-12`).

### Navigation
- Đến từ: Landing (nút Đăng nhập), `/register` (sau khi đăng ký thành công), `RequireAuth` (`?redirect=<path>`, thêm `&reason=expired` khi token hết hạn).
- Đi tới: `redirect` hoặc `/try-on` (mặc định); `/register`.

### Ghi chú
- Đã nối thật: `LoginPage` gọi `useAuth().login()` (`auth/AuthProvider.jsx`), mock đã xoá. Điều hướng sau đăng nhập do `GuestOnly` làm (một nơi duy nhất). 401 `INVALID_CREDENTIALS` hiện thông báo chung; request đăng nhập/đăng ký không gửi token cũ nên không kích hoạt luồng hết hạn.
- A11y: label gắn `htmlFor`, lỗi trường qua `aria-describedby`, lỗi chung `role="alert"`, banner `role="status"`, focus ring accent mặc định.

---

## Hồ sơ — `/profile`

Code: `frontend/src/pages/ProfilePage.jsx` (trong `RequireAuth` + `MainLayout`), component ở `components/profile/` (`ProfileForm`, `AvatarField`) và `ConfirmDialog` dùng chung ở `components/ConfirmDialog.jsx`, trạng thái/hành động ở `features/profile/useProfile.js`, dữ liệu qua `features/profile/profileApi.js` (nối API thật qua `services/userApi.js`). Validate: `utils/profileValidation.js`, `utils/avatarCheck.js`. Flow: `design/flows/profile.md`, `avatar-upload.md`.

### Mục đích
Xem và cập nhật hồ sơ (tên hiển thị, số điện thoại tuỳ chọn, chiều cao, cân nặng) và ảnh toàn thân dùng cho phòng thử đồ.

### Quyền truy cập
Đã đăng nhập (`RequireAuth`; khách bị chuyển `/login?redirect=/profile`). `document.title` = "Hồ sơ — Try-on".

### Các thành phần chính
1. **Tiêu đề** "Hồ sơ của tôi" + câu mô tả ngắn.
2. **Skeleton khi tải**: khung ảnh 3:4 + 4 ô nhập + nút (animate-pulse; `role="status"`, chữ ẩn "Đang tải hồ sơ…").
3. **Khối lỗi tải** (lỗi mạng/5xx): thẻ `role="alert"` "Không tải được hồ sơ" + message + nút **Thử lại** (gọi lại GET). Không hiện form rỗng.
4. **Banner** "Hoàn thiện hồ sơ để bắt đầu thử đồ" (`role="status"`, nền blush) khi hồ sơ chưa đủ để thử đồ (thiếu ảnh toàn thân, chiều cao hoặc cân nặng – Q13). Khi hồ sơ đủ, banner được thay bằng khối "Hồ sơ đã sẵn sàng để thử đồ" kèm nút/link **"Vào phòng thử đồ"** -> `/try-on` (Sprint 3 Task 2).
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
- Đến từ: `AccountMenu` (Hồ sơ của tôi), `RequireAuth`; `/login` chỉ khi `?redirect=/profile` (đích mặc định sau đăng nhập là `/try-on`, Q19).
- Đi tới: `/try-on` (link "Vào phòng thử đồ" khi hồ sơ đủ); Đăng xuất và các mục khác qua header (`AccountMenu`). Trang không có nút Đăng xuất riêng. Đến từ thêm: màn "Hoàn thiện hồ sơ để thử đồ" ở phòng thử đồ.

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
- Props: `user` ({ email, displayName }), `onLogout`, `inline`, `onNavigate`. Đã nối `useAuth()` ở `MainLayout` và `LandingPage`. Từ Sprint 4 menu có thêm mục **"Giỏ hàng"** (`/cart`, kèm badge số lượng) ngay sau "Phòng thử đồ", và `MainLayout`/`LandingHeader` có icon `CartLink` (xem phần Giỏ hàng & Đặt hàng). Menu có thêm mục **"Phòng thử đồ"** (`/try-on`, đứng đầu, hiện ở cả dropdown desktop và dạng inline mobile); `MainLayout` còn có link "Phòng thử đồ" (NavLink, `accent` khi đang ở `/try-on*`) cạnh `AccountMenu` từ 640px (dưới 640px chỉ còn trong menu để header không chật ở 375px).

---

# Khu vực Admin (Sprint 2)

Bám `design/flows/category-management.md` (mục 6), `product-management.md` (mục 9), route ở `design/flows/README.md` mục 5 (**không đổi route nào**). Trạng thái code: `AdminLayout`, `RequireAdmin`, `ForbiddenPage` đã có (Task 3); các trang danh sách/form dưới đây thay `AdminPlaceholderPage` ở Task 4–6. Thành phần dùng chung mới (`DataTable`, `Badge`, `EmptyState`, `ErrorState`, `PriceField`, `FormDialog`...) ghi ở mục "Thành phần admin dùng chung" của `design/design-system.md`.

**Quy ước chung cho các màn admin**
- Quyền: chỉ `role = admin` (`RequireAuth` -> `RequireAdmin`). Guest -> `/login?redirect=<path>`; user thường -> `ForbiddenPage` (không render layout admin). API trả 403 giữa phiên (bị hạ quyền) -> thay nội dung trang bằng `ForbiddenPage`.
- Thứ bậc heading: `h1` "Quản trị" (AdminLayout), mỗi trang là `h2` (`font-display`).
- `document.title` (hook `useDocumentTitle`, Sprint 2 Task 8): "Quản lý danh mục — Try-on", "Quản lý sản phẩm — Try-on", "Thêm sản phẩm — Try-on", "Sửa sản phẩm — Try-on", "Không có quyền truy cập — Try-on".
- Message lỗi từ server hiển thị nguyên văn `error.message` (tiếng Việt); rẽ nhánh theo `error.code`. 401 do `apiClient` xử lý chung (về `/login?redirect=…&reason=expired`), trang không tự điều hướng.
- Không cập nhật lạc quan: chỉ đổi giao diện khi server trả thành công. Nút gửi `disabled` khi đang gửi để chặn gửi lặp.
- Toast dùng `ToastProvider`; thông báo lỗi dùng `tone: 'error'` (cần mở rộng, xem design-system).

---

## Admin layout — `/admin` (chuyển `/admin/categories`)

Code: `components/admin/AdminLayout.jsx` (nằm trong `MainLayout`, bọc bởi `RequireAdmin`).

### Mục đích
Khung chung cho các trang quản trị: tiêu đề và menu chuyển giữa Danh mục / Sản phẩm.

### Quyền truy cập
Admin. `/admin` (index) `Navigate replace` tới `/admin/categories`.

### Các thành phần chính
1. **Tiêu đề** `h1` "Quản trị".
   - Trạng thái: tĩnh.
2. **Menu quản trị** `<nav aria-label="Menu quản trị">`: 3 mục dạng pill "Danh mục", "Sản phẩm", "Đơn hàng" (`NavLink`; Sprint 4 thêm "Đơn hàng" -> `/admin/orders`, active cả ở `/admin/orders/:id`).
   - Tương tác: bấm/Enter chuyển trang. Mục đang chọn: nền `accent`, chữ trắng, `aria-current="page"` (NavLink tự gắn). "Sản phẩm" cũng active ở `/admin/products/new` và `/admin/products/:id/edit`.
   - Trạng thái: default / hover (`bg-ink/5`) / focus-visible (outline 2px accent toàn cục) / active. Vùng chạm `min-h-11`.
   - Hiệu ứng: `transition-colors`.
3. **Vùng nội dung** (`Outlet`) cách menu 24px, trong container `max-w-5xl` của `MainLayout`.
4. **Link "Quản trị"** trong `AccountMenu` (chỉ khi `role = admin`) dẫn tới `/admin`.

### Quyết định thiết kế
- **Không dùng sidebar**: chỉ 3 mục (Sprint 4 thêm "Đơn hàng") nên menu ngang (tab pill) vẫn gọn, không tốn chiều ngang trên tablet/mobile, giữ bố cục một cột của `MainLayout`.

### Responsive
- Mobile (< 640px): menu một hàng, `overflow-x-auto` nếu hẹp (3 mục vừa ở 375px); không tràn ngang trang.
- Tablet (640–1024px) và Desktop (> 1024px): menu căn trái, đường kẻ `border-b border-line` bên dưới.

### Navigation
- Đến màn hình này từ: `AccountMenu` (Quản trị), URL trực tiếp, `/login?redirect=/admin…`.
- Từ màn hình này đến: `/admin/categories`, `/admin/products`, `/admin/orders`.

### Ghi chú
- A11y: landmark `nav` có nhãn; thứ tự Tab: menu -> nội dung. `/admin/xyz` không tồn tại -> 404 chung (`*`).

---

## Quản lý danh mục — `/admin/categories`

Code dự kiến: `pages/admin/AdminCategoriesPage.jsx`, `components/admin/CategoryFormDialog.jsx`, API qua `services/adminApi.js`. Flow: `category-management.md`. Story: `sprints/US-03.md`.

### Mục đích
Xem danh sách danh mục (kèm số sản phẩm), thêm, đổi tên, xoá danh mục.

### Quyền truy cập
Admin.

### Các thành phần chính
1. **Thanh tiêu đề trang**: `h2` "Danh mục", mô tả "Quản lý các danh mục quần áo hiển thị trong phòng thử đồ.", nút **"Thêm danh mục"** (primary, icon dấu cộng, `min-h-11`).
   - Tương tác: mở hộp thoại thêm. Trạng thái: default / hover / focus / disabled (khi đang tải danh sách).
   - Mobile: nút full width dưới mô tả; từ `sm` nằm bên phải cùng hàng.
2. **Danh sách danh mục** (`DataTable`), thứ tự theo server (`created_at asc`):
   - Cột: **Tên** (đậm), **Đường dẫn (slug)** (`muted`, font mono nhỏ), **Sản phẩm** (badge), **Ngày tạo** (`dd/MM/yyyy`, `vi-VN`), **Thao tác** (Sửa, Xoá).
   - Badge: `0` -> "0 sản phẩm" nền `sand` chữ `ink-soft`; `N > 0` -> "N sản phẩm" nền `blush` chữ `accent-dark`, là **link** tới `/admin/products?categoryId=<id>`.
   - Nút hàng "Sửa" / "Xoá": icon + chữ (chữ ẩn trên mobile rất hẹp, luôn có `aria-label` đầy đủ: "Sửa danh mục Váy", "Xoá danh mục Váy"), `min-h-11 min-w-11`.
3. **Hộp thoại Thêm / Sửa** (`CategoryFormDialog` dựa trên `FormDialog`, `<dialog>` gốc `showModal`, cùng kiểu `ConfirmDialog`: `max-w-md rounded-3xl`, `backdrop:bg-ink/50`):
   - Tiêu đề "Thêm danh mục" / "Sửa danh mục"; ô **Tên danh mục** (`TextField`, autofocus, `autoComplete="off"`; khi sửa điền sẵn). Hint: "Tối đa 50 ký tự. Không phân biệt chữ hoa, chữ thường."
   - Nút "Huỷ" (outline) và "Lưu" (primary). Khi gửi: "Đang lưu…", nút và ô khoá; Esc/bấm nền bị chặn.
   - Enter trong ô = Lưu; Esc = Huỷ; bấm nhiều lần chỉ gửi 1 request. Sửa mà tên (sau chuẩn hoá) không đổi: đóng hộp thoại, không gọi API.
   - Hiệu ứng: dialog fade/scale nhẹ (`opacity`/`transform`, 150ms), tắt khi `prefers-reduced-motion`.
4. **Hộp thoại xác nhận xoá** (tái dùng `ConfirmDialog`):
   - `productCount = 0`: tiêu đề "Xoá danh mục?"; mô tả "Xoá danh mục “{tên}”? Thao tác này không thể hoàn tác."; nút "Huỷ" (focus ban đầu) và "Xoá danh mục" (nguy hiểm, `accent-dark`); khi gửi "Đang xoá…".
   - `productCount > 0` (chặn phía client theo flow): tiêu đề "Không thể xoá danh mục"; mô tả "Danh mục “{tên}” còn {N} sản phẩm. Hãy xoá hoặc chuyển các sản phẩm sang danh mục khác trước khi xoá."; nút "Đóng" (focus ban đầu) và **"Xem sản phẩm"** (primary, điều hướng `/admin/products?categoryId=<id>`). Cần `ConfirmDialog` nhận `confirmTone="primary"`.

- **Ghi chú (Q8):** danh mục chưa có sản phẩm (`productCount = 0`) vẫn hiện ở trang admin nhưng **chưa hiện phía người mua** (`GET /api/categories` ẩn danh mục rỗng); thêm sản phẩm đầu tiên thì danh mục mới xuất hiện.
- **Tiêu đề tab:** mọi route đặt `document.title` bằng hook `useDocumentTitle` theo định dạng "<Tên trang> — Try-on" (landing: "Thử đồ ảo bằng AI — Try-on").

### Trạng thái
- **Đang tải**: skeleton 4 hàng (`animate-pulse`), `role="status"` + chữ ẩn "Đang tải danh mục…"; nút "Thêm danh mục" `disabled`.
- **Rỗng** (`EmptyState`): icon, "Chưa có danh mục nào", "Tạo danh mục đầu tiên để bắt đầu thêm sản phẩm.", nút "Thêm danh mục".
- **Lỗi tải** (500/`NETWORK_ERROR`, `ErrorState` `role="alert"`): "Không tải được danh mục", `error.message`, nút **Thử lại**. Không hiện bảng rỗng.
- **403**: thay cả trang bằng `ForbiddenPage`.
- **Thành công**: đóng hộp thoại, cập nhật/thêm dòng (dòng mới ở cuối, nền `blush` mờ dần ~1.5s; bỏ hiệu ứng khi reduced-motion), toast "Đã lưu danh mục." (thêm/sửa) hoặc "Đã xoá danh mục." (xoá).
- **Lỗi form** (giữ hộp thoại và giá trị đã nhập):
  - Client: rỗng sau trim -> "Vui lòng nhập tên danh mục."; > 50 ký tự (đếm code point) -> "Tên danh mục tối đa 50 ký tự."
  - 400 `VALIDATION_ERROR`: `fields.name` dưới ô (kể cả "Tên danh mục phải chứa ít nhất một chữ cái hoặc chữ số.").
  - 409 `CATEGORY_EXISTS`: "Danh mục này đã tồn tại." dưới ô tên.
  - 404 `CATEGORY_NOT_FOUND`: đóng hộp thoại, toast lỗi "Danh mục không còn tồn tại.", tải lại danh sách.
  - 500 / 429 / `NETWORK_ERROR`: khung `role="alert"` đỏ nhạt trong hộp thoại với `error.message`, nút Lưu bật lại.
  - Có lỗi trường thì focus về ô tên (`aria-invalid`, `aria-describedby` qua `TextField`).
- **Lỗi xoá**: 409 `CATEGORY_NOT_EMPTY` -> đóng hộp thoại, toast lỗi với `error.message`, tải lại danh sách để cập nhật số sản phẩm; 404 -> toast "Danh mục không còn tồn tại.", tải lại; 500/mạng -> toast lỗi, giữ dòng.

### Responsive
- Mobile (< 640px): không dùng bảng ngang; mỗi danh mục là một **thẻ** (`<li>` trong `<ul>`, `rounded-2xl border border-line bg-surface p-4`): tên, badge, slug nhỏ bên dưới, hàng nút Sửa / Xoá (`min-h-11`). Ẩn "Ngày tạo".
- Tablet (640–1024px): `<table>` 4 cột (Tên, Sản phẩm, Ngày tạo, Thao tác); từ `md` hiện thêm Slug.
- Desktop (> 1024px): bảng đủ 5 cột trong thẻ `rounded-3xl bg-surface shadow-card`, hàng ~64px, hover hàng `bg-canvas`.
- Hộp thoại: `w-[calc(100%-2rem)] max-w-md`; nút xếp dọc trên mobile (Lưu trên, Huỷ dưới), ngang từ `sm`.

### Navigation
- Đến màn hình này từ: menu admin, `/admin`, link "Xem sản phẩm" từ `/admin/products`.
- Từ màn hình này đến: `/admin/products?categoryId=<id>`.

### Ghi chú
- A11y bảng: `<table>` có `<caption class="sr-only">Danh sách danh mục</caption>`, `<th scope="col">`; cột Thao tác có `<th>` ẩn thị giác "Thao tác". Hộp thoại trả focus về nút đã mở. Sau khi xoá thành công (hàng biến mất) focus chuyển về `h2` (`tabIndex={-1}`).
- Số sản phẩm luôn có chữ "N sản phẩm", không chỉ dựa vào màu. Tên dài (50 ký tự): `break-words`.

---

## Danh sách sản phẩm — `/admin/products`

Code dự kiến: `pages/admin/AdminProductsPage.jsx`. Flow: `product-management.md` mục 9. Story: `sprints/US-04.md`.

### Mục đích
Xem sản phẩm (mới nhất trước), lọc theo danh mục, thêm / sửa / xoá.

### Quyền truy cập
Admin.

### Các thành phần chính
1. **Thanh tiêu đề trang**: `h2` "Sản phẩm", mô tả "Quản lý quần áo và ảnh trải phẳng (flat lay) dùng cho thử đồ.", nút **"Thêm sản phẩm"** (primary, link tới `/admin/products/new`, kèm `?categoryId=` nếu đang lọc).
2. **Bộ lọc danh mục**: `<select>` nhãn hiển thị "Lọc theo danh mục", tuỳ chọn đầu "Tất cả danh mục", rồi danh mục từ `GET /api/admin/categories`. Chọn -> cập nhật query `?categoryId=` (`replace`). Bên cạnh là "N sản phẩm" (`aria-live="polite"`). `categoryId` sai định dạng (400) -> bỏ query, coi như không lọc. `categoryId` hợp lệ nhưng không tồn tại -> danh sách rỗng (theo flow), select hiện "Tất cả danh mục".
3. **Danh sách sản phẩm** (`DataTable`): cột **Ảnh**, **Tên**, **Giá**, **Danh mục** (badge), **Thao tác** (Sửa, Xoá).
   - Thumbnail: khung `aspect-[3/4]` rộng 48–64px, `rounded-xl bg-sand`, `object-contain` (không méo/cắt), `loading="lazy"`. `alt=""` khi tên đứng ngay cạnh (ảnh trang trí), nếu không thì `alt="Ảnh {tên}"`.
   - `imageUrl = null` hoặc `<img onError>`: gọi lại GET danh sách **một lần** để lấy signed URL mới (hết hạn sau 1 giờ); vẫn lỗi/`null` -> placeholder (icon ảnh + chữ nhỏ "Không có ảnh"), `role="img"` `aria-label="Không tải được ảnh sản phẩm"`.
   - Giá: `Intl.NumberFormat('vi-VN').format(price) + ' ₫'` -> "199.000 ₫", căn phải (`tabular-nums`).
   - Nút "Sửa" -> `/admin/products/:id/edit`; "Xoá" mở hộp thoại; `aria-label` "Sửa sản phẩm {tên}", "Xoá sản phẩm {tên}".
4. **Hộp thoại xác nhận xoá** (tái dùng `ConfirmDialog`): tiêu đề "Xoá sản phẩm?"; mô tả "Xoá sản phẩm “{tên}”? Ảnh sản phẩm cũng bị xoá và không thể hoàn tác."; nút "Huỷ" (focus ban đầu) / "Xoá sản phẩm"; busy "Đang xoá…".

### Trạng thái
- **Đang tải**: skeleton 5 hàng/thẻ (ô ảnh 3:4 + 2 thanh chữ), `role="status"` "Đang tải sản phẩm…"; bộ lọc `disabled` tới khi có danh mục.
- **Chưa có danh mục nào**: `EmptyState` "Cần tạo danh mục trước", "Sản phẩm phải thuộc một danh mục.", link-nút "Tới quản lý danh mục" (`/admin/categories`); ẩn nút Thêm sản phẩm.
- **Rỗng** (có danh mục, không có sản phẩm): không lọc -> "Chưa có sản phẩm nào", "Thêm sản phẩm đầu tiên cùng ảnh flat lay.", nút "Thêm sản phẩm". Đang lọc -> "Danh mục này chưa có sản phẩm", nút "Thêm sản phẩm vào danh mục này" và nút chữ "Xem tất cả sản phẩm" (xoá bộ lọc).
- **Lỗi tải** (500/mạng): `ErrorState` "Không tải được sản phẩm", `error.message`, **Thử lại**. 403 -> `ForbiddenPage`.
- **Xoá**: 200 -> bỏ khỏi danh sách, toast "Đã xoá sản phẩm."; 404 -> bỏ khỏi danh sách, toast lỗi "Sản phẩm không còn tồn tại."; 500/mạng -> toast lỗi `error.message`, giữ dòng.
- Toast "Đã lưu sản phẩm." hiển thị ở trang này sau khi form lưu xong.

### Responsive
- Mobile (< 640px): danh sách **thẻ** (`<ul>`): thumbnail 3:4 rộng 64px bên trái; bên phải tên (tối đa 2 dòng), giá, badge danh mục; hàng nút Sửa / Xoá (`min-h-11`) bên dưới. Bộ lọc và nút Thêm full width.
- Tablet (640–1024px): bảng gồm Ảnh, Tên, Giá, Thao tác; Danh mục hiện dưới tên dạng badge nhỏ (cột riêng từ `md`).
- Desktop (> 1024px): bảng 5 cột trong thẻ `rounded-3xl shadow-card`; hàng ~88px.

### Navigation
- Đến màn hình này từ: menu admin, badge/"Xem sản phẩm" ở `/admin/categories`, trả về từ form sản phẩm.
- Từ màn hình này đến: `/admin/products/new`, `/admin/products/:id/edit`, `/admin/categories` (khi chưa có danh mục).

### Ghi chú
- Không phân trang (D22). Ảnh `loading="lazy"`.
- A11y: `<table>` có caption ẩn "Danh sách sản phẩm"; sau xoá thành công focus về `h2`; tên/giá render text thuần (React escape).

---

## Form thêm / sửa sản phẩm — `/admin/products/new`, `/admin/products/:id/edit`

Code dự kiến: `pages/admin/AdminProductFormPage.jsx` (một component, chế độ theo route), `components/admin/ProductImageField.jsx`, `components/admin/PriceField.jsx`. Flow: `product-management.md` mục 5, 6, 9.

### Mục đích
Nhập tên, giá (VND), danh mục và đúng 1 ảnh flat lay; khi sửa có thể giữ ảnh cũ hoặc thay ảnh mới.

### Quyền truy cập
Admin. `/admin/products/new?categoryId=<id>` chọn sẵn danh mục nếu id hợp lệ.

### Các thành phần chính
1. **Liên kết quay lại** "← Danh sách sản phẩm" (giữ `?categoryId=` nếu mở từ bộ lọc) và `h2` "Thêm sản phẩm" / "Sửa sản phẩm".
2. **Khối ảnh flat lay** (`ProductImageField`): khung `aspect-[3/4] rounded-2xl bg-sand border border-dashed border-line`, `object-contain`, rộng tối đa 16rem.
   - Thêm, chưa chọn: placeholder icon ảnh + "Chưa chọn ảnh" + nút **"Chọn ảnh"** (input file `accept="image/jpeg,image/png"` ẩn bằng `sr-only`, nút/label là phần tử focus được, Enter/Space mở hộp chọn file).
   - Đã chọn: xem trước bằng `URL.createObjectURL`, dòng "Ảnh mới (chưa lưu)", nút **"Chọn ảnh khác"** và **"Bỏ ảnh đã chọn"** (phía client). Khi sửa, bỏ ảnh mới -> quay về ảnh hiện tại.
   - Sửa, chưa chọn ảnh mới: hiện ảnh hiện tại (signed URL), nút **"Thay ảnh"**, chú thích "Giữ nguyên ảnh hiện tại nếu không chọn ảnh mới."
   - Gợi ý tĩnh (gắn `aria-describedby` cho input file): "Ảnh trải phẳng, nền trơn, thấy toàn bộ sản phẩm. JPG hoặc PNG, tối đa 5MB, tối thiểu 400×400 px." Không kiểm tra tỉ lệ; ảnh có cạnh ngắn < 400 px bị chặn (Q10).
   - Lỗi chặn phía client (bỏ file, giữ ảnh đang có): loại khác jpg/jpeg/png -> "Chỉ hỗ trợ ảnh JPG hoặc PNG."; > 5MB -> "Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn."; cạnh ngắn < 400 px -> "Ảnh quá nhỏ, cần tối thiểu 400×400 px." (tái dùng phần loại/dung lượng của `utils/avatarCheck.js`, bỏ phần cảnh báo tỉ lệ). Lỗi `role="alert"` dưới khung ảnh.
   - Ảnh hiện tại lỗi tải (`onError`, URL hết hạn): gọi lại `GET /api/admin/products/:id` một lần; vẫn lỗi -> placeholder "Không tải được ảnh hiện tại. Bạn vẫn có thể chọn ảnh mới." (vẫn lưu được nếu không đổi ảnh).
   - Hiệu ứng: xem trước fade-in (`opacity`, 200ms).
3. **Ô Tên sản phẩm** (`TextField`, bắt buộc, `autoComplete="off"`), hint "Tối đa 100 ký tự."
4. **Ô Giá** (`PriceField` bọc `TextField`): `type="text"`, `inputMode="numeric"`, `autoComplete="off"`, hậu tố "₫" cố định trong ô, hint "Đơn vị: VND. Ví dụ: 199.000". Khi gõ chỉ giữ chữ số, hiển thị tách nghìn bằng dấu chấm ("199.000"), tối đa 9 chữ số; **gửi chuỗi chữ số thuần** ("199000"). Dán "199,000" hay "199.000đ" được làm sạch về chữ số; giữ vị trí con trỏ ổn định khi định dạng lại.
5. **Ô Danh mục** (`<select>` cùng kiểu `TextField`, `min-h-12 rounded-2xl`, nhãn "Danh mục"): tuỳ chọn đầu "Chọn danh mục" (value rỗng), rồi danh mục từ API. Khi sửa chọn sẵn danh mục hiện tại.
6. **Hàng nút**: "Lưu sản phẩm" (primary, `min-h-12`) và "Huỷ" (outline, về danh sách). Đang lưu: "Đang lưu…" + spinner, nút khoá, ô `readOnly`/`disabled`, lớp phủ "Đang tải ảnh lên…" trên khung ảnh khi có file. Khi sửa: Lưu `disabled` nếu chưa có thay đổi (tên/giá/danh mục không đổi và không có ảnh mới).

### Trạng thái
- **Đang tải** (khi sửa, và khi tải danh mục): skeleton khung ảnh 3:4 + 3 ô + nút, `role="status"` "Đang tải sản phẩm…".
- **Lỗi tải** (500/mạng, hoặc tải danh mục lỗi): `ErrorState` "Không tải được thông tin" + **Thử lại**. Sửa mà 404 `PRODUCT_NOT_FOUND`: toast lỗi "Sản phẩm không còn tồn tại.", về `/admin/products`.
- **Chưa có danh mục**: thay form bằng `EmptyState` "Cần tạo danh mục trước" + link "Tới quản lý danh mục".
- **Validate client** (bấm Lưu; tên/giá còn kiểm tra khi rời ô nếu đã nhập), cùng quy tắc và message với server:
  - Tên: rỗng -> "Vui lòng nhập tên sản phẩm."; > 100 ký tự -> "Tên sản phẩm tối đa 100 ký tự."
  - Giá: rỗng -> "Vui lòng nhập giá sản phẩm."; 0 hoặc không phải số nguyên dương -> "Giá phải là số nguyên dương (VND), không có dấu chấm hoặc phẩy."; > 100.000.000 -> "Giá tối đa 100.000.000 ₫."
  - Danh mục: chưa chọn -> "Vui lòng chọn danh mục."
  - Ảnh: thêm mà chưa chọn -> "Vui lòng chọn ảnh sản phẩm."
  - Focus ô lỗi đầu tiên theo thứ tự Tên, Giá, Danh mục, Ảnh; sửa ô nào lỗi ô đó biến mất.
- **Lỗi server**:
  - 400 `VALIDATION_ERROR`: map `error.fields` (`name`, `price`, `categoryId`, `image`) vào từng ô, hiện mọi lỗi cùng lúc. `fields.categoryId` -> tải lại danh mục và đặt select về "Chọn danh mục".
  - 413 `FILE_TOO_LARGE` / 415 `UNSUPPORTED_FILE_TYPE`: message dưới khung ảnh, bỏ file đã chọn, giữ các trường khác.
  - 400 `INVALID_UPLOAD`, 429, 502 `UPLOAD_FAILED`, 500, `NETWORK_ERROR`: khung `role="alert"` đỏ nhạt phía trên nút Lưu với `error.message`; **giữ dữ liệu và ảnh đã chọn**, nút bật lại.
  - 404 `PRODUCT_NOT_FOUND` (sửa): toast lỗi, về danh sách.
- **Thành công**: thu hồi objectURL, `navigate('/admin/products' + query)` kèm toast "Đã lưu sản phẩm.".

### Responsive
- Mobile (< 640px): một cột: ảnh (tối đa 16rem, căn giữa) rồi các ô; Lưu full width, Huỷ bên dưới.
- Tablet (640–1024px): thẻ form `max-w-xl`; từ `md` (768px) hai cột: ảnh trái 16rem, form phải.
- Desktop (> 1024px): hai cột, ảnh 18rem; thẻ trắng `rounded-3xl shadow-card p-8`.

### Navigation
- Đến màn hình này từ: "Thêm sản phẩm" / "Sửa" ở `/admin/products`.
- Từ màn hình này đến: `/admin/products` (Lưu thành công, Huỷ, liên kết quay lại), `/admin/categories` (khi chưa có danh mục).

### Ghi chú
- `FormData` gồm `name`, `price` (chuỗi chữ số), `categoryId`, `image` (chỉ khi có file); PUT luôn gửi `FormData` (D25).
- A11y: mọi ô có `<label htmlFor>`; lỗi `aria-invalid` + `aria-describedby`; kết quả chọn ảnh báo qua `aria-live="polite"` ("Đã chọn ảnh mới"), không đọc/ghi tên file gốc ra log.
- Chặn gửi lặp; không cần cảnh báo rời trang khi chưa lưu (Sprint 2). Trên mobile `accept` cho phép chụp trực tiếp hoặc chọn từ thư viện.

---

## Trang 403 — hiển thị tại mọi route `/admin/*` với user không phải admin

Code: `pages/ForbiddenPage.jsx` (dùng bởi `RequireAdmin`, và khi API admin trả 403).

### Mục đích
Báo user thường (hoặc admin vừa bị hạ quyền) không có quyền, **không lộ** layout/nội dung quản trị.

### Quyền truy cập
User đã đăng nhập không phải admin. Guest bị chuyển `/login?redirect=`, không thấy trang này.

### Các thành phần chính
1. Số "403" lớn màu `muted`, `h1` "Bạn không có quyền truy cập", mô tả "Trang này chỉ dành cho quản trị viên."
2. Nút "Về trang chủ" (primary, `/`) và nút phụ "Hồ sơ của tôi" (outline, `/profile`) để có thêm đích hợp lệ.
   - Trạng thái: default / hover / focus-visible. Không có loading/error/empty.

### Responsive
Căn giữa, `py-16`, một cột ở mọi cỡ; hai nút xếp dọc full width trên mobile, ngang từ `sm`.

### Navigation
- Đến màn hình này từ: `/admin*` với user thường; API admin trả 403.
- Từ màn hình này đến: `/`, `/profile`.

### Ghi chú
- Không render menu admin hay dữ liệu nào từ API. 403 do hạ quyền giữa phiên: gọi lại `GET /api/user/profile` để cập nhật `role` trong AuthContext (link "Quản trị" biến khỏi `AccountMenu`).
- Focus: `h1` có `tabIndex={-1}` nhận focus khi trang hiện, để trình đọc màn hình đọc ngay. `document.title` "Không có quyền truy cập — Try-on".

---

# Phòng thử đồ (Sprint 3 — US-05, US-06)

Bám `design/flows/try-on-room.md` (mục 4–5, 9), `design/flows/README.md` (contract, mã lỗi, route, D24–D31, Q11–Q22), `sprints/US-05.md`, `sprints/US-06.md`. Route: `/try-on` và `/try-on/:categoryId?product=<productId>` (README mục 5), cả hai nằm trong `RequireAuth` + `MainLayout`; guest bị chuyển `/login?redirect=<path>`. Mọi người dùng đã đăng nhập (kể cả admin) dùng được.

Code: `pages/TryOnCategoriesPage.jsx`, `pages/TryOnRoomPage.jsx`; component `components/tryOn/` (`TryOnStage`, `ProductPanel`, `ProfileGate`, `ConsentDialog`); logic `features/tryOn/` (`useTryOnAccess`, `useCategories`, `useTryOnRoom`, `useSwipe`, điểm nối dữ liệu `tryOnApi.js`, xem "Nối API thật" cuối mục).

**Quy ước chung của phòng thử đồ**
- **Câu chữ trạng thái chờ chuẩn hoá (duy nhất):** `Đang thử đồ {tên sản phẩm}…` (có dấu "…"). Dùng cho chữ hiển thị trong khung ảnh và cho thông báo `aria-live`. Các câu cũ "Đang tạo ảnh bạn mặc {tên}…" ở `try-on-room.md` mục 9 (sơ đồ) và `US-05.md` luồng chính bước 4 thay bằng câu này.
- Giá luôn dạng `199.000 ₫` (`formatVnd`); vị trí `n/N` (vd. `2/6`).
- Nút "Thêm vào giỏ" (US-07, Sprint 4) nằm trong `ProductPanel` (xem mục 5 bên dưới và mục "Giỏ hàng & Đặt hàng"); không có nút xoá toàn bộ ảnh thử đồ (Q22).
- Không prefetch (Q15): chỉ gửi `POST /api/try-on` cho sản phẩm user dừng lại >= 400 ms (debounce); chỉ poll sản phẩm đang hiển thị.
- `document.title`: `/try-on` = "Phòng thử đồ — Try-on"; `/try-on/:categoryId` = "Thử đồ: {tên danh mục} — Try-on" (khi chưa tải xong danh mục: "Phòng thử đồ — Try-on").
- Hạn mức hiển thị "Còn {n} lượt hôm nay" (từ `quota.remaining`, cập nhật theo mỗi response POST và `GET /api/try-on/quota`); `remaining = 0` hiện "Đã hết lượt hôm nay".

---

## Chọn danh mục — `/try-on`

### Mục đích
Người mua chọn danh mục để vào phòng thử đồ. Là lối vào chính từ header / `AccountMenu` / landing / `/profile`.

### Quyền truy cập
Đã đăng nhập (`RequireAuth`).

### Các thành phần chính
1. **Tiêu đề**: eyebrow "Phòng thử đồ", `h1` "Bạn muốn thử gì hôm nay?" (Playfair), mô tả "Chọn một danh mục để xem chính bạn mặc từng sản phẩm."
2. **Điều kiện hồ sơ** (làm trước khi tải danh mục, `useTryOnAccess`): tải hồ sơ (skeleton `role="status"` "Đang tải hồ sơ…"; lỗi -> `ErrorState` "Không tải được hồ sơ" + Thử lại); hồ sơ thiếu ảnh toàn thân / chiều cao / cân nặng -> màn "Hoàn thiện hồ sơ để thử đồ" (xem mục riêng bên dưới) thay cho danh sách.
3. **Lưới thẻ danh mục** (`CategoryGrid`): mỗi danh mục là một `<Link>` tới `/try-on/:categoryId` (`rounded-3xl`, nền gradient `blush -> sand`, chữ cái đầu lớn mờ trang trí `aria-hidden`, tên danh mục Playfair, nút tròn mũi tên). Tên truy cập của link = tên danh mục.
   - Tương tác: click / Enter. Trạng thái: default / hover (nhích lên 4px, nút mũi tên chuyển `accent`) / focus-visible (outline global). Vùng chạm cả thẻ (>= 144px cao).
   - Chỉ có danh mục có >= 1 sản phẩm (Q8, server lọc).
4. **Skeleton** khi tải danh mục: 3 khối `animate-pulse`, `role="status"` chữ ẩn "Đang tải danh mục…".
5. **Lỗi tải** (500/mạng): `ErrorState` "Không tải được danh mục" + `error.message` + **Thử lại**.
6. **Rỗng** (`categories = []`): `EmptyState` "Chưa có sản phẩm để thử", "Cửa hàng chưa thêm sản phẩm nào. Vui lòng quay lại sau." (không có nút hành động).

### Responsive
- Mobile (< 640px): 1 cột. Tablet (640–1024px): 2 cột. Desktop (>= 1024px): 3 cột; trong container `max-w-5xl` của `MainLayout`. 375px không cuộn ngang.

### Navigation
- Đến từ: link "Phòng thử đồ" ở `MainLayout` (từ 640px), `AccountMenu`, `LandingHeader`, CTA "Thử ngay" ở landing, link "Vào phòng thử đồ" ở `/profile`, "Chọn danh mục khác" ở phòng thử đồ, hộp thoại đồng ý ("Để sau"). Từ Sprint 3 Task 4: đích mặc định sau đăng nhập (Q19).
- Đi tới: `/try-on/:categoryId`; `/profile` (qua màn Hoàn thiện hồ sơ).

---

## Hoàn thiện hồ sơ để thử đồ — hiển thị tại `/try-on` và `/try-on/:categoryId`

Không phải route riêng: `ProfileGate` thay nội dung trang khi hồ sơ thiếu mục (Q13: bắt buộc cả ba).

### Các thành phần chính
1. Thẻ trắng `rounded-3xl shadow-card` căn giữa `max-w-lg`: `h1` "Hoàn thiện hồ sơ để thử đồ", mô tả "Phòng thử đồ cần ảnh toàn thân cùng chiều cao, cân nặng của bạn để dựng ảnh bạn mặc sản phẩm."
2. Danh sách luôn đủ 3 mục **Ảnh toàn thân / Chiều cao / Cân nặng**; mỗi mục có vòng tròn (dấu tích `accent` khi đã có; viền nét đứt khi thiếu) **kèm chữ** "Đã có" / "Còn thiếu" (không chỉ dựa vào màu/icon).
3. Nút **"Cập nhật hồ sơ"** (primary, `min-h-12`) -> `/profile` (không thêm `?redirect`; khi hồ sơ đủ, `/profile` hiện link "Vào phòng thử đồ").
- Nguồn thiếu: client (profile: `avatarUrl`, `heightCm`, `weightKg` null) **hoặc** server (409 `PROFILE_INCOMPLETE`, `error.fields` có `avatar`/`heightCm`/`weightKg` -> unmount phòng thử đồ và hiện màn này).

### Responsive / a11y
- Một cột ở mọi cỡ; nút full width trên mobile, tự co từ `sm`. Heading là `h1`.

---

## Hộp thoại đồng ý xử lý ảnh — hiển thị tại `/try-on/:categoryId`

Hiện **một lần** khi `profile.tryOnConsentAt = null` (Q14), trước khi tải sản phẩm (hộp thoại nằm trên skeleton phòng thử đồ). Dùng lại `ConfirmDialog` (`<dialog>` + `showModal`: focus trap, Esc, trả focus) với thêm prop tuỳ chọn `error`.

- Tiêu đề "Cho phép xử lý ảnh của bạn?"; nội dung: "Để tạo ảnh thử đồ, ảnh toàn thân của bạn và ảnh sản phẩm được gửi tới dịch vụ AI của Google (Gemini API). Ảnh kết quả chỉ mình bạn xem được, và bạn có thể xoá ảnh toàn thân trong Hồ sơ bất cứ lúc nào."
- Nút **"Đồng ý"** (primary, `confirmTone="primary"`) -> `POST /api/try-on/consent` -> cập nhật profile -> vào phòng thử đồ. Đang gửi: nút khoá, nhãn "Đang lưu…", Esc/bấm nền bị chặn.
- Nút **"Để sau"** (focus ban đầu; Esc và bấm nền cũng = Để sau) -> về `/try-on` (replace).
- Lỗi (500/mạng/429): khung `role="alert"` đỏ nhạt trong hộp thoại với `error.message`, hộp thoại giữ nguyên, bấm "Đồng ý" lại được.
- Server 409 `TRY_ON_CONSENT_REQUIRED` khi POST thử đồ (client tưởng đã đồng ý) -> hiện lại hộp thoại; Đồng ý xong phòng thử đồ nạp lại.
- Responsive: `w-[calc(100%-2rem)] max-w-sm`; nút xếp dọc trên mobile ("Đồng ý" trên, "Để sau" dưới), ngang từ `sm`.

---

## Phòng thử đồ — `/try-on/:categoryId?product=<productId>`

### Mục đích
Thấy ảnh chính mình mặc sản phẩm của danh mục; chuyển sản phẩm bằng mũi tên / vuốt / phím ←/→; xem tên, giá, vị trí. Vị trí được giữ ở `?product=` (cập nhật bằng `replace`, Back không đi qua từng sản phẩm; reload giữ đúng sản phẩm). `?product=` thiếu / không thuộc danh mục -> về sản phẩm đầu (replace, không báo lỗi). Thứ tự sản phẩm theo server (cũ nhất trước, D24).

### Quyền truy cập
Đã đăng nhập; hồ sơ đủ; đã đồng ý (xem hai mục trên).

### Bố cục và thành phần chính
Một `<section aria-label="Phòng thử đồ: {danh mục}">` có `onKeyDown` cho ←/→ và một vùng `aria-live="polite"` ẩn thị giác (`sr-only`).

1. **Khung ảnh thử đồ** (`TryOnStage`): `role="group"` `tabIndex=0` `aria-label="Ảnh thử đồ. Dùng phím mũi tên trái hoặc phải để đổi sản phẩm."`; `aspect-[3/4]`, `max-w-md`, `rounded-[2rem]`, nền `sand`, `shadow-card`; ảnh `object-contain` (không méo, không cắt). `touch-action: pan-y` (class `touch-pan-y`) và `select-none`; ảnh `draggable={false}`.
   - **Nhãn "Ảnh mô phỏng"** (pill `bg-ink/80` chữ trắng, góc trên trái) khi `tryOn.simulated = true` (provider `stub`). Provider thật: không nhãn.
   - **Mũi tên trái/phải** (`size-11` = 44px, tròn, nền `surface/85` + blur, đặt trong khung ở hai mép, giữa theo chiều dọc): `aria-label` "Sản phẩm trước" / "Sản phẩm tiếp theo"; `disabled` ở đầu / cuối danh sách (mờ 40%, `cursor-not-allowed`); hover phóng 1.05. **Luôn bấm được trong lúc ảnh đang tạo** (không bao giờ khoá vì ảnh chưa xong).
   - **Vuốt** (Pointer Events, `useSwipe`): vuốt trái = tiếp theo, vuốt phải = trước đó, cần |dx| >= 50 px và |dx| > |dy|; không `setPointerCapture` (để click mũi tên vẫn đúng); cuộn dọc khiến trình duyệt phát `pointercancel` nên không bị nhầm là vuốt.
   - **Trạng thái trong khung ảnh** (suy ra từ cache client `entries[productId]`, xem `useTryOnRoom`):

| Trạng thái | Hiển thị | Ghi chú |
|------------|----------|---------|
| Đang tạo (chưa có entry, đang chờ debounce 400 ms; hoặc `processing`; hoặc đang POST) | Ảnh toàn thân của user mờ (`blur-xl`, 60%) làm nền + thẻ flat lay sản phẩm (3:4, nổi) kèm vòng xoay; chữ **"Đang thử đồ {tên}…"** (Playfair), bộ đếm "{n} giây", dòng nhỏ "Có thể mất vài giây đến nửa phút. Bạn vẫn có thể xem sản phẩm khác trong lúc chờ." | Hiện **ngay** khi chuyển sang sản phẩm chưa có ảnh (< 100 ms đo được ~66 ms gồm cả thao tác click), không để khung trống. Bộ đếm tính từ lúc bắt đầu yêu cầu (khi chưa có entry: từ lúc khung hiện ra), **không** phải live region (`aria-hidden`) để trình đọc màn hình không đọc mỗi giây. Chưa có ảnh toàn thân: nền `animate-pulse` |
| Thành công (`succeeded`) | Ảnh thử đồ, `alt="Bạn mặc {tên}"`, fade-in 400 ms (`opacity`) | `<img onError>` -> GET lại `/api/try-on/:id` **một lần** lấy signed URL mới; vẫn lỗi -> khối lỗi `IMAGE_LOAD_FAILED` (chỉ có ở client) + Thử lại |
| Lỗi (`failed`, hoặc lỗi POST) | Khối `role="alert"` đỏ nhạt giữa khung (nền là flat lay mờ): icon cảnh báo, "Chưa có ảnh thử đồ", `error.message` nguyên văn, nút **"Thử lại"** (outline, `min-h-11`) | `INPUT_REJECTED` thêm link "Đổi ảnh toàn thân" -> `/profile`. Áp dụng cho `GENERATION_FAILED`, `GENERATION_TIMEOUT`, `INPUT_REJECTED`, `PROVIDER_UNAVAILABLE`, 503 `TRY_ON_UNAVAILABLE`, 429 `TOO_MANY_REQUESTS`, 500, `NETWORK_ERROR`, và client timeout 120 s (hiện message "Tạo ảnh mất quá nhiều thời gian…" như `GENERATION_TIMEOUT`). Thử lại = `POST /api/try-on` lại cho riêng sản phẩm đó |
| Hết lượt (429 `TRY_ON_QUOTA_EXCEEDED`) | Khối `role="alert"`: "Đã hết lượt thử đồ hôm nay", "Lượt thử mới có lại từ 00:00 ngày mai (giờ Việt Nam). Bạn vẫn xem được các sản phẩm và ảnh đã tạo." (không có nút Thử lại) | `resetsAt` luôn là 00:00 giờ VN nên dùng chữ cố định; badge hạn mức đổi thành "Đã hết lượt hôm nay". Vẫn chuyển sản phẩm, xem flat lay và ảnh đã tạo (cache) |

2. **Cột thông tin** (`ProductPanel`): link "← Chọn danh mục khác" (`/try-on`, `min-h-11`); eyebrow "Phòng thử đồ"; `h1` tên danh mục (Playfair); khối sản phẩm: ảnh **flat lay thu nhỏ** (`aspect-[3/4]`, `w-24`, `object-contain`, `alt="Ảnh trải phẳng {tên}"`), `n/N`, `h2` tên (tối đa vài dòng, `break-words`), giá "199.000 ₫" (`tabular-nums`), badge **"Còn n lượt hôm nay"** (`sand`) / "Đã hết lượt hôm nay" (`blush`, có chữ). Tên/giá/flat lay đổi tức thì khi chuyển sản phẩm (không chờ mạng).
3. **Danh sách thu nhỏ** (`nav aria-label="Sản phẩm trong danh mục"`, ẩn khi chỉ có 1 sản phẩm): hàng các nút ảnh flat lay `w-14` (`min-h-11`), cuộn ngang **trong** thanh (không làm cuộn ngang trang), sản phẩm hiện tại viền `accent` + `aria-current="true"`; bấm -> chuyển tới sản phẩm đó (cùng debounce). `aria-label` "{tên}, sản phẩm i trên N".
4. **Thẻ "Đã xem hết"** (chỉ ở sản phẩm cuối): "Bạn đã xem hết {danh mục}", "Đây là sản phẩm cuối cùng. Bấm mũi tên trái để xem lại, hoặc thử danh mục khác." + nút "Chọn danh mục khác" -> `/try-on`. Mũi tên phải `disabled`, vuốt trái không làm gì, **không quay vòng** (Q17); mũi tên trái vẫn dùng được.
5. **Nút "Thêm vào giỏ"** (US-07, Sprint 4, `AddToCartButton`): ngay dưới khối sản phẩm trong `ProductPanel`. Chi tiết ở mục "Nút Thêm vào giỏ" trong phần Giỏ hàng & Đặt hàng.

### Trạng thái cấp trang
- **Đang tải danh sách sản phẩm** (và đang tải hồ sơ): skeleton khung 3:4 + cột thông tin, `role="status"` chữ ẩn "Đang tải phòng thử đồ…".
- **Lỗi tải sản phẩm** (500/mạng): `ErrorState` "Không tải được sản phẩm" + Thử lại.
- **Danh mục rỗng** (`products = []`, vào bằng URL): `EmptyState` "Danh mục này chưa có sản phẩm", "Hãy chọn danh mục khác để tiếp tục thử đồ." + nút "Chọn danh mục khác" -> `/try-on`.
- **Danh mục không tồn tại** (404 `CATEGORY_NOT_FOUND`): toast lỗi "Danh mục không còn tồn tại." và `navigate('/try-on', { replace })`.
- **Sản phẩm bị xoá giữa chừng** (404 `PRODUCT_NOT_FOUND` khi POST): bỏ entry, tải lại danh sách, giữ vị trí gần nhất hợp lệ (replace URL).
- **Chuyển sản phẩm khi ảnh đang tạo**: không chặn; job vẫn chạy ở server; client dừng poll sản phẩm cũ (huỷ vòng poll), quay lại thì GET ngay rồi poll tiếp; kết quả poll về muộn chỉ cập nhật đúng `productId` của nó (entry theo `productId`).
- **Debounce / không prefetch**: lướt nhanh qua nhiều sản phẩm (< 400 ms mỗi bước) không gửi POST cho sản phẩm chỉ lướt qua (đã kiểm tra: 3 lần bấm liên tiếp chỉ trừ 1 lượt).

### Hiệu ứng
- Ảnh kết quả fade-in (`animate-fade-in`, token mới trong `index.css`); đổi sản phẩm **không** trượt (không animation chuyển, đơn giản và đã thoả `prefers-reduced-motion`); vòng xoay `animate-spin`; thẻ danh mục hover nhích lên. Chỉ `transform`/`opacity`; `prefers-reduced-motion` tắt gần hết (cấu hình global).

### Responsive
- Mobile (< 640px, kiểm tra 375px): một cột; khung ảnh gần full chiều ngang (3:4), mũi tên nổi hai bên mép trong ảnh (nền mờ, không che thân), thông tin + danh sách thu nhỏ dưới ảnh. Không cuộn ngang trang.
- Tablet (640–1024px, kiểm tra 768px): một cột, khung ảnh `max-w-md` căn giữa, thông tin dưới ảnh.
- Desktop (>= 1024px, kiểm tra 1280px): hai cột `minmax(0,28rem) | 1fr` — ảnh trái, thông tin + flat lay + danh sách thu nhỏ phải; ảnh cao ~600px vừa màn hình 800px.

### Accessibility
- `aria-live="polite"` (một vùng duy nhất, `sr-only`): đọc "Sản phẩm {n} trên {N}: {tên}, {giá}." rồi nối trạng thái: "Đang thử đồ {tên}…" -> "Đã tạo xong ảnh." / `error.message` / "Đã hết lượt thử đồ hôm nay." Khối lỗi trong khung có thêm `role="alert"`.
- Bàn phím: ←/→ đổi sản phẩm khi focus nằm trong vùng phòng thử đồ (khung ảnh `tabIndex=0`, mũi tên, thanh thu nhỏ; **không** bắt phím khi đang ở `input/textarea/select/contenteditable` hoặc có Ctrl/Alt/Meta/Shift). Tab: khung ảnh -> 2 mũi tên (nút disabled bị bỏ qua) -> link "Chọn danh mục khác" -> thanh thu nhỏ -> thẻ "Đã xem hết".
- Focus khi mũi tên bị disabled: nếu nút "Sản phẩm tiếp theo" / "trước" đang giữ focus mà trở thành disabled (tới cuối / đầu danh sách) thì focus tự chuyển về khung ảnh (`tabIndex=0`) để ←/→ (bắt ở vùng phòng thử đồ) vẫn hoạt động; nút không giữ focus thì không bị cướp focus (`TryOnStage`, test `TryOnStageFocus.test.jsx`).
- Vùng chạm >= 44px (mũi tên `size-11`, thumbnail `min-h-11`, nút/ link `min-h-11`); focus-visible global (outline 2px `accent`); trạng thái không chỉ dựa vào màu (luôn kèm chữ: "Còn thiếu", "Ảnh mô phỏng", "Đã hết lượt…").
- Ảnh kết quả có `alt`; ảnh trang trí (nền mờ, flat lay trong khung chờ) `alt=""`.

### Navigation
- Đến từ: `/try-on` (chọn danh mục), URL trực tiếp / reload, `RequireAuth` (`/login?redirect=/try-on/...`).
- Đi tới: `/try-on` ("Chọn danh mục khác", thẻ "Đã xem hết", "Để sau" ở hộp thoại đồng ý, 404 danh mục), `/profile` (màn Hoàn thiện hồ sơ, link "Đổi ảnh toàn thân").

### Ghi chú
- Cache client `entries` sống trong phiên trang (đổi danh mục = mount lại, `key={categoryId}`); không lưu `localStorage`.
- Chưa test trên thiết bị cảm ứng thật: vuốt đã kiểm tra bằng Pointer Events tổng hợp ở 375px (xem báo cáo Task 2).

### Nối API thật (Sprint 3 Task 4, đã xong)
Mọi dữ liệu đi qua **một file** `frontend/src/features/tryOn/tryOnApi.js`, re-export từ `services/tryOnApi.js` (`requestTryOn`, `getTryOn`, `getQuota`, `giveConsent`), `services/categoryApi.js` (`fetchCategories`, `fetchCategoryProducts`) và `services/userApi.js` (`fetchProfile`); tất cả dùng `apiClient` dùng chung. Không còn mock (`mocks/tryOnMock.js`, `?mock=` và `sessionStorage` `tryon_mock_scenario` đã xoá).

| Hàm trong `features/tryOn/tryOnApi.js` | API | Response | Nơi dùng |
|-----------------------------------------|-----|----------|----------|
| `fetchProfile({ signal })` | `services/userApi.fetchProfile` (đã có) | `{ profile }` — cần thêm `tryOnConsentAt` (backend Task 3) | `useTryOnAccess` |
| `fetchCategories({ signal })` | `GET /api/categories` | `{ categories: [{ id, name, slug }] }` | `useCategories` |
| `fetchCategoryProducts(id, { signal })` | `GET /api/categories/:id/products` | `{ category: { id, name, slug }, products: [{ id, name, price, imageUrl }] }`; 404 `CATEGORY_NOT_FOUND` | `useTryOnRoom.loadList` |
| `requestTryOn(productId, { signal })` | `POST /api/try-on { productId }` | `{ tryOn, quota }` (client không phân biệt 200/202); lỗi: 409 `PROFILE_INCOMPLETE` (`fields`), 409 `TRY_ON_CONSENT_REQUIRED`, 429 `TRY_ON_QUOTA_EXCEEDED`, 404 `PRODUCT_NOT_FOUND`, 503 `TRY_ON_UNAVAILABLE`, 429 `TOO_MANY_REQUESTS` | `useTryOnRoom.request` |
| `getTryOn(id, { signal })` | `GET /api/try-on/:id` | `{ tryOn }`; 404 `TRY_ON_NOT_FOUND` | poll + `onImageError` |
| `getQuota({ signal })` | `GET /api/try-on/quota` | `{ quota: { limit, used, remaining, resetsAt } }` | `refreshQuota` |
| `giveConsent({ signal })` | `POST /api/try-on/consent` | `{ profile }` (idempotent) | `useTryOnAccess.giveConsent` |

`TryOn` = `{ id, productId, status: 'processing'|'succeeded'|'failed', imageUrl, error: { code, message } | null, simulated, createdAt, completedAt }`.

Hành vi của `features/tryOn/useTryOnRoom.js`:
1. **Debounce 400 ms**: chỉ `POST /api/try-on` cho sản phẩm user dừng lại; không prefetch sản phẩm khác (Q15).
2. **Poll** `GET /api/try-on/:id` mỗi 2 s, tối đa 120 s tính từ lúc bắt đầu yêu cầu sản phẩm đó; chỉ poll sản phẩm đang hiển thị (rời sản phẩm -> dừng poll, job vẫn chạy ở server; quay lại -> GET ngay rồi poll tiếp); `AbortController` khi rời trang. Lỗi mạng/5xx tạm thời -> poll tiếp tới hết 120 s; 404 -> `failed`.
3. **Theo `error.code`** của POST: 409 `PROFILE_INCOMPLETE` -> màn Hoàn thiện hồ sơ; 409 `TRY_ON_CONSENT_REQUIRED` -> hộp thoại đồng ý (đồng ý xong phòng thử đồ mount lại và POST lại); 429 `TRY_ON_QUOTA_EXCEEDED` -> khối hết lượt + `getQuota()` (UI dùng chữ cố định "00:00 ngày mai (giờ Việt Nam)", không đọc `Retry-After`); 404 `PRODUCT_NOT_FOUND` -> tải lại danh sách; mã khác (503 `TRY_ON_UNAVAILABLE`, 429 `TOO_MANY_REQUESTS`, mạng, `failed`) -> khối lỗi + Thử lại (POST lại).
4. **`<img onError>`** -> `GET` lại một lần để lấy `imageUrl` ký mới; vẫn lỗi -> `IMAGE_LOAD_FAILED` (mã chỉ có ở client) + Thử lại (POST lại -> cache hit 200).
5. **Hồ sơ**: `useTryOnAccess` gọi `fetchProfile` mỗi lần mở `/try-on` hoặc `/try-on/:id` (đọc `tryOnConsentAt`); sau `giveConsent` dùng `profile` trả về, không hỏi lại.
6. **Đích sau đăng nhập** = `/try-on` (Q19): `GuestOnly` dùng `safeRedirect(redirect) ?? PATHS.tryOn`.

---

# Giỏ hàng & Đặt hàng (Sprint 4 — US-07, US-08, US-10) và Đơn hàng admin (US-09)

Bám `design/flows/cart-and-orders.md` mục 6–9, `design/flows/README.md` (contract, mã lỗi `CART_FULL` / `CART_QUANTITY_LIMIT` / `CART_ITEM_NOT_FOUND` / `CART_EMPTY` / `CART_CHANGED`, `ORDER_NOT_FOUND`, D32–D41, Q23–Q34), `sprints/US-07..US-10.md`. Route mới (trong `RequireAuth` + `MainLayout`; admin thêm `RequireAdmin`): `/cart`, `/checkout`, `/orders/:id`, `/admin/orders`, `/admin/orders/:id`. Admin cũng mua hàng được (Q31).

Trạng thái code: **đã nối API thật** (Sprint 4 Task 5, mock đã xoá). Dữ liệu qua `services/cartApi.js`, `services/orderApi.js` và `services/adminApi.js` (`adminListOrders`, `adminGetOrder`); giỏ dùng chung qua `features/cart/CartProvider.jsx` (`useCart()`), nạp `GET /api/cart` khi đăng nhập/khôi phục phiên/tab hiện lại, xoá khi đăng xuất.

**Quy ước chung**
- Tiền là `number` VND, hiển thị `formatVnd`; tiền (thành tiền, tổng) luôn lấy từ server, không tự tính ở client. Mã đơn `DH` + 6 số; ngày `dd/MM/yyyy HH:mm` (`formatOrderDate`).
- Không cập nhật lạc quan: giỏ/badge chỉ đổi theo `cart` server trả (`applyCart`). Nút đang gửi dùng `aria-disabled` + `aria-busy` (KHÔNG `disabled`) để không mất focus.
- Mỗi màn có đủ 4 trạng thái: loading (skeleton `role="status"` có chữ ẩn) / rỗng (`EmptyState`) / lỗi (`ErrorState` + Thử lại) / có dữ liệu. Lỗi thao tác nền qua toast `tone: 'error'`.
- `document.title`: "Giỏ hàng", "Đặt hàng", "Đơn hàng DHxxxxxx", "Quản lý đơn hàng", "Đơn DHxxxxxx" (hậu tố " — Try-on").
- 401 do `apiClient` xử lý chung. Token hết hạn giữa checkout -> `/login?redirect=/checkout&reason=expired`; quay lại sinh khoá idempotency mới (giỏ còn nguyên).

## Nút "Thêm vào giỏ" và badge giỏ (US-07)

Code: `components/tryOn/AddToCartButton.jsx` (trong `ProductPanel`, ngay dưới khối sản phẩm); `components/cart/CartLink.jsx` (badge).

### Nút "Thêm vào giỏ"
- Mô tả: nút primary `rounded-full min-h-12` (full width mobile, tự co từ `sm`), icon túi + "Thêm vào giỏ". Dùng sản phẩm **đang hiển thị**, độc lập với trạng thái ảnh thử đồ (đang tạo / lỗi / hết lượt vẫn thêm được).
- Trạng thái: default; hover (`accent-dark`); focus-visible (outline global); **đang thêm** (theo từng sản phẩm): nhãn "Đang thêm…", `aria-disabled="true"` + `aria-busy`, mờ 70%, bỏ qua click; chuyển sang sản phẩm khác thì nút bấm lại được (request cũ không bị huỷ). Không có trạng thái `disabled` thật.
- Dòng dưới nút (khi sản phẩm đã có trong giỏ theo `cart` server): "Đã có {n} trong giỏ. Xem giỏ hàng".
- Kết quả (toast, một toast tại một thời điểm, có liên kết "Xem giỏ hàng" -> `/cart`, giữ 7 giây):
  - 201 dòng mới: "Đã thêm {tên} vào giỏ."; badge = `cart.itemCount`.
  - 200 đã có (client suy ra: `item.quantity !== quantity` đã gửi): "{tên} đã có trong giỏ, số lượng: {n}."
  - 409 `CART_QUANTITY_LIMIT`: toast lỗi "Mỗi sản phẩm chỉ đặt tối đa 10 chiếc."
  - 409 `CART_FULL`: toast lỗi (message server) + liên kết "Xem giỏ hàng".
  - 404 `PRODUCT_NOT_FOUND`: toast lỗi + tải lại danh sách sản phẩm (`room.reloadList`).
  - 429 / 500 / mạng: toast lỗi `error.message`, nút bấm lại được.
- **Không ảnh hưởng điều hướng phòng thử đồ**: là `<button>` thường (Enter/Space), không bắt phím mũi tên, không dùng `disabled` (tránh mất focus -> ←/→ vẫn bắt được ở vùng phòng thử đồ); không có phím tắt. Đã kiểm tra bằng trình duyệt: bấm nút xong ←/→ vẫn đổi sản phẩm, kể cả khi request còn đang bay; focus vẫn ở nút.
- Hiệu ứng: `transition-colors`; toast xuất hiện không animation (tôn trọng reduced-motion).
- Tab order trong `ProductPanel`: link "Chọn danh mục khác" -> nút Thêm vào giỏ -> (link Xem giỏ hàng) -> thanh thu nhỏ.

### Badge giỏ (`CartLink`) và mục "Giỏ hàng" trong `AccountMenu`
- `CartLink`: icon túi `size-11` (44px) ở header `MainLayout` (mọi cỡ) và `LandingHeader` (desktop cạnh `AccountMenu`; mobile cạnh nút hamburger), chỉ khi đã đăng nhập. Badge tròn `bg-accent` chữ trắng góc trên phải: ẩn khi 0, "99+" khi > 99. Tên truy cập "Giỏ hàng, {n} sản phẩm" (badge `aria-hidden`, nên số không chỉ dựa vào hình).
- `AccountMenu` (dropdown và inline mobile): mục "Giỏ hàng" (`/cart`) sau "Phòng thử đồ", kèm pill số lượng (chữ `sr-only` "{n} sản phẩm").
- Nạp: `CartProvider` gọi `GET /api/cart` khi đăng nhập/khôi phục phiên và khi tab lấy lại focus (`visibilitychange`, nạp nền không nháy); cập nhật theo mọi response giỏ; đăng xuất -> xoá state. Nạp lỗi: badge giữ giá trị cũ / ẩn, không toast.

## Giỏ hàng — `/cart`

### Mục đích
Xem và sửa giỏ (đổi số lượng, xoá dòng), xem tổng tiền, sang đặt hàng. Quyền: đã đăng nhập.

### Các thành phần chính
1. **Tiêu đề** `h1` "Giỏ hàng" (Playfair, `tabIndex=-1`: nhận focus sau khi xoá một dòng).
2. **Danh sách dòng** (`ul aria-label="Sản phẩm trong giỏ"`, `CartLine`): thẻ `rounded-2xl border bg-surface p-4`: flat lay 3:4 (`ProductThumb`, `w-20 sm:w-24`, ảnh lỗi/null -> ô giữ chỗ "Không có ảnh"), tên (link tới `/try-on/:categoryId?product=:id`, tối đa 2 dòng, `break-words`), danh mục, đơn giá, `QuantityStepper`, thành tiền (`tabular-nums`, nhãn `sr-only` "Thành tiền"), nút "Xoá".
   - **Bộ chọn số lượng**: − / + (44px, không ô gõ). "−" `aria-disabled` ở 1, "+" ở `limits.maxQuantity` (10). Bấm đổi số hiển thị ngay, gửi `PUT` sau 300 ms không bấm thêm; trong lúc chờ/gửi dòng hiện "Đang cập nhật…", stepper bị chặn khi đang gửi; thành công -> thay cả giỏ theo server; lỗi -> số lượng khôi phục theo server + toast. 404 `CART_ITEM_NOT_FOUND` -> toast "Sản phẩm không còn trong giỏ." rồi tải lại giỏ.
   - **Xoá**: nút `accent-dark` có icon + chữ, `aria-label="Xoá {tên} khỏi giỏ hàng"`; không hộp thoại xác nhận; thành công toast "Đã xoá {tên}." và focus về `h1`; đang xoá dòng mờ 60% `aria-busy`.
3. **Tóm tắt** (`aside aria-label="Tóm tắt giỏ hàng"`, `rounded-3xl shadow-card`, `lg:sticky`): "Số lượng: {itemCount} sản phẩm", **Tổng tiền** (`aria-live="polite"`), ghi chú "Giá có thể thay đổi; giá cuối cùng được chốt khi bạn đặt hàng. Chưa gồm phí vận chuyển.", nút primary "Đặt hàng" (-> `/checkout`), nút outline "Tiếp tục thử đồ" (-> `/try-on`).

### Trạng thái
| Trạng thái | Hiển thị |
|-----------|----------|
| Loading (chưa có giỏ) | Skeleton 3 dòng + khối tóm tắt, `role="status"` "Đang tải giỏ hàng…". Đã có giỏ (từ badge) thì nạp nền, không nháy |
| Rỗng (`items = []`) | `EmptyState` icon túi "Giỏ hàng trống", "Hãy vào phòng thử đồ, ưng món nào thì thêm vào giỏ." + nút "Vào phòng thử đồ" |
| Lỗi tải | `ErrorState` "Không tải được giỏ hàng" + `error.message` + Thử lại |
| Có dữ liệu | Danh sách + tóm tắt |

Sản phẩm bị admin xoá tự biến khỏi giỏ, đổi giá hiện giá mới ở lần nạp sau (không thông báo riêng, Q30). Tên rất dài: cắt 2 dòng, không làm tràn ngang.

### Responsive
- Mobile (375px): một cột; thẻ dòng: ảnh trái, thông tin phải (stepper và thành tiền cùng hàng, wrap nếu hẹp), tóm tắt dưới danh sách; nút full width. Không cuộn ngang.
- Tablet (768px): một cột, thẻ rộng hơn. Desktop (1280px): hai cột `1fr | 22rem`, tóm tắt dính khi cuộn.

### Navigation
- Đến từ: `CartLink`/`AccountMenu`, toast "Xem giỏ hàng", `AddToCartButton`, `/checkout` (giỏ rỗng, "Sửa giỏ hàng", `CART_EMPTY`). Đi tới: `/checkout`, `/try-on`, `/try-on/:categoryId?product=`.

### A11y
Vùng chạm >= 44px; stepper là `role="group"` có nhãn "Số lượng {tên}", giá trị `aria-live="polite"`; nút `aria-label` có tên sản phẩm; trạng thái bằng chữ.

## Đặt hàng — `/checkout`

### Mục đích
Nhập thông tin giao hàng và xác nhận đơn (COD). Quyền: đã đăng nhập. Mở trang: sinh `idempotencyKey = crypto.randomUUID()` (state trang), **giữ nguyên khi gửi lại** (lỗi mạng/5xx/bấm lại); tải lại trang hoặc mở lại `/checkout` -> khoá mới.

### Các thành phần chính
1. **Tiêu đề** `h1` "Đặt hàng" + mô tả.
2. **Form "Thông tin giao hàng"** (`CheckoutForm`, `noValidate`, `rounded-3xl shadow-card`): Họ tên người nhận (điền sẵn `displayName`, `autoComplete=name`), Số điện thoại (`type=tel inputMode=tel`, điền sẵn `profile.phone`, bắt buộc; chuẩn hoá `+84`/`84` -> `0`, regex `^0[35789][0-9]{8}$`), Địa chỉ giao hàng (textarea 10–500 ký tự, hint), Ghi chú (tuỳ chọn, <= 500). Lỗi hiện dưới từng ô (`aria-invalid`/`aria-describedby`), focus ô lỗi đầu tiên khi gửi. 400 `VALIDATION_ERROR` của server được map vào đúng ô (`error.fields`).
3. **Thanh toán**: thẻ cố định (không phải input) viền `accent`: dấu tích + "Thanh toán khi nhận hàng (COD)" + giải thích (Q28).
4. **Tóm tắt đơn** (`aside`, `lg:sticky`): các dòng (thumb, tên, `đơn giá × SL`, thành tiền), link "Sửa giỏ hàng", **Tổng tiền** (`aria-live`), "Chưa gồm phí vận chuyển.", vùng thông báo, nút "Xác nhận đặt hàng". Nút thuộc form qua thuộc tính `form` nên nằm cuối trang trên mobile (ngay sau tổng tiền) mà Enter trong ô vẫn gửi form.
5. **Thông báo** (`role="alert"` trong tóm tắt): `CART_CHANGED` = khung `sand` viền `gold` "Giỏ hàng vừa thay đổi (giá hoặc sản phẩm). Vui lòng kiểm tra lại trước khi đặt hàng." (hiện sau khi tóm tắt đã cập nhật); lỗi 429/500/mạng = khung đỏ nhạt với `error.message`.

### Hành vi theo kết quả `POST /api/orders`
- 201/200: badge về 0 (`applyCart` giỏ rỗng), `navigate('/orders/:id', { replace, state: { placed: true } })`.
- 409 `CART_CHANGED`: tải lại giỏ, tóm tắt/tổng cập nhật, **giữ nguyên dữ liệu form**, rồi hiện banner; bấm xác nhận lại dùng `expectedTotal` mới (cùng `idempotencyKey`).
- 409 `CART_EMPTY`: toast lỗi, về `/cart` (replace).
- 400: lỗi theo ô. 429/500/mạng: khung lỗi trên nút, bấm lại dùng CÙNG `idempotencyKey`.
- Đang gửi: nút "Đang đặt hàng…" `aria-disabled`, các ô `disabled`.
- Không lưu SĐT/địa chỉ vào hồ sơ (Q27), không lưu form vào `localStorage`.

### Trạng thái
Loading: skeleton "Đang tải thông tin đặt hàng…" (giỏ + hồ sơ song song; lỗi hồ sơ không chặn, chỉ không điền sẵn). Giỏ rỗng: `navigate('/cart', { replace })` (thấy EmptyState ở `/cart`). Lỗi tải giỏ: `ErrorState` "Không tải được thông tin đặt hàng" + Thử lại. Có dữ liệu: form + tóm tắt.

### Responsive
Mobile: một cột (form -> thanh toán -> tóm tắt + nút). Desktop (>= 1024px): `1fr | 24rem`, tóm tắt dính. 375px không cuộn ngang.

### Navigation
Đến từ `/cart`, URL trực tiếp. Đi tới `/orders/:id`, `/cart`.

## Xác nhận đơn — `/orders/:id`

### Mục đích
Xem đơn của chính mình; là trang "Đặt hàng thành công". Quyền: đã đăng nhập, chỉ chủ đơn (đơn người khác = 404, không lộ).

### Các thành phần chính
1. **Tiêu đề**: khi đến từ `/checkout` (router state `placed`): khối `blush` dấu tích + `h1` "Đặt hàng thành công" + "Mã đơn của bạn là DHxxxxxx. Bạn thanh toán khi nhận hàng."; vào lại: `h1` "Đơn hàng DHxxxxxx". `h1` nhận focus khi tải xong. (Reload giữ `placed` vì nằm trong history state; chấp nhận được.)
2. **Thông tin đơn** (`OrderInfo`, `dl`): Mã đơn, Ngày đặt, Trạng thái (`OrderStatusBadge` "Chờ xử lý"), Thanh toán (COD), Người nhận, SĐT, Địa chỉ, Ghi chú ("Không có" khi rỗng).
3. **Sản phẩm** (`OrderItems`): bảng từ `sm` (Ảnh, Sản phẩm + danh mục, Đơn giá, SL, Thành tiền, hàng tổng), thẻ trên mobile + khối tổng. Dùng snapshot tên/giá lúc đặt. `productId = null` -> ô giữ chỗ + nhãn "Sản phẩm đã ngừng bán".
4. Nút "Tiếp tục thử đồ" (`/try-on`).

### Trạng thái
Loading: skeleton "Đang tải đơn hàng…". 404 `ORDER_NOT_FOUND`: `EmptyState` "Không tìm thấy đơn hàng" + "Vào phòng thử đồ". Lỗi: `ErrorState` + Thử lại. Có dữ liệu như trên.

### Responsive
Một cột mọi cỡ trong `max-w-5xl`; bảng chuyển thẻ dưới 640px; 375px không cuộn ngang.

## Admin: Đơn hàng — `/admin/orders`

Quyền: Admin (`RequireAuth` -> `RequireAdmin`; user thường `ForbiddenPage`; 403 giữa phiên -> `ForbiddenPage`). Trong `AdminLayout` (menu 3 pill; "Đơn hàng" active cả ở chi tiết). Chỉ xem (Q29).

### Các thành phần chính
1. `h2` "Đơn hàng" (`tabIndex=-1`) + mô tả.
2. **Bộ lọc trạng thái** (`SelectField`: Tất cả trạng thái / Chờ xử lý / Đã xác nhận / Đang giao / Hoàn tất / Đã huỷ) + dòng đếm `aria-live` "{n} đơn" / "Đang tải…". Trạng thái ở URL `?status=&page=`; đổi lọc đặt lại trang 1 (push history).
3. **Danh sách** (`OrderList`): bảng từ `sm` — Mã đơn (link, `tabular-nums`), Ngày đặt, Khách hàng (tên + email, `break-all`), Người nhận (từ `lg`), Số món, Tổng tiền, Trạng thái (`OrderStatusBadge`: chữ + màu); thẻ trên mobile. **Không có SĐT/địa chỉ/ghi chú** (chỉ ở chi tiết). Mới nhất trước.
4. **Phân trang** (`Pagination`, 20 đơn/trang): "Trang trước" / dãy số rút gọn (từ `sm`) / "Trang sau"; mobile "Trang n/N". Nút `aria-disabled`, trang hiện tại `aria-current="page"`. Đổi trang: push `?page=n`, cuộn lên đầu và focus `h2`. Ẩn khi chỉ 1 trang.

### Trạng thái
| Trạng thái | Hiển thị |
|-----------|----------|
| Loading (lần đầu, đổi lọc/trang) | Skeleton 5 hàng `role="status"` "Đang tải đơn hàng…" |
| Rỗng, không lọc | `EmptyState` "Chưa có đơn hàng nào" |
| Rỗng khi lọc | `EmptyState` "Không có đơn ở trạng thái này" + nút "Xem tất cả" |
| Lỗi | `ErrorState` "Không tải được đơn hàng" + Thử lại |
| Có dữ liệu | Bảng/thẻ + phân trang |

Tham số URL sai (`status` lạ, `page` không phải số dương) hoặc 400 từ server: bỏ tham số (replace) và tải lại. `page` vượt `totalPages` (server trả `orders: []`): nhảy về trang cuối (replace).

### Responsive
Mobile (375px): thẻ; Tablet (768px): bảng 6 cột (ẩn "Người nhận"); Desktop (1280px): bảng đủ 7 cột. Không cuộn ngang trang.

### Navigation
Đến từ menu admin. Đi tới `/admin/orders/:id` (link mang `state.listSearch` để quay lại đúng `?status&page`).

## Admin: Chi tiết đơn — `/admin/orders/:id`

### Các thành phần chính
1. Link "← Danh sách đơn hàng" (về `/admin/orders` + `?status&page` đã giữ trong `location.state.listSearch`, không có thì `/admin/orders`) và `h2` "Đơn hàng DHxxxxxx".
2. `OrderInfo` (cùng trang người mua, thêm dòng **Khách hàng**: tên + email) với đủ SĐT, địa chỉ, ghi chú.
3. `OrderItems`: bảng/thẻ dòng (snapshot), dòng sản phẩm đã xoá có nhãn "Sản phẩm đã ngừng bán" (không link), tổng tiền.
- Không có nút đổi trạng thái (Q29).

### Trạng thái
Loading skeleton "Đang tải đơn hàng…"; 404 `ORDER_NOT_FOUND`: `EmptyState` "Không tìm thấy đơn hàng" + "Về danh sách đơn"; 403: `ForbiddenPage`; lỗi: `ErrorState` + Thử lại; có dữ liệu như trên. `h2` nhận focus khi tải xong.

### Responsive
Một cột; bảng dòng chuyển thẻ dưới 640px; 375px không cuộn ngang.

## Điểm nối API (Sprint 4 Task 5) — ĐÃ HOÀN THÀNH

Các `TODO(Task5)` đã được xử lý ngày 2026-11-24: hàm API chuyển sang `services/*Api.js` (bảng dưới giữ làm tham chiếu hợp đồng); `addCartItem(productId, quantity)` không còn tham số `hint`. Bản gốc danh sách TODO:


Mọi `TODO(Task5)` nằm ở hai file API; thay thân hàm bằng `apiClient`, giữ chữ ký và giá trị trả về (shape đúng `cart-and-orders.md` mục 2), rồi xoá mock.

| File / hàm | Endpoint | Trả về | Ghi chú |
|------------|----------|--------|---------|
| `services/cartApi.js` `getCart({ signal })` | `GET /api/cart` | `{ cart }` | `CartProvider.refresh`, `CartPage`, `CheckoutPage` |
| `addCartItem(productId, quantity, hint)` | `POST /api/cart/items { productId, quantity }` | `{ cart, item, created }` | `created` suy ra `item.quantity === quantity` (apiClient không trả 201/200); **bỏ tham số `hint`** (chỉ cho mock). Dùng ở `AddToCartButton` |
| `updateCartItem(productId, quantity)` | `PUT /api/cart/items/:productId { quantity }` | `{ cart }` | `CartPage.handleUpdate`; 404 `CART_ITEM_NOT_FOUND` đã xử lý |
| `removeCartItem(productId)` | `DELETE /api/cart/items/:productId` | `{ cart }` | `CartPage.handleRemove` |
| `services/orderApi.js` / `services/adminApi.js` `placeOrder(body)` | `POST /api/orders` | `{ order }` | `CheckoutPage.handleSubmit`; body `{ idempotencyKey, recipientName, phone, shippingAddress, note, expectedTotal }` (note có thể `null`) |
| `getOrder(id, { signal })` | `GET /api/orders/:id` | `{ order }` | `OrderPage`; 404 -> EmptyState |
| `adminListOrders({ status, page, pageSize, signal })` | `GET /api/admin/orders?status&page&pageSize` | `{ orders, pagination }` | `AdminOrdersPage`; chỉ đưa tham số có giá trị vào query |
| `adminGetOrder(id, { signal })` | `GET /api/admin/orders/:id` | `{ order }` | `AdminOrderDetailPage` (có thể chuyển 2 hàm admin sang `services/adminApi.js`) |

Việc cần làm khi nối: (1) xoá `src/mocks/cartMock.js`, `orderMock.js`, `mockFlags.js`; `grep` đảm bảo sạch `cartMock|orderMock|mockFlags|hasMockFlag|?mock=`. (2) `profile` ở checkout lấy từ `services/userApi.fetchProfile` (API thật, đã có). (3) Kiểm tra `error.code`/`error.fields` đúng README (đã dùng sẵn: `CART_FULL`, `CART_QUANTITY_LIMIT`, `CART_ITEM_NOT_FOUND`, `CART_EMPTY`, `CART_CHANGED`, `PRODUCT_NOT_FOUND`, `ORDER_NOT_FOUND`, `VALIDATION_ERROR`). (4) Thêm test: `CartProvider` (badge, xoá khi logout), checkout giữ `idempotencyKey` khi gửi lại, `CART_CHANGED` giữ form (đã có test đơn vị cho validate, stepper, phân trang). (5) Chưa làm (cố ý): nút "Thêm vào giỏ" không tự vô hiệu khi đã đủ 10 trong giỏ (dựa vào 409); `PRODUCT_NOT_FOUND` ở phòng thử đồ tải lại danh sách nhưng chưa giữ vị trí gần nhất (`reloadList` về sản phẩm đầu).
