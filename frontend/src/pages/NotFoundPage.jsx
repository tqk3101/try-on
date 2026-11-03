import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 text-slate-600">Trang bạn truy cập không tồn tại hoặc đã bị di chuyển.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
      >
        Về trang chủ
      </Link>
    </section>
  );
}
