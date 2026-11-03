import { ArrowLeftIcon, ArrowRightIcon } from '../icons.jsx';

// Minh hoạ thuần SVG/CSS: người mẫu cách điệu mặc váy, kèm sản phẩm flat lay nổi và mũi tên chuyển.
export default function HeroVisual() {
  return (
    <div
      role="img"
      aria-label="Minh hoạ phòng thử đồ: hình người mặc váy với mũi tên chuyển sản phẩm"
      className="relative mx-auto w-full max-w-sm"
    >
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-blush via-sand to-canvas blur-2xl" />

      <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-b from-blush to-sand shadow-card">
        <svg viewBox="0 0 300 400" className="size-full" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="dress" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b4234f" />
              <stop offset="1" stopColor="#6e1230" />
            </linearGradient>
          </defs>
          <ellipse cx="150" cy="378" rx="82" ry="9" fill="#17141a" opacity="0.1" />
          <circle cx="150" cy="70" r="26" fill="#e9c9b4" />
          <path d="M122 60c4-30 52-30 56 0-12-10-44-10-56 0z" fill="#2b2128" />
          <rect x="141" y="94" width="18" height="18" rx="6" fill="#e9c9b4" />
          <path
            d="M112 118c14 8 62 8 76 0l10 52-18 8-8-12v32H128v-32l-8 12-18-8z"
            fill="url(#dress)"
          />
          <path d="M128 198l-26 170h96l-26-170z" fill="url(#dress)" />
          <path d="M128 198h44" stroke="#faf7f2" strokeWidth="3" opacity="0.6" />
          <rect x="116" y="368" width="26" height="8" rx="4" fill="#17141a" />
          <rect x="158" y="368" width="26" height="8" rx="4" fill="#17141a" />
          <path
            d="M102 160l-14 64M198 160l14 64"
            stroke="#e9c9b4"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </svg>

        <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-ink-soft">
          Váy lụa · 1/12
        </span>

        <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-card">
            <ArrowLeftIcon />
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-card">
            <ArrowRightIcon />
          </span>
        </div>

        <span className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white">
          Thêm vào giỏ
          <span className="text-gold">890.000đ</span>
        </span>
      </div>

      {/* Sản phẩm flat lay nổi */}
      <div className="absolute left-1 top-16 w-24 animate-float rounded-2xl border border-line bg-white p-2 shadow-card sm:-left-10 sm:w-28">
        <svg viewBox="0 0 80 80" className="w-full" aria-hidden="true" focusable="false">
          <path
            d="M24 14l-14 10 8 12 8-5v37h28V31l8 5 8-12L56 14c-3 7-9 9-16 9s-13-2-16-9z"
            fill="#efe8dd"
            stroke="#17141a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-center text-[11px] font-medium text-ink-soft">Áo thun</p>
      </div>
      <div
        className="absolute right-1 bottom-28 w-24 animate-float rounded-2xl border border-line bg-white p-2 shadow-card sm:-right-10 sm:w-28"
        style={{ animationDelay: '-3s' }}
      >
        <svg viewBox="0 0 80 80" className="w-full" aria-hidden="true" focusable="false">
          <path
            d="M24 8h32l4 64H44L40 36l-4 36H20z"
            fill="#c9d4e6"
            stroke="#17141a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-center text-[11px] font-medium text-ink-soft">Quần jeans</p>
      </div>
    </div>
  );
}
