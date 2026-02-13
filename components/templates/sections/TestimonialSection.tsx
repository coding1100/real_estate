interface TestimonialSectionProps {
  quote?: string;
  name?: string;
  label?: string;
}

export function TestimonialSection({
  quote,
  name,
  label,
}: TestimonialSectionProps) {
  if (!quote) return null;

  return (
    <section className="bg-zinc-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-700">“{quote}”</p>
          <div className="mt-4 text-xs font-medium text-zinc-900">
            {name && <span>{name}</span>}
            {label && (
              <span className="ml-2 text-zinc-500">
                • {label}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

