import { useSuspenseInfiniteQuery } from '@tanstack/react-query';

import { getPostsPage } from '@api/post/post';

/** Shared feed query key — also used by the optimistic create/like mutations. */
export const FEED_QUERY_KEY = ['posts'];

const PAGE_LIMIT = 6;

/**
 * Suspense feed query: data is always present, so the loading/error states are
 * handled declaratively by the surrounding <Suspense>/<ErrorBoundary> instead of
 * imperative `isPending`/`isError` branches.
 */
export function useInfiniteFeed() {
  return useSuspenseInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => getPostsPage({ cursor: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });
}
