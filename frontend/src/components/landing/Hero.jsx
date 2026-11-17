import { Link } from 'react-router';
import { PATHS } from '../../routes/paths.js';
import AuthLink from '../AuthLink.jsx';
import HeroVisual from './HeroVisual.jsx';

/** `user` có giá trị (đã đăng nhập) thì CTA chính là "Thử ngay" tới phòng thử đồ. */
export default function Hero({ user = null }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16 lg:grid-cols-2 lg:gap-8">
        <div className="animate-rise text-center lg:text-left">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Virtual try-on · GenAI
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Mặc thử trước,
            <br />
            <em className="font-medium text-accent">mua sau.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base text-ink-soft sm:text-lg lg:mx-0">
            Tải ảnh toàn thân của bạn và xem chính mình diện từng món đồ. Vuốt để đổi, ưng là thêm
            vào giỏ, không còn đoán size hay đoán dáng.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            {user ? (
              <Link
                to={PATHS.tryOn}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-dark"
              >
                Thử ngay
              </Link>
            ) : (
              <AuthLink to="register">Bắt đầu thử đồ</AuthLink>
            )}
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5"
            >
              Xem cách hoạt động
            </a>
          </div>
        </div>

        <div className="animate-rise [animation-delay:150ms]">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
