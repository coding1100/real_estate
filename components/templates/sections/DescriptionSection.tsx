interface DescriptionSectionProps {
  title?: string;
  body?: string;
  bullets?: string[];
}

export function DescriptionSection({
  title,
  body,
  bullets,
}: DescriptionSectionProps) {
  if (!title && !body && !bullets?.length) return null;

  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-4xl space-y-4 px-4">
        {title && (
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
        )}
        {body && <p className="text-sm text-zinc-600">{body}</p>}
        {bullets && bullets.length > 0 && (
          <ul className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
            {bullets.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-zinc-900" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

