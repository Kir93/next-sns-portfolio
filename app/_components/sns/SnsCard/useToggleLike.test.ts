import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { getFeed } from '../../../../src/mocks/handlers';
import { server } from '../../../../src/mocks/server';
import { applyTickToFeed, ingestTick } from '../../../../src/mocks/tick/applyTicks';
import { createTestQueryClient, createWrapper } from '../../../../src/test/react-query';
import { FEED_QUERY_KEY } from '../useInfiniteFeed';
import { mapPost, useToggleLike } from './useToggleLike';

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
  it('낙관적으로 즉시 채우고 서버와 같은 상태로 끝난다', async () => {
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

/**
 * Races between the tick stream and in-flight toggles. The like handler here
 * applies the toggle to the real MSW feed (the single source of truth) like the
 * production handler does, but holds each request at two gates so the test
 * decides when the server processes it and when the response arrives.
 */
describe('useToggleLike — 틱 스트림과의 경합', () => {
  function gatedLikeHandler({ fail = false } = {}) {
    let openProcess = () => {};
    let openRespond = () => {};
    const processGate = new Promise<void>((resolve) => (openProcess = resolve));
    const respondGate = new Promise<void>((resolve) => (openRespond = resolve));
    const calls = { received: 0, processed: 0 };

    server.use(
      http.post('/api/posts/:id/like', async ({ params }) => {
        calls.received += 1;
        await processGate;
        const target = getFeed().find((post) => post.id === params.id);
        if (!target) return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
        if (!fail) {
          target.liked = !target.liked;
          target.stats = {
            ...target.stats,
            likes: target.stats.likes + (target.liked ? 1 : -1)
          };
        }
        calls.processed += 1;
        const body = { id: target.id, liked: target.liked, likes: target.stats.likes };
        await respondGate;
        return fail
          ? HttpResponse.json({ error: 'boom' }, { status: 500 })
          : HttpResponse.json(body);
      })
    );
    return { calls, openProcess: () => openProcess(), openRespond: () => openRespond() };
  }

  async function serverSeededClient() {
    const res = await fetch('/api/posts?limit=18');
    const page: FeedPage = await res.json();
    const client = createTestQueryClient();
    client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, {
      pages: [page],
      pageParams: [null]
    });
    return client;
  }

  const serverPost = (id: string) => {
    const post = getFeed().find((p) => p.id === id);
    if (!post) throw new Error(`no post ${id}`);
    return { liked: post.liked, likes: post.stats.likes };
  };

  it('틱이 in-flight 토글 전후로 카운트를 바꿔도 낙관 +1을 유지하고 최종값이 서버와 같다', async () => {
    const client = await serverSeededClient();
    const { Wrapper } = createWrapper(client);
    const like = gatedLikeHandler();
    const { result } = renderHook(() => useToggleLike('p3'), { wrapper: Wrapper });

    act(() => result.current.mutate());
    await waitFor(() => expect(like.calls.received).toBe(1));

    // Tick before the server has applied the toggle: the optimistic +1 must survive.
    ingestTick(client, applyTickToFeed([{ id: 'p3', views: 1, likes: 2 }]));
    expect(getPost(client, 'p3')?.liked).toBe(true);
    expect(getPost(client, 'p3')?.stats.likes).toBe(serverPost('p3').likes + 1);

    like.openProcess();
    await waitFor(() => expect(like.calls.processed).toBe(1));
    // Tick after the server applied it but before the response arrives.
    ingestTick(client, applyTickToFeed([{ id: 'p3', views: 1, likes: 3 }]));
    like.openRespond();
    await waitFor(() => expect(client.isMutating()).toBe(0));

    expect(getPost(client, 'p3')?.liked).toBe(serverPost('p3').liked);
    expect(getPost(client, 'p3')?.stats.likes).toBe(serverPost('p3').likes);
  });

  it('요청이 진행 중일 때 들어온 연타는 하나로 합쳐 요청을 최대 1건만 더 보낸다', async () => {
    const client = await serverSeededClient();
    const { Wrapper } = createWrapper(client);
    const like = gatedLikeHandler();
    const { result } = renderHook(() => useToggleLike('p4'), { wrapper: Wrapper });
    const initial = serverPost('p4');

    // First tap goes out; three more land while it is in flight (separate events).
    act(() => result.current.mutate());
    await waitFor(() => expect(like.calls.received).toBe(1));
    for (let tap = 0; tap < 3; tap += 1) act(() => result.current.mutate());
    expect(getPost(client, 'p4')?.liked).toBe(initial.liked);

    like.openProcess();
    like.openRespond();
    await waitFor(() => expect(client.isMutating()).toBe(0));

    // Four taps: the first request plus one catch-up for the three collapsed taps.
    expect(like.calls.received).toBe(2);
    expect(serverPost('p4').liked).toBe(initial.liked);
    expect(getPost(client, 'p4')?.liked).toBe(serverPost('p4').liked);
    expect(getPost(client, 'p4')?.stats.likes).toBe(serverPost('p4').likes);
  });

  it('요청이 실패하면 낙관 ±1만 철회하고 그 사이 틱이 반영한 카운트는 남긴다', async () => {
    const client = await serverSeededClient();
    const { Wrapper } = createWrapper(client);
    const like = gatedLikeHandler({ fail: true });
    const { result } = renderHook(() => useToggleLike('p5'), { wrapper: Wrapper });

    act(() => result.current.mutate());
    await waitFor(() => expect(like.calls.received).toBe(1));
    ingestTick(client, applyTickToFeed([{ id: 'p5', views: 1, likes: 3 }]));
    like.openProcess();
    like.openRespond();
    await waitFor(() => expect(client.isMutating()).toBe(0));

    expect(getPost(client, 'p5')?.liked).toBe(serverPost('p5').liked);
    expect(getPost(client, 'p5')?.stats.likes).toBe(serverPost('p5').likes);
  });

  it('요청 도중 피드 refetch가 liked를 이전 값으로 덮어도 끝나면 서버 상태로 맞춘다', async () => {
    const client = await serverSeededClient();
    const { Wrapper } = createWrapper(client);
    const like = gatedLikeHandler();
    const { result } = renderHook(() => useToggleLike('p6'), { wrapper: Wrapper });
    const before = serverPost('p6');

    act(() => result.current.mutate());
    await waitFor(() => expect(like.calls.received).toBe(1));
    // A refetch that the server answered before applying the toggle lands now.
    client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
      mapPost(old, 'p6', (post) => ({
        ...post,
        liked: before.liked,
        stats: { ...post.stats, likes: before.likes }
      }))
    );
    like.openProcess();
    like.openRespond();
    await waitFor(() => expect(client.isMutating()).toBe(0));

    expect(getPost(client, 'p6')?.liked).toBe(serverPost('p6').liked);
    expect(getPost(client, 'p6')?.stats.likes).toBe(serverPost('p6').likes);
  });
});
