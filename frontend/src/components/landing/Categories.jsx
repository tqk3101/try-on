import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { CATEGORIES } from '../../mocks/landingContent.js';
import { PATHS, tryOnRoomPath } from '../../routes/paths.js';
import { fetchCategories } from '../../services/categoryApi.js';
import SectionHeading from './SectionHeading.jsx';

const MOCK_CARDS = CATEGORIES.map((category) => ({ ...category, to: PATHS.tryOn }));
const normalize = (text) => text.trim().toLocaleLowerCase('vi');
const HINT_BY_NAME = new Map(CATEGORIES.map(({ name, hint }) => [normalize(name), hint]));

/**
 * Thẻ danh mục cho Landing. Guest: thẻ mock dẫn /try-on (guard chuyển sang /login), KHÔNG gọi API
 * (API cần Bearer). User đã đăng nhập: lấy danh mục thật từ GET /api/categories để dẫn thẳng
 * tới /try-on/:categoryId; lỗi hoặc rỗng -> giữ thẻ mock.
 */
function useLandingCards(enabled) {
  const [realCards, setRealCards] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchCategories({ signal: controller.signal })
      .then(({ categories }) => {
        if (!Array.isArray(categories) || categories.length === 0) return;
        setRealCards(
          categories.map((category) => ({
            id: category.id,
            name: category.name,
            hint: HINT_BY_NAME.get(normalize(category.name)) ?? '',
            to: tryOnRoomPath(category.id),
          })),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [enabled]);

  return useMemo(() => (enabled && realCards ? realCards : MOCK_CARDS), [enabled, realCards]);
}

export default function Categories() {
  const { status } = useAuth();
  const cards = useLandingCards(status === 'authenticated');

  return (
    <section
      id="categories"
      aria-labelledby="categories-title"
      className="scroll-mt-16 bg-sand/60 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="categories-title"
          eyebrow="Danh mục"
          title="Chọn phong cách, xem ngay trên bạn"
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-3">
          {cards.map((category, index) => (
            <li key={category.id}>
              <Link
                to={category.to}
                aria-label={`${category.name}: vào phòng thử đồ`}
                className={`group flex aspect-[4/3] min-h-11 flex-col justify-end rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:aspect-[3/4] ${
                  index % 2 === 0
                    ? 'bg-gradient-to-br from-blush to-white'
                    : 'bg-gradient-to-br from-white to-blush'
                } border border-white shadow-card`}
              >
                <h3 className="break-words font-display text-2xl font-semibold text-ink">
                  {category.name}
                </h3>
                {category.hint && <p className="mt-1 text-sm text-ink-soft">{category.hint}</p>}
                <span className="mt-3 text-sm font-semibold text-accent" aria-hidden="true">
                  Thử ngay{' '}
                  <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
