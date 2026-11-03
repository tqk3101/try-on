import SectionHeading from './SectionHeading.jsx';
import { BagIcon, CameraIcon, GridIcon, SwapIcon } from '../icons.jsx';
import { FEATURES } from '../../mocks/landingContent.js';

const ICONS = { camera: CameraIcon, swap: SwapIcon, grid: GridIcon, bag: BagIcon };

export default function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-16 bg-surface py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="features-title"
          eyebrow="Tính năng"
          title="Phòng thử đồ nằm gọn trong điện thoại"
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <li
                key={feature.title}
                className="group rounded-3xl border border-line bg-canvas p-6 transition duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-blush text-accent-dark transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{feature.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
