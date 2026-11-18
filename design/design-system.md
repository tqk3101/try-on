# Design System — Try-on

Phong cách: **fashionista / editorial** — nền ngà ấm, chữ serif có tương phản cao cho tiêu đề, màu nhấn mâm xôi (raspberry), nhiều khoảng trắng, bo góc lớn. Token được định nghĩa trong `frontend/src/index.css` (khối `@theme`, Tailwind v4, không có `tailwind.config.js`). Component dùng utility theo token (`bg-canvas`, `text-ink`, `font-display`...), không hardcode mã màu.

## Màu sắc

| Token | Hex | Dùng cho | Tương phản |
|-------|-----|----------|-----------|
| `canvas` | `#faf7f2` | Nền trang | — |
| `surface` | `#ffffff` | Nền section sáng, card | — |
| `blush` | `#f6e3e6` | Nền icon, gradient hình minh hoạ | — |
| `sand` | `#efe8dd` | Nền section nhấn | — |
| `ink` | `#17141a` | Chữ chính, nút tối | 17:1 trên canvas |
| `ink-soft` | `#4b4650` | Chữ mô tả | ~8:1 trên canvas |
| `muted` | `#6b6470` | Chữ phụ (footer, caption) | ~5:1 trên canvas |
| `line` | `#e6dfd5` | Viền, đường kẻ | UI trang trí |
| `accent` | `#b4234f` | CTA chính, eyebrow, nhấn | chữ trắng trên accent ~6.5:1 |
| `accent-dark` | `#8f1a3e` | Hover CTA, gradient | ~9:1 với chữ trắng |
| `gold` | `#b08d57` | Chi tiết trang trí / giá trên nền tối (không dùng làm chữ trên nền sáng) | — |

Trạng thái: lỗi dùng `accent-dark` kèm icon/chữ (không chỉ màu). Màu success/warning sẽ bổ sung ở sprint sau khi cần.

## Typography

- Display (tiêu đề): **Playfair Display** 500/600/700 + italic 500 — token `font-display`.
- Body/UI: **Inter** 400/500/600 — token `font-sans` (mặc định của `body`).
- Cả hai nạp qua Google Fonts trong `index.html` (hỗ trợ tiếng Việt), có fallback hệ thống.

| Vai trò | Class | Ghi chú |
|---------|-------|---------|
| H1 hero | `font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1]` | một từ nhấn dùng `<em>` màu `accent` |
| H2 section | `font-display text-3xl sm:text-4xl font-semibold` | |
| H3 card | `font-display text-xl/2xl font-semibold` | |
| Body | `text-base` (hero `sm:text-lg`), `text-ink-soft` | |
| Eyebrow | `text-xs font-semibold uppercase tracking-[0.25em] text-accent` | |
| Caption | `text-xs/sm text-muted` | |

Tối đa 3–4 cỡ chữ trên một màn hình.

## Khoảng cách, bố cục, bo góc, đổ bóng

- Lưới 4/8px (thang Tailwind mặc định). Section: `py-16 md:py-24`. Container: `mx-auto max-w-6xl px-4 sm:px-6`.
- Bo góc: nút `rounded-full`; card `rounded-3xl`; khối lớn/hình thử đồ `rounded-[2rem]`.
- Đổ bóng: `shadow-card` (card nổi nhẹ), `shadow-float` (CTA nổi, dự phòng).
- Ảnh thử đồ giữ tỉ lệ `aspect-[3/4]`, không méo/cắt.

## Breakpoints (Tailwind mặc định)

Mobile < 640px (`base`), Tablet 640–1024px (`sm`, `md` 768, `lg` 1024), Desktop > 1024px. Thiết kế mobile-first. Header chuyển sang menu ngang tại `md` (768).

## Icon

SVG inline trong `frontend/src/components/icons.jsx`: stroke 1.6, 24x24, `currentColor`, `aria-hidden` (icon trang trí; nút icon luôn có `aria-label`). Chưa dùng thư viện icon.

## Animation

- `animate-rise` (0.7s, ease-out mạnh, fade + dịch 16px) cho hero khi vào trang; `animate-float` (6s) cho thẻ sản phẩm nổi.
- Hover card: `-translate-y-1` + `shadow-card`, `duration-300`. Chỉ dùng `transform`/`opacity`.
- `prefers-reduced-motion: reduce` tắt gần hết animation/transition và smooth scroll (đã cấu hình global trong `index.css`).

## Component dùng chung

| Component | File | Ghi chú |
|-----------|------|---------|
| Logo | `components/Logo.jsx` | Chữ "Try-on" Playfair, dấu `-` màu accent, link về `/` |
| AuthLink | `components/AuthLink.jsx` | Liên kết tới `/login`, `/register`; variant `primary` / `outline` / `light` (nút bo tròn) hoặc `text` (chữ gạch chân trong câu); `compact` ẩn nhãn "Sắp ra mắt" (chỉ còn cho trình đọc màn hình). Khi `AUTH_ROUTES_READY[to]=false` (`routes/paths.js`) nút render `<button aria-disabled>`, variant `text` render chữ thường |
| AuthLayout | `components/AuthLayout.jsx` | Khung trang đăng ký/đăng nhập: logo + thẻ form `max-w-md rounded-3xl shadow-card` |
| TextField | `components/TextField.jsx` | Ô nhập có nhãn, gợi ý, lỗi (`aria-invalid`/`aria-describedby`); `type="password"` có nút Hiện/Ẩn. Input `min-h-12 rounded-2xl`, viền `line`, lỗi viền `red-600` + chữ `red-700` |
| PasswordStrength | `components/PasswordStrength.jsx` | Thanh độ mạnh 4 đoạn + danh sách điều kiện mật khẩu; trạng thái luôn có chữ |
| Nút CTA | `rounded-full min-h-11 px-6 text-sm font-semibold` | Vùng chạm tối thiểu 44px; focus-visible là outline 2px `accent` (global) |
| Icons | `components/icons.jsx` | |

Component dùng riêng landing nằm ở `components/landing/` (xem `screens.md`). Khi thêm Button/Input/Card/Modal dùng chung ở sprint sau, đặt vào `components/` và ghi vào bảng trên.

## Thành phần phòng thử đồ (Sprint 3)

Chỉ dùng token hiện có; đặt trong `components/tryOn/`. Màn dùng: `screens.md` mục "Phòng thử đồ".

| Component | File | Mô tả và quy tắc |
|-----------|------|------------------|
| TryOnStage | `components/tryOn/TryOnStage.jsx` | Khung ảnh `aspect-[3/4] rounded-[2rem] bg-sand shadow-card`, ảnh `object-contain`, `touch-pan-y select-none`, `role="group"` + `tabIndex=0`. Có **lớp trạng thái** (một lớp tại một thời điểm): ảnh thành công (fade-in) / đang tạo (ảnh toàn thân mờ + thẻ flat lay + "Đang thử đồ {tên}…" + bộ đếm giây) / lỗi (`role="alert"`, nền `red-50`, nút Thử lại) / hết lượt. Nhãn "Ảnh mô phỏng" (pill `bg-ink/80` chữ trắng). Chứa **nút mũi tên nổi** |
| Nút mũi tên nổi | trong `TryOnStage` | `size-11` (44px), `rounded-full bg-surface/85 backdrop-blur shadow-card`, hover `scale-105`, `disabled:opacity-40`; đặt ở mép trong khung ảnh, giữa theo chiều dọc; luôn có `aria-label` ("Sản phẩm trước"/"Sản phẩm tiếp theo") |
| ProductPanel | `components/tryOn/ProductPanel.jsx` | Cột thông tin: tên danh mục, `n/N`, tên, giá `formatVnd`, flat lay `w-24 aspect-[3/4]`, badge hạn mức (`sand` / `blush`, luôn có chữ), danh sách thu nhỏ (nút `w-14 min-h-11`, viền `accent` khi chọn), thẻ "Đã xem hết" |
| ProfileGate | `components/tryOn/ProfileGate.jsx` | Màn "Hoàn thiện hồ sơ để thử đồ": 3 mục luôn hiện kèm chữ "Đã có"/"Còn thiếu", nút primary tới `/profile` |
| ConsentDialog | `components/tryOn/ConsentDialog.jsx` | Bọc `ConfirmDialog` (nhãn "Đồng ý" primary / "Để sau") |
| ConfirmDialog (mở rộng) | `components/ConfirmDialog.jsx` | Thêm prop tuỳ chọn `error` (khung `role="alert"` đỏ nhạt giữa mô tả và nút); mặc định rỗng nên `/profile` và admin không đổi |
| Token animation `animate-fade-in` | `index.css` (`@theme`) | `fade-in 0.4s ease-out`, chỉ `opacity` |
| CheckIcon | `components/icons.jsx` | Dấu tích, cùng phong cách (stroke 1.6) |

**Quy tắc áp dụng**: chữ trạng thái chờ chuẩn hoá "Đang thử đồ {tên}…"; bộ đếm giây không phải live region; mọi trạng thái (đang tạo, lỗi, hết lượt, cuối danh sách) có chữ, không chỉ màu/icon; chuyển sản phẩm không có animation trượt (tôn trọng `prefers-reduced-motion`).

## Thành phần admin dùng chung (Sprint 2)

Chỉ dùng token hiện có (không thêm màu mới). Đặt trong `components/admin/` (riêng khu quản trị) hoặc `components/` (dùng chung) như cột "File dự kiến". Màn dùng: `screens.md` mục "Khu vực Admin".

| Component | File dự kiến | Mô tả và quy tắc |
|-----------|--------------|------------------|
| DataTable | `components/admin/DataTable.jsx` | **Từ `sm`/`md`**: `<table>` trong thẻ `rounded-3xl bg-surface shadow-card overflow-hidden`; `<caption class="sr-only">`, `<th scope="col">` chữ `text-xs font-semibold uppercase tracking-wider text-muted` trên nền `canvas`; hàng `border-t border-line`, hover `bg-canvas`, ô `px-4 py-3`. **Mobile**: cùng dữ liệu hiển thị là `<ul>` thẻ `rounded-2xl border border-line bg-surface p-4` (tên đậm, thông tin phụ, hàng nút thao tác). Nhận `columns`, `rows`, `renderCard`; trạng thái loading/empty/error do trang quyết định qua `SkeletonRows`, `EmptyState`, `ErrorState`. Cột số (giá) căn phải, `tabular-nums` |
| RowActions | trong `DataTable` | Nút "Sửa" (outline nhỏ) và "Xoá" (chữ `accent-dark`, viền `accent-dark/40`), icon + chữ, `min-h-11 min-w-11`, `aria-label` có tên đối tượng. Khi hàng đang xoá: `disabled opacity-60` |
| Badge | `components/Badge.jsx` | `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold`. Tone `neutral` (`bg-sand text-ink-soft`), `accent` (`bg-blush text-accent-dark`). Luôn có chữ (không chỉ màu); dạng link thêm gạch chân khi hover và focus ring |
| EmptyState | `components/EmptyState.jsx` | Thẻ nét đứt `rounded-3xl border border-dashed border-line bg-surface p-10 text-center`: icon trong vòng `bg-blush`, tiêu đề `font-display text-xl`, mô tả `text-ink-soft`, tối đa 1 nút hành động (primary) + 1 link phụ. Props: `icon`, `title`, `description`, `action` |
| ErrorState | `components/ErrorState.jsx` | `role="alert"`, thẻ `rounded-3xl border border-red-200 bg-red-50 p-6` (cùng cặp màu lỗi `red-600/700` của `TextField`): tiêu đề, `error.message`, nút **Thử lại** (outline). Mẫu giống khối lỗi tải ở `/profile` |
| SkeletonRows | trong `DataTable` / trang | Khối `animate-pulse rounded-xl bg-sand`, dạng thumbnail 3:4 + 2 thanh chữ; bọc `role="status"` có chữ ẩn `sr-only` "Đang tải…" |
| PriceField | `components/admin/PriceField.jsx` | Bọc `TextField`: `inputMode="numeric"`, hậu tố "₫" (`absolute inset-y-0 right-4 text-muted`, `pr-10`), hiển thị tách nghìn bằng dấu chấm, giá trị trả về cho form là **chuỗi chữ số thuần**; tối đa 9 chữ số; hint "Đơn vị: VND." Dùng `formatVnd(n)` (`Intl.NumberFormat('vi-VN')` + " ₫") ở `utils/format.js` cho mọi nơi hiển thị giá |
| SelectField | `components/SelectField.jsx` | `<select>` cùng khung `TextField` (`min-h-12 rounded-2xl border bg-surface`, mũi tên chevron CSS, `appearance-none`), có label, hint, error (`aria-invalid`, `aria-describedby`) |
| ProductImageField | `components/admin/ProductImageField.jsx` | Khung `aspect-[3/4] rounded-2xl bg-sand border border-dashed border-line`, `object-contain`; nút Chọn ảnh / Thay ảnh / Bỏ ảnh đã chọn (outline, `min-h-11`); lớp phủ spinner khi lưu; lỗi `role="alert"` dưới khung. Tách logic kiểm tra loại/dung lượng dùng chung với `AvatarField` (`utils/avatarCheck.js`) |
| FormDialog | `components/FormDialog.jsx` | `<dialog>` gốc + `showModal` cùng kiểu `ConfirmDialog` (`max-w-md rounded-3xl bg-surface shadow-float backdrop:bg-ink/50`): tiêu đề `font-display text-2xl`, nội dung là form, nút Huỷ + Lưu; `busy` chặn Esc/bấm nền; trả focus về nút mở; focus ban đầu ở ô nhập đầu tiên (không phải nút) |
| ConfirmDialog (mở rộng) | `components/ConfirmDialog.jsx` (đã chuyển từ `components/profile/`, Sprint 3 Task 7) | Tái dùng cho xoá danh mục / sản phẩm. Thêm props tuỳ chọn, giữ mặc định hiện tại để `/profile` không đổi: `busyLabel` (mặc định "Đang xoá…"), `confirmTone` (`'danger'` mặc định = `bg-accent-dark`; `'primary'` = `bg-accent`, dùng cho "Xem sản phẩm"). Focus ban đầu luôn ở nút hủy an toàn |
| Toast (mở rộng) | `components/ToastProvider.jsx` | Hiện chỉ có 1 kiểu (pill `bg-ink`, `aria-live="polite"`, 4s). Thêm đối số tuỳ chọn `showToast(text, { tone })`: `'default'` như hiện tại; `'error'` nền `accent-dark`, tiền tố icon cảnh báo, vùng `role="alert"` (assertive) và giữ 6s. Chữ trắng trên `accent-dark` ~9:1. Vẫn một toast tại một thời điểm |
| Icons mới | `components/icons.jsx` | Thêm cùng phong cách (stroke 1.6, 24x24): `PlusIcon`, `PencilIcon`, `TrashIcon`, `ImageIcon`, `AlertIcon`, `ArrowLeftIcon` |

**Quy tắc áp dụng**
- Nút nguy hiểm (Xoá) không dùng đỏ tươi mới: dùng `accent-dark`; hộp thoại luôn focus nút an toàn (Huỷ/Đóng) trước.
- Lỗi luôn có chữ + vị trí cạnh nguồn lỗi: lỗi trường dưới ô, lỗi chung trong khung `role="alert"` phía trên nút gửi, lỗi thao tác nền (xoá) qua toast `tone: 'error'`.
- Trạng thái mỗi danh sách bắt buộc đủ 4 nhánh: loading (skeleton) / empty (`EmptyState`) / error (`ErrorState` có Thử lại) / có dữ liệu.
- Hiệu ứng: dòng mới vừa thêm `bg-blush` mờ dần 1.5s; dialog fade/scale 150ms; chỉ `transform`/`opacity`; tắt theo `prefers-reduced-motion` (đã cấu hình global).
- Vùng chạm mọi nút/link trong bảng và thẻ >= 44x44px; thông tin không chỉ dựa vào màu (badge luôn có chữ).
- Định dạng: giá "199.000 ₫", ngày `dd/MM/yyyy` (`toLocaleDateString('vi-VN')`).

## Accessibility cố định

Semantic landmark (`header`, `nav`, `main`, `footer`), link "Bỏ qua tới nội dung chính", `:focus-visible` toàn cục, vùng chạm >= 44px, không truyền tải thông tin chỉ bằng màu, `lang="vi"`.
