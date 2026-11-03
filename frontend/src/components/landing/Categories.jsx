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
            <li
              key={category.id}
              className={`flex aspect-[4/3] flex-col justify-end rounded-3xl p-6 sm:aspect-[3/4] ${
                index % 2 === 0
                  ? 'bg-gradient-to-br from-blush to-white'
                  : 'bg-gradient-to-br from-white to-blush'
              } border border-white shadow-card`}
            >
              <h3 className="font-display text-2xl font-semibold text-ink">{category.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{category.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
