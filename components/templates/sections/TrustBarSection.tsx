interface TrustBarSectionProps {
  title?: string;
  items?: string[];
}

export function TrustBarSection({ title, items }: TrustBarSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="border-y border-zinc-100 bg-white py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-4 text-xs text-zinc-500 md:flex-row md:items-center">
        {title && (
          <span className="font-medium text-zinc-700">{title}</span>
        )}
        <div className="flex flex-wrap gap-3 md:justify-end">
          {items.map((item, idx) => (
            <span key={idx} className="rounded-full border px-3 py-1">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

