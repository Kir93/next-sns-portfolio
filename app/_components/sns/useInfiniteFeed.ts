import { infiniteQueryOptions, useSuspenseInfiniteQuery } from '@tanstack/react-query';

import { getPostsPage } from '@api/post/post';

import type { InfiniteData } from '@tanstack/react-query';
import type { FeedPage, SnsCardData } from '@type/sns';

/** Shared feed query key — also used by the optimistic create/like mutations. */
export const FEED_QUERY_KEY = ['posts'];

const PAGE_LIMIT = 6;

const feedQueryOptions = infiniteQueryOptions({
  queryKey: FEED_QUERY_KEY,
  queryFn: ({ pageParam }) => getPostsPage({ cursor: pageParam, limit: PAGE_LIMIT }),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor
});

/**
 * Suspense feed query: data is always present, so the loading/error states are
 * handled declaratively by the surrounding <Suspense>/<ErrorBoundary> instead of
 * imperative `isPending`/`isError` branches.
 */
export function useInfiniteFeed() {
  return useSuspenseInfiniteQuery(feedQueryOptions);
}

const selectIds = (data: InfiniteData<FeedPage>) =>
  data.pages.flatMap((page) => page.posts.map((post) => post.id));

/**
 * The feed as post ids. Structural sharing keeps the array's identity while only
 * counts change, so a count update does not re-render the list — each card reads
 * its own post through {@link useFeedPost}.
 */
export function useFeedIds() {
  return useSuspenseInfiniteQuery({ ...feedQueryOptions, select: selectIds });
}

/** One id → post index per cache value: the first card's select builds it, the rest look up. */
const postIndex = new WeakMap<InfiniteData<FeedPage>, Map<string, SnsCardData>>();

function indexPosts(data: InfiniteData<FeedPage>): Map<string, SnsCardData> {
  let index = postIndex.get(data);
  if (!index) {
    index = new Map(data.pages.flatMap((page) => page.posts.map((post) => [post.id, post])));
    postIndex.set(data, index);
  }
  return index;
}

/**
 * One card's post. While `subscribed` is false the card is not notified of cache
 * writes and keeps what it last rendered; subscribing again re-reads the latest.
 */
export function useFeedPost(id: string, subscribed: boolean): SnsCardData | undefined {
  return useSuspenseInfiniteQuery({
    ...feedQueryOptions,
    select: (data) => indexPosts(data).get(id),
    subscribed
  }).data;
}
