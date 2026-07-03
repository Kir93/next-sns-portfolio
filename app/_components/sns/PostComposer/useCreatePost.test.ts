import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '../../../../src/mocks/server';
import { createTestQueryClient, createWrapper } from '../../../../src/test/react-query';
import { FEED_QUERY_KEY } from '../useInfiniteFeed';
import { useCreatePost } from './useCreatePost';

import type { InfiniteData } from '@tanstack/react-query';
import type { FeedPage, SnsCardData } from '@type/sns';

const card = (id: string, content: string): SnsCardData => ({
  id,
  user: { profileImageUrl: '', displayName: 'u', username: 'u' },
  post: { content, createdAt: '2026-06-20T00:00:00.000Z' },
  stats: { comments: 0, retweets: 0, likes: 0, views: 0 },
  liked: false
});

const seedFeed = (): InfiniteData<FeedPage> => ({
  pages: [{ posts: [card('p1', '기존 글'), card('p2', '두번째')], nextCursor: null }],
  pageParams: [null]
});

afterEach(() => vi.restoreAllMocks());

describe('useCreatePost', () => {
  it('onMutate가 첫 페이지 맨 앞에 낙관적 카드를 prepend하고 onSettled에서 invalidate한다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(FEED_QUERY_KEY, seedFeed());
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { Wrapper } = createWrapper(client);

    const { result } = renderHook(() => useCreatePost(), { wrapper: Wrapper });
    act(() => result.current.mutate({ content: '새 글' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 활성 observer가 없어 invalidate는 refetch를 트리거하지 않으므로 낙관적 카드가 남는다.
    const data = client.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY);
    const first = data?.pages[0].posts[0];
    expect(first?.id).toMatch(/^temp-/);
    expect(first?.post.content).toBe('새 글');
    expect(data?.pages[0].posts).toHaveLength(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: FEED_QUERY_KEY });
  });

  it('onError 시 이전 캐시 스냅샷으로 정확히 롤백한다', async () => {
    server.use(
      http.post('/api/posts', () => HttpResponse.json({ error: 'boom' }, { status: 500 }))
    );
    const client = createTestQueryClient();
    const snapshot = seedFeed();
    client.setQueryData(FEED_QUERY_KEY, snapshot);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { Wrapper } = createWrapper(client);

    const { result } = renderHook(() => useCreatePost(), { wrapper: Wrapper });
    act(() => result.current.mutate({ content: '실패할 글' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = client.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY);
    expect(data).toEqual(snapshot);
    expect(data?.pages[0].posts.some((p) => p.id.startsWith('temp-'))).toBe(false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: FEED_QUERY_KEY });
  });
});
