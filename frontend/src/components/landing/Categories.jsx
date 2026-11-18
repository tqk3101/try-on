import { Link } from 'react-router';
import { PATHS } from '../../routes/paths.js';
import SectionHeading from './SectionHeading.jsx';
import { CATEGORIES } from '../../mocks/landingContent.js';

export default function Categories() {
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
          {CATEGORIES.map((category, index) => (
            <li key={category.id}>
              <Link
                to={PATHS.tryOn}
                aria-label={`${category.name}: vào phòng thử đồ`}
                className={`group flex aspect-[4/3] min-h-11 flex-col justify-end rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:aspect-[3/4] ${
                  index % 2 === 0
                    ? 'bg-gradient-to-br from-blush to-white'
                    : 'bg-gradient-to-br from-white to-blush'
                } border border-white shadow-card`}
              >
                <h3 className="font-display text-2xl font-semibold text-ink">{category.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{category.hint}</p>
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
