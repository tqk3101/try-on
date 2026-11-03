export default function SectionHeading({ id, eyebrow, title, className = '' }) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl"
      >
        {title}
      </h2>
    </div>
  );
}
