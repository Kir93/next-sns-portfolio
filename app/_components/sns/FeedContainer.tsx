'use client';

import { Suspense } from 'react';

import { QueryErrorResetBoundary, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useIntersectionObserver } from '@utils/useIntersectionObserver';

import ErrorBoundary from '@components/common/ErrorBoundary';

import FeedError from './FeedError';
import FeedSkeleton from './FeedSkeleton';
import SnsCard from './SnsCard';
import { TOGGLE_LIKE_KEY } from './SnsCard/useToggleLike';
import { useInfiniteFeed } from './useInfiniteFeed';

/**
 * Feed body. Uses the Suspense query, so data is always present here — loading and
 * error are owned by the surrounding boundaries, not imperative branches. A
 * sentinel near the bottom triggers `fetchNextPage` (guarded against duplicate
 * loads); the IntersectionObserver disconnects on unmount.
 */
function FeedList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteFeed();
  const likePending = useIsMutating({ mutationKey: [TOGGLE_LIKE_KEY] }) > 0;

  const sentinelRef = useIntersectionObserver<HTMLDivElement>(
    () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    // Re-armed after every page fetch ends: the observer only fires on an
    // intersection change, so a fetch that was cancelled (a like tap) or that left
    // the sentinel still in view would otherwise never load the next page. Held off
    // while a like toggle is pending: a page fetch appends to the cache snapshot
    // taken at its start, so one landing after the toggle settles would undo it.
    { enabled: hasNextPage && !isFetchingNextPage && !likePending, rootMargin: '200px' }
  );

  const posts = data.pages.flatMap((page) => page.posts);
  if (posts.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-1 items-center justify-center p-10 text-center text-sm text-gray-500"
      >
        아직 게시물이 없습니다.
      </div>
    );
  }

  return (
    <section aria-label="피드">
      <ul className="divide-y divide-gray-200">
        {posts.map((item) => (
          <li
            key={item.id}
            className="[contain-intrinsic-size:auto_420px] [content-visibility:auto]"
          >
            <SnsCard {...item} />
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

/**
 * Declarative async boundary for the feed: QueryErrorResetBoundary feeds reset into
 * a self-implemented ErrorBoundary (no `react-error-boundary`, see ADR-004), and
 * Suspense shows the height-matched skeleton during load.
 */
export default function FeedContainer() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={(retry) => <FeedError onRetry={retry} />}>
          <Suspense fallback={<FeedSkeleton />}>
            <FeedList />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
