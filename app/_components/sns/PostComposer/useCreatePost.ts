import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';

import { createPost } from '@api/post/post';

import { CURRENT_USER } from '@lib/current-user';

import { FEED_QUERY_KEY } from '../useInfiniteFeed';

import type { CreatePostInput } from '@lib/schemas/post';
import type { FeedPage, SnsCardData } from '@type/sns';

/**
 * Optimistic post creation against the infinite feed: prepend a temporary card
 * to the first page on mutate, roll back on error, invalidate on settle so the
 * server card replaces the temp one.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onMutate: async (input: CreatePostInput) => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previous = queryClient.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY);

      const optimistic: SnsCardData = {
        id: `temp-${crypto.randomUUID()}`,
        user: CURRENT_USER,
        post: {
          content: input.content,
          images: input.images,
          createdAt: new Date().toISOString()
        },
        stats: { comments: 0, retweets: 0, likes: 0, views: 0 }
      };

      queryClient.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) => {
        if (!old || old.pages.length === 0) {
          return { pages: [{ posts: [optimistic], nextCursor: null }], pageParams: [null] };
        }
        const [firstPage, ...restPages] = old.pages;
        return {
          ...old,
          pages: [{ ...firstPage, posts: [optimistic, ...firstPage.posts] }, ...restPages]
        };
      });

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FEED_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    }
  });
}
