import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPost } from '@api/post/post';

import { CURRENT_USER } from '@lib/current-user';

import type { CreatePostInput } from '@lib/schemas/post';
import type { SnsCardData } from '@type/sns';

/** Must match FeedContainer's query key. */
const FEED_KEY = ['posts'];

/**
 * Optimistic post creation: prepend a temporary card on mutate, roll back on
 * error, and invalidate on settle so the server card replaces the temp one.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onMutate: async (input: CreatePostInput) => {
      await queryClient.cancelQueries({ queryKey: FEED_KEY });
      const previous = queryClient.getQueryData<SnsCardData[]>(FEED_KEY);

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
      queryClient.setQueryData<SnsCardData[]>(FEED_KEY, (old = []) => [optimistic, ...old]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FEED_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FEED_KEY });
    }
  });
}
