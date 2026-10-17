import { useRef } from 'react';

import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';

import { toggleLike } from '@api/post/post';

import { FEED_QUERY_KEY } from '../useInfiniteFeed';

import type { QueryClient } from '@tanstack/react-query';
import type { FeedPage, SnsCardData } from '@type/sns';

/** Map a single post (by id) inside the nested infinite-feed cache, leaving every other post untouched. */
export function mapPost(
  data: InfiniteData<FeedPage> | undefined,
  id: string,
  update: (post: SnsCardData) => SnsCardData
) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === id ? update(post) : post))
    }))
  };
}

/**
 * The part of a displayed like count the server has not applied yet: +1 while the
 * user's intent is "liked" and the server still says otherwise, -1 the other way,
 * 0 once they agree. Anything that rewrites counts from the server re-adds it.
 */
export function likeDelta(displayedLiked: boolean, serverLiked: boolean): number {
  if (displayedLiked === serverLiked) return 0;
  return displayedLiked ? 1 : -1;
}

const readPost = (client: QueryClient, id: string) =>
  client
    .getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY)
    ?.pages.flatMap((page) => page.posts)
    .find((post) => post.id === id);

/** Mutation key of every like toggle — the tick engine's resync reads which posts have one pending. */
export const TOGGLE_LIKE_KEY = 'toggle-like';

/**
 * Clients owing a whole-feed refetch that a tap cancelled. Shared across cards so
 * the last toggle to settle runs it: a refetch started while another toggle is
 * pending could land after that toggle settles and overwrite its corrected card.
 */
const owedFeedRefetch = new WeakSet<QueryClient>();

/**
 * Like toggle that stays consistent under a live tick stream. Three rules decide
 * who wins each field:
 * - `liked` shows the user's latest intent. Requests for one post run one at a
 *   time (mutation scope), and a queued request is skipped when the server
 *   already matches the intent — taps landing while a request is in flight
 *   collapse into at most one more request.
 * - `likes` is the server's count plus {@link likeDelta}; the tick ingestion
 *   re-applies that delta, so a tick never erases the optimistic ±1.
 * - A failed request withdraws only its own ±1; counts ticks delivered
 *   meanwhile stay. (No whole-feed snapshot rollback.)
 *
 * The intent lives in a ref, not only in the cache, because another writer (a
 * feed refetch, another mutation's rollback) can overwrite the cached `liked`
 * mid-flight. Once intent and server agree, the cache is corrected to the
 * server's `liked` — a no-op unless something overwrote it. The response's count
 * is never written back: it can be older than a tick that landed after the
 * server processed the request. Still no `onSettled` invalidate — a single card
 * must not refetch the feed; it only re-runs a refetch a tap cancelled, once no
 * toggle is left pending.
 */
export function useToggleLike(postId: string) {
  const queryClient = useQueryClient();
  /** The user's latest intent and the server's last confirmed `liked`; `null` until the first tap. */
  const intent = useRef<boolean | null>(null);
  const confirmed = useRef<boolean | null>(null);

  /** Shows `liked`, moving the count by the difference from what the card showed before. */
  const showLiked = (liked: boolean) =>
    queryClient.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
      mapPost(old, postId, (post) =>
        post.liked === liked
          ? post
          : {
              ...post,
              liked,
              stats: { ...post.stats, likes: post.stats.likes + likeDelta(liked, post.liked) }
            }
      )
    );

  const mutation = useMutation({
    mutationKey: [TOGGLE_LIKE_KEY, postId],
    scope: { id: `${TOGGLE_LIKE_KEY}:${postId}` },
    mutationFn: async () => {
      if (intent.current === confirmed.current) return null;
      const result = await toggleLike(postId);
      confirmed.current = result.liked;
      return result;
    },
    onError: () => {
      intent.current = confirmed.current;
    },
    onSettled: () => {
      // This toggle still counts as pending here, so 1 means it is the last one.
      if (
        owedFeedRefetch.has(queryClient) &&
        queryClient.isMutating({ mutationKey: [TOGGLE_LIKE_KEY] }) === 1
      ) {
        owedFeedRefetch.delete(queryClient);
        void queryClient.refetchQueries({ queryKey: FEED_QUERY_KEY });
      }
      const server = confirmed.current;
      if (server === null || intent.current !== server) return;
      if (readPost(queryClient, postId)?.liked !== server) showLiked(server);
    }
  });

  const toggle = () => {
    const post = readPost(queryClient, postId);
    if (!post) return;
    confirmed.current ??= post.liked;
    intent.current = !(intent.current ?? post.liked);
    // A feed fetch resolving later would rebuild pages from its start snapshot.
    // A cancelled whole-feed refetch (a new post's invalidate, a stale remount) is
    // owed and re-run when the last toggle settles; a cancelled `fetchNextPage` is
    // re-armed by the feed's sentinel instead.
    const feed = queryClient.getQueryState(FEED_QUERY_KEY);
    if (feed?.fetchStatus === 'fetching' && !feed.fetchMeta?.fetchMore) {
      owedFeedRefetch.add(queryClient);
    }
    void queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
    showLiked(intent.current);
    mutation.mutate();
  };

  return { ...mutation, mutate: toggle };
}
