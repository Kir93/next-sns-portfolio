import { afterEach, describe, expect, it, vi } from 'vitest';

import { FEED_QUERY_KEY } from '../../../app/_components/sns/useInfiniteFeed';
import { createTestQueryClient } from '../../test/react-query';
import { getFeed } from '../handlers';
import {
  applyTickToFeed,
  commitRebased,
  createIngestor,
  ingestTick,
  parseSched,
  parseTickHz,
  resyncFromServer,
  yieldToMain
} from './applyTicks';
import { createTickEngineStats } from './instrumentation';
import { TOGGLE_LIKE_KEY } from '../../../app/_components/sns/SnsCard/useToggleLike';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedPage, SnsCardData, SnsStats } from '@type/sns';

const serverStats = (id: string): SnsStats => {
  const post = getFeed().find((p) => p.id === id);
  if (!post) throw new Error(`no post ${id}`);
  return { ...post.stats };
};

describe('tick engine — the MSW feed stays the single source of truth', () => {
  it('틱이 반영된 카운트를 다음 페이지 응답이 그대로 서빙한다', async () => {
    const before = serverStats('p7');
    applyTickToFeed([{ id: 'p7', views: 5, likes: 2 }]);

    const res = await fetch('/api/posts?cursor=p6&limit=6');
    const { posts }: FeedPage = await res.json();
    const p7 = posts.find((p) => p.id === 'p7');

    expect(p7?.stats.views).toBe(before.views + 5);
    expect(p7?.stats.likes).toBe(before.likes + 2);
  });

  it('틱 이후 좋아요 응답이 틱 반영값 기준이라 캐시를 되돌리지 않는다', async () => {
    const res0 = await fetch('/api/posts?limit=6');
    const page: FeedPage = await res0.json();
    const client = createTestQueryClient();
    client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, {
      pages: [page],
      pageParams: [null]
    });

    ingestTick(client, applyTickToFeed([{ id: 'p1', views: 1, likes: 3 }]));
    const cached = client
      .getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY)
      ?.pages[0].posts.find((p) => p.id === 'p1');
    expect(cached?.stats).toEqual(serverStats('p1'));

    const res = await fetch('/api/posts/p1/like', { method: 'POST' });
    const { likes }: { likes: number } = await res.json();
    // p1 starts unliked, so the toggle adds exactly one to the tick-updated count.
    expect(likes).toBe((cached?.stats.likes ?? Number.NaN) + 1);
  });
});

describe('parseTickHz', () => {
  it('정상 값을 쓰고 상한 120으로 clamp한다', () => {
    expect(parseTickHz('?tick=20')).toBe(20);
    expect(parseTickHz('?tick=1000')).toBe(120);
  });

  it.each(['', '?tick=', '?tick=0', '?tick=-5', '?tick=abc'])('%s 는 null — 틱 off', (search) => {
    expect(parseTickHz(search)).toBeNull();
  });
});

describe('parseSched', () => {
  it.each(['off', 'yield', 'raf', 'both'] as const)('%s 는 그대로', (mode) => {
    expect(parseSched(`?sched=${mode}`)).toBe(mode);
  });

  it.each(['', '?sched=', '?sched=fast'])('%s 는 off로 폴백', (search) => {
    expect(parseSched(search)).toBe('off');
  });
});

describe('yieldToMain', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scheduler.yield 미지원 환경에서는 yield 없이 이어서 진행한다', async () => {
    vi.stubGlobal('scheduler', undefined);
    await expect(yieldToMain()).resolves.toBeUndefined();
  });

  it('지원 환경에서는 scheduler.yield를 쓴다', async () => {
    const yieldFn = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yieldFn });
    await yieldToMain();
    expect(yieldFn).toHaveBeenCalledTimes(1);
  });
});

async function seededClient() {
  const res = await fetch('/api/posts?limit=18');
  const page: FeedPage = await res.json();
  const client = createTestQueryClient();
  client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, {
    pages: [page],
    pageParams: [null]
  });
  return client;
}

describe('?sched 모드는 커밋 시점과 분할만 바꾸고 결과는 off와 같다', () => {
  it.each(['yield', 'raf', 'both'] as const)('%s', async (mode) => {
    // Seed both caches before the tick, so they hold stale counts the ingestion
    // has to replace — otherwise equality would hold even for a no-op ingestor.
    const baseline = await seededClient();
    const client = await seededClient();

    const changed = applyTickToFeed([
      { id: 'p2', views: 2, likes: 1 },
      { id: 'p9', views: 1, likes: 0 },
      { id: 'p17', views: 3, likes: 1 }
    ]);
    const cachedStats = (target: QueryClient, id: string) =>
      target
        .getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY)
        ?.pages[0].posts.find((p) => p.id === id)?.stats;
    expect(cachedStats(client, 'p2')).not.toEqual(serverStats('p2'));

    ingestTick(baseline, changed);
    const stats = createTickEngineStats();
    createIngestor(mode, client, stats)(changed);
    await vi.waitFor(() => expect(stats.commits).toBe(1));
    expect(stats.pending).toBe(0);

    for (const id of ['p2', 'p9', 'p17']) {
      expect(cachedStats(client, id)).toEqual(serverStats(id));
    }
    expect(client.getQueryData(FEED_QUERY_KEY)).toEqual(baseline.getQueryData(FEED_QUERY_KEY));
  });
});

describe('commitRebased', () => {
  it('yield 사이에 캐시가 바뀌었으면 덮어쓰지 않고 최신 캐시 위에 병합한다', async () => {
    const client = await seededClient();
    const snapshot = client.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY);
    if (!snapshot) throw new Error('no snapshot');

    const [server] = applyTickToFeed([{ id: 'p3', views: 4, likes: 0 }]);
    const stale: InfiniteData<FeedPage> = {
      ...snapshot,
      pages: snapshot.pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) =>
          post.id === 'p3' ? { ...post, stats: { ...server.stats } } : post
        )
      }))
    };

    // A concurrent write during the yields — an optimistic like on another post.
    client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) => (post.id === 'p4' ? { ...post, liked: true } : post))
            }))
          }
        : old
    );

    const stats = createTickEngineStats();
    commitRebased(client, snapshot, stale, new Map<string, SnsCardData>([['p3', server]]), stats);

    const posts = client.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY)?.pages[0].posts;
    expect(stats.rebases).toBe(1);
    expect(posts?.find((p) => p.id === 'p4')?.liked).toBe(true);
    expect(posts?.find((p) => p.id === 'p3')?.stats).toEqual(serverStats('p3'));
  });
});

describe('resyncFromServer', () => {
  it('fetch가 덮은 틱 카운트와 옛 liked를 서버 기준으로 되돌리고, 진행 중인 낙관 좋아요는 남긴다', async () => {
    const client = await seededClient();
    // Ticks the cache missed — as if a page fetch resolved over them.
    applyTickToFeed([
      { id: 'p6', views: 5, likes: 2 },
      { id: 'p7', views: 1, likes: 0 }
    ]);
    // p6: an in-flight like — intent liked, server not yet, a toggle mutation pending.
    // p7: a stale `liked` from a raced fetch response, with no toggle pending.
    const flip = (id: string) =>
      client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                posts: page.posts.map((post) =>
                  post.id === id
                    ? {
                        ...post,
                        liked: !post.liked,
                        stats: { ...post.stats, likes: post.stats.likes + (post.liked ? -1 : 1) }
                      }
                    : post
                )
              }))
            }
          : old
      );
    flip('p6');
    flip('p7');
    void client
      .getMutationCache()
      .build(client, {
        mutationKey: [TOGGLE_LIKE_KEY, 'p6'],
        mutationFn: () => new Promise<void>(() => {})
      })
      .execute(undefined);

    resyncFromServer(client);

    const posts = client.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY)?.pages[0].posts;
    const p6 = posts?.find((p) => p.id === 'p6');
    expect(p6?.liked).toBe(true);
    expect(p6?.stats.likes).toBe(serverStats('p6').likes + 1);
    expect(p6?.stats.views).toBe(serverStats('p6').views);
    const p7 = posts?.find((p) => p.id === 'p7');
    expect(p7?.liked).toBe(false);
    expect(p7?.stats).toEqual(serverStats('p7'));
  });
});
