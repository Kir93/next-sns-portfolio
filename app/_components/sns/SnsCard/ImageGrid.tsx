import Image from 'next/image';

interface ImageGridProps {
  images?: string[];
  alt: string;
}

const cellClass = 'relative overflow-hidden bg-gray-100';
const gridClass = 'grid gap-0.5 overflow-hidden rounded-2xl border border-gray-200';
const imgSizes = '(max-width: 600px) 100vw, 600px';

/**
 * Conditional image layout per `docs/ui/mainpage.md` §2.1.3:
 * 0=none, 1=16:9 full, 2=1:1 side-by-side, 3=left(1:2)+right 2 stacked, 4+=2x2 (first 4).
 */
export default function ImageGrid({ images, alt }: ImageGridProps) {
  if (!images || images.length === 0) return null;

  const shown = images.slice(0, 4);

  if (shown.length === 1) {
    return (
      <div className={`${gridClass} aspect-video`}>
        <div className={cellClass}>
          <Image src={shown[0]} alt={`${alt} 1`} fill sizes={imgSizes} className="object-cover" />
        </div>
      </div>
    );
  }

  if (shown.length === 2) {
    return (
      <div className={`${gridClass} aspect-[2/1] grid-cols-2`}>
        {shown.map((src, i) => (
          <div key={src} className={cellClass}>
            <Image
              src={src}
              alt={`${alt} ${i + 1}`}
              fill
              sizes={imgSizes}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  if (shown.length === 3) {
    return (
      <div className={`${gridClass} aspect-square grid-cols-2 grid-rows-2`}>
        <div className={`${cellClass} row-span-2`}>
          <Image src={shown[0]} alt={`${alt} 1`} fill sizes={imgSizes} className="object-cover" />
        </div>
        <div className={cellClass}>
          <Image src={shown[1]} alt={`${alt} 2`} fill sizes={imgSizes} className="object-cover" />
        </div>
        <div className={cellClass}>
          <Image src={shown[2]} alt={`${alt} 3`} fill sizes={imgSizes} className="object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${gridClass} aspect-square grid-cols-2 grid-rows-2`}>
      {shown.map((src, i) => (
        <div key={src} className={cellClass}>
          <Image src={src} alt={`${alt} ${i + 1}`} fill sizes={imgSizes} className="object-cover" />
        </div>
      ))}
    </div>
  );
}
