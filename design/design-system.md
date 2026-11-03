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

## Accessibility cố định

Semantic landmark (`header`, `nav`, `main`, `footer`), link "Bỏ qua tới nội dung chính", `:focus-visible` toàn cục, vùng chạm >= 44px, không truyền tải thông tin chỉ bằng màu, `lang="vi"`.
