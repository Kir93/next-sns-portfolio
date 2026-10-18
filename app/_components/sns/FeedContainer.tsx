'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import { QueryErrorResetBoundary, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useIntersectionObserver } from '@utils/useIntersectionObserver';

import ErrorBoundary from '@components/common/ErrorBoundary';

import FeedError from './FeedError';
import FeedSkeleton from './FeedSkeleton';
import SnsCard from './SnsCard';
import { TOGGLE_LIKE_KEY } from './SnsCard/useToggleLike';
import { useFeedIds, useFeedPost, useInfiniteFeed } from './useInfiniteFeed';

import type { ReactNode } from 'react';

const CARD_CLASS = '[contain-intrinsic-size:auto_420px] [content-visibility:auto]';

/**
 * `?subscribe=list` restores the pre-subscription path ({@link ListFeed}) so the
 * perf harness can compare both in one run. Read once per load, like `?feedSize`.
 */
const LIST_SUBSCRIPTION =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('subscribe') === 'list';

/**
 * One card, subscribed to its own post only while the browser renders it. A card
 * the browser skips (`content-visibility: auto`, off screen) stops taking count
 * updates and catches up when it becomes relevant again. Without the event (no
 * support) a card simply stays subscribed.
 */
function FeedItem({ id }: { id: string }) {
  const ref = useRef<HTMLLIElement>(null);
  const [skipped, setSkipped] = useState(false);
  const post = useFeedPost(id, !skipped);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onChange = (event: Event) =>
      setSkipped(event instanceof ContentVisibilityAutoStateChangeEvent && event.skipped);
    element.addEventListener('contentvisibilityautostatechange', onChange);
    return () => element.removeEventListener('contentvisibilityautostatechange', onChange);
  }, []);

  return (
    <li ref={ref} className={CARD_CLASS}>
      {post && <SnsCard {...post} />}
    </li>
  );
}

/** Default path: the list subscribes to post ids only, each card to its own post. */
function CardFeed() {
  // Destructure only what the list uses: TanStack re-renders on the fields read, and
  // a rest spread reads them all — every count update would re-render the list.
  const { data: ids, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedIds();
  const paging = { fetchNextPage, hasNextPage, isFetchingNextPage };
  return (
    <FeedList count={ids.length} {...paging}>
      {ids.map((id) => (
        <FeedItem key={id} id={id} />
      ))}
    </FeedList>
  );
}

/** Pre-subscription path: the list reads the whole feed, so every count update re-renders it. */
function ListFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteFeed();
  const paging = { fetchNextPage, hasNextPage, isFetchingNextPage };
  const posts = data.pages.flatMap((page) => page.posts);
  return (
    <FeedList count={posts.length} {...paging}>
      {posts.map((item) => (
        <li key={item.id} className={CARD_CLASS}>
          <SnsCard {...item} />
        </li>
      ))}
    </FeedList>
  );
}

interface FeedListProps {
  count: number;
  children: ReactNode;
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

/**
 * Feed body shared by both paths. Their Suspense queries keep data always present
 * here — loading and error are owned by the surrounding boundaries, not imperative
 * branches. A
 * sentinel near the bottom triggers `fetchNextPage` (guarded against duplicate
 * loads); the IntersectionObserver disconnects on unmount.
 */
function FeedList({
  count,
  children,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: FeedListProps) {
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

  if (count === 0) {
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
      <ul className="divide-y divide-gray-200">{children}</ul>

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
            {LIST_SUBSCRIPTION ? <ListFeed /> : <CardFeed />}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
