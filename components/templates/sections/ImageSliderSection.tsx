import Image from "next/image";

interface SliderItem {
  src: string;
  alt?: string;
}

interface ImageSliderSectionProps {
  title?: string;
  items?: SliderItem[];
}

export function ImageSliderSection({ title, items }: ImageSliderSectionProps) {
  if (!items || items.length === 0) return null;

  // Simple slider: show first image for now (full carousel behavior can be added later)
  const first = items[0];

  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-5xl space-y-4 px-4">
        {title && (
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
        )}
        <div className="relative h-72 overflow-hidden rounded-2xl bg-zinc-200">
          <Image
            src={first.src}
            alt={first.alt ?? "Featured property"}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

