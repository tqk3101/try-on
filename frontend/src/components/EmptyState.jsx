/** Trạng thái rỗng: icon, tiêu đề, mô tả và tối đa một hành động (node). */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
      {icon && (
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blush text-accent-dark">
          {icon}
        </div>
      )}
      <h3 className="mt-4 font-display text-xl font-semibold text-ink">{title}</h3>
      {description && <p className="mt-2 text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
