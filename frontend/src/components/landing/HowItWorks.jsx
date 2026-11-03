import SectionHeading from './SectionHeading.jsx';
import { STEPS } from '../../mocks/landingContent.js';

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="how-title" eyebrow="Cách hoạt động" title="Ba bước để lên đồ" />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative text-center md:text-left">
              <span
                aria-hidden="true"
                className="font-display text-7xl font-semibold leading-none text-accent/20"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="-mt-3 font-display text-2xl font-semibold text-ink">
                <span className="sr-only">Bước {index + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-ink-soft">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
