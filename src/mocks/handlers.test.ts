import { describe, expect, it } from 'vitest';

import type { FeedPage } from '@type/sns';

async function getPage(params: string): Promise<FeedPage> {
  // Relative URL resolves against the jsdom origin, matching MSW's relative handler.
  const res = await fetch(`/api/posts${params}`);
  expect(res.ok).toBe(true);
  return res.json() as Promise<FeedPage>;
}

describe('GET /api/posts cursor pagination', () => {
  it('첫 페이지를 limit 만큼 슬라이스하고 마지막 항목 id를 다음 커서로 반환한다', async () => {
    const { posts, nextCursor } = await getPage('?limit=6');
    expect(posts.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(nextCursor).toBe('p6');
  });

  it('커서 이후 다음 페이지를 이어서 반환한다', async () => {
    const { posts, nextCursor } = await getPage('?cursor=p6&limit=6');
    expect(posts.map((p) => p.id)).toEqual(['p7', 'p8', 'p9', 'p10', 'p11', 'p12']);
    expect(nextCursor).toBe('p12');
  });

  it('마지막 페이지에서는 nextCursor=null로 끝을 신호한다', async () => {
    const { posts, nextCursor } = await getPage('?cursor=p12&limit=6');
    expect(posts.map((p) => p.id)).toEqual(['p13', 'p14', 'p15', 'p16', 'p17', 'p18']);
    expect(nextCursor).toBeNull();
  });

  it('알 수 없는/stale 커서는 page1을 재서빙하지 않고 빈 페이지+end를 반환한다', async () => {
    const { posts, nextCursor } = await getPage('?cursor=does-not-exist&limit=6');
    expect(posts).toEqual([]);
    expect(nextCursor).toBeNull();
  });
});
