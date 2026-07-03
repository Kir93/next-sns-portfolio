/** Number of placeholder cards — mirrors the feed's first-page size. */
const SKELETON_COUNT = 6;

const pulse = 'bg-gray-200 motion-safe:animate-pulse';

function SkeletonCard() {
  return (
    <li
      className="[contain-intrinsic-size:auto_420px] [content-visibility:auto]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`size-10 shrink-0 rounded-full ${pulse}`} />
          <div className={`h-4 w-32 rounded ${pulse}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-3.5 w-full rounded ${pulse}`} />
          <div className={`h-3.5 w-2/3 rounded ${pulse}`} />
        </div>
        <div className={`aspect-video w-full rounded-2xl ${pulse}`} />
        <div className="flex justify-between pt-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`h-5 w-10 rounded ${pulse}`} />
          ))}
        </div>
      </div>
    </li>
  );
}

/**
 * Suspense fallback for the feed. Card heights are aligned with the real cards'
 * `contain-intrinsic-size: auto 420px` estimate (ADR-002) so the skeleton→content
 * swap does not shift scroll position (CLS target). Announces loading via role=status.
 */
export default function FeedSkeleton() {
  return (
    <ul role="status" aria-label="피드 불러오는 중…" className="divide-y divide-gray-200">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </ul>
  );
}
