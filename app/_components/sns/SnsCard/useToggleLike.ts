import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';

import { toggleLike } from '@api/post/post';

import { FEED_QUERY_KEY } from '../useInfiniteFeed';

import type { FeedPage, SnsCardData } from '@type/sns';

/** Map a single post (by id) inside the nested infinite-feed cache, leaving every other post untouched. */
function mapPost(
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
 * Optimistic like toggle for one post. Reuses `useCreatePost`'s cancel→snapshot→
 * rollback cycle but deliberately skips `onSettled` invalidate: a single-card
 * update must not refetch the whole feed. The server response reconciles the
 * final liked/count.
 */
export function useToggleLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => toggleLike(postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previous = queryClient.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY);

      queryClient.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
        mapPost(old, postId, (post) => ({
          ...post,
          liked: !post.liked,
          stats: { ...post.stats, likes: post.stats.likes + (post.liked ? -1 : 1) }
        }))
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FEED_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (result) => {
      // Reconcile with the server's authoritative liked/count. No invalidate (single card).
      queryClient.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
        mapPost(old, postId, (post) => ({
          ...post,
          liked: result.liked,
          stats: { ...post.stats, likes: result.likes }
        }))
      );
    }
  });
}
