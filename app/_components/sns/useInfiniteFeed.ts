import { useInfiniteQuery } from '@tanstack/react-query';

import { getPostsPage } from '@api/post/post';

/** Shared feed query key — also used by the optimistic create mutation. */
export const FEED_QUERY_KEY = ['posts'];

const PAGE_LIMIT = 6;

export function useInfiniteFeed() {
  return useInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => getPostsPage({ cursor: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });
}
