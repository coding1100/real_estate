import Image from "next/image";

interface CarouselItem {
  src: string;
  alt?: string;
}

interface CarouselSectionProps {
  title?: string;
  items?: CarouselItem[];
}

export function CarouselSection({ title, items }: CarouselSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-zinc-50 py-10">
      <div className="mx-auto max-w-5xl space-y-4 px-4">
        {title && (
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
        )}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative h-52 min-w-[260px] overflow-hidden rounded-xl bg-zinc-200"
            >
              <Image
                src={item.src}
                alt={item.alt ?? `Slide ${idx + 1}`}
                fill
                sizes="260px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

