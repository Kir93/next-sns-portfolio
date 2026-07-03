import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '../../../../src/mocks/server';
import { createTestQueryClient, createWrapper } from '../../../../src/test/react-query';
import { FEED_QUERY_KEY } from '../useInfiniteFeed';
import { useToggleLike } from './useToggleLike';

import type { QueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { FeedPage, SnsCardData } from '@type/sns';

const card = (id: string, liked: boolean, likes: number): SnsCardData => ({
  id,
  user: { profileImageUrl: '', displayName: 'u', username: 'u' },
  post: { content: 'c', createdAt: '2026-06-20T00:00:00.000Z' },
  stats: { comments: 0, retweets: 0, likes, views: 0 },
  liked
});

const twoCardFeed = (p1Liked: boolean, p1Likes: number): InfiniteData<FeedPage> => ({
  pages: [{ posts: [card('p1', p1Liked, p1Likes), card('p2', false, 5)], nextCursor: null }],
  pageParams: [null]
});

const getPost = (client: QueryClient, id: string) =>
  client
    .getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY)
    ?.pages.flatMap((page) => page.posts)
    .find((post) => post.id === id);

describe('useToggleLike', () => {
  it('낙관적으로 즉시 채우고 서버 응답으로 확정한다', async () => {
    server.use(
      http.post('/api/posts/:id/like', async () => {
        await delay(20);
        return HttpResponse.json({ id: 'p1', liked: true, likes: 11 });
      })
    );
    const client = createTestQueryClient();
    client.setQueryData(FEED_QUERY_KEY, twoCardFeed(false, 10));
    const { Wrapper } = createWrapper(client);

    const { result } = renderHook(() => useToggleLike('p1'), { wrapper: Wrapper });
    act(() => result.current.mutate());

    // 서버 응답 전 낙관적 반영
    await waitFor(() => {
      expect(getPost(client, 'p1')?.liked).toBe(true);
      expect(getPost(client, 'p1')?.stats.likes).toBe(11);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getPost(client, 'p1')?.liked).toBe(true);
    expect(getPost(client, 'p1')?.stats.likes).toBe(11);
  });

  it('이미 좋아요한 글을 다시 누르면 취소된다(-1)', async () => {
    server.use(
      http.post('/api/posts/:id/like', () =>
        HttpResponse.json({ id: 'p1', liked: false, likes: 10 })
      )
    );
    const client = createTestQueryClient();
    client.setQueryData(FEED_QUERY_KEY, twoCardFeed(true, 11));
    const { Wrapper } = createWrapper(client);

    const { result } = renderHook(() => useToggleLike('p1'), { wrapper: Wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getPost(client, 'p1')?.liked).toBe(false);
    expect(getPost(client, 'p1')?.stats.likes).toBe(10);
  });

  it('서버 실패 주입 시 이전 상태로 롤백한다', async () => {
    server.use(
      http.post('/api/posts/:id/like', () => HttpResponse.json({ error: 'boom' }, { status: 500 }))
    );
    const client = createTestQueryClient();
    client.setQueryData(FEED_QUERY_KEY, twoCardFeed(false, 10));
    const { Wrapper } = createWrapper(client);

    const { result } = renderHook(() => useToggleLike('p1'), { wrapper: Wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(getPost(client, 'p1')?.liked).toBe(false);
    expect(getPost(client, 'p1')?.stats.likes).toBe(10);
  });

  it('대상 post만 갱신하고 전체 피드를 invalidate하지 않는다', async () => {
    server.use(
      http.post('/api/posts/:id/like', () =>
        HttpResponse.json({ id: 'p1', liked: true, likes: 11 })
      )
    );
    const client = createTestQueryClient();
    client.setQueryData(FEED_QUERY_KEY, twoCardFeed(false, 10));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { Wrapper } = createWrapper(client);

    const { result } = renderHook(() => useToggleLike('p1'), { wrapper: Wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 다른 post 불변
    expect(getPost(client, 'p2')?.liked).toBe(false);
    expect(getPost(client, 'p2')?.stats.likes).toBe(5);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
