'use client';

import { Loader2 } from 'lucide-react';

import { useIntersectionObserver } from '@utils/useIntersectionObserver';

import SnsCard from './SnsCard';
import { useInfiniteFeed } from './useInfiniteFeed';

function FeedStatus({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 items-center justify-center p-10 text-center text-sm text-gray-500"
    >
      {message}
    </div>
  );
}

/**
 * Renders the cursor-paginated feed with infinite scroll: a sentinel near the
 * bottom triggers `fetchNextPage` (guarded against duplicate loads), and the
 * IntersectionObserver disconnects on unmount.
 */
export default function FeedContainer() {
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteFeed();

  const sentinelRef = useIntersectionObserver<HTMLDivElement>(
    () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    { enabled: hasNextPage, rootMargin: '200px' }
  );

  if (isPending) {
    return <FeedStatus message="피드를 불러오는 중…" />;
  }
  if (isError) {
    return <FeedStatus message="피드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />;
  }

  const posts = data.pages.flatMap((page) => page.posts);
  if (posts.length === 0) {
    return <FeedStatus message="아직 게시물이 없습니다." />;
  }

  return (
    <section aria-label="피드">
      <ul className="divide-y divide-gray-200">
        {posts.map((item) => (
          <li
            key={item.id}
            className="[contain-intrinsic-size:auto_420px] [content-visibility:auto]"
          >
            <SnsCard user={item.user} post={item.post} stats={item.stats} />
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <div
          ref={sentinelRef}
          className="flex justify-center p-6"
          aria-hidden={!isFetchingNextPage}
        >
          {isFetchingNextPage && (
            <span role="status" aria-label="다음 페이지 불러오는 중">
              <Loader2 aria-hidden className="size-5 text-gray-400 motion-safe:animate-spin" />
            </span>
          )}
        </div>
      ) : (
        <p className="p-6 text-center text-sm text-gray-500">마지막 게시물입니다.</p>
      )}
    </section>
  );
}
