import AuthLink from '../AuthLink.jsx';

export default function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-gradient-to-br from-accent to-accent-dark px-6 py-14 text-center text-white sm:px-12">
        <h2
          id="cta-title"
          className="font-display text-3xl font-semibold leading-tight sm:text-4xl"
        >
          Sẵn sàng thấy mình trong outfit mới?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/90">
          Tạo hồ sơ trong vài phút và bắt đầu thử đồ ngay hôm nay.
        </p>
        <div className="mt-8 flex justify-center">
          <AuthLink to="register" variant="light">
            Tạo hồ sơ miễn phí
          </AuthLink>
        </div>
      </div>
    </section>
  );
}
