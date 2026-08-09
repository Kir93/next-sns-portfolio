import { avatar, img } from './posts';

import type { SnsCardData } from '@type/sns';

/**
 * Deterministic stress feed generator. Every value derives from the seed —
 * no `Date.now()` / `Math.random()` — so the same (size, seed) pair always
 * produces a byte-identical feed and a perf run is reproducible across machines.
 */

/** mulberry32 — 32-bit seeded PRNG, small enough to keep the dependency count at zero (ADR-003). */
function mulberry32(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_FEED_SEED = 20260711;

/** Fixed origin timestamp — the newest generated post; older posts step back from here. */
const FEED_ORIGIN_MS = Date.UTC(2026, 5, 10, 0, 0, 0);
const POST_INTERVAL_MS = 137_000;

const AUTHORS = [
  { displayName: 'Barbara Liskov', username: 'barbara' },
  { displayName: 'Donald Knuth', username: 'knuth' },
  { displayName: 'Leslie Lamport', username: 'lamport' },
  { displayName: 'Frances Allen', username: 'fran' },
  { displayName: 'Edsger Dijkstra', username: 'edsger' },
  { displayName: 'Jean Bartik', username: 'jean' },
  { displayName: 'Ken Thompson', username: 'ken' },
  { displayName: 'Radia Perlman', username: 'radia' }
];

/** Joined 1..N at a time so card heights vary the way a real feed does. */
const CONTENT_FRAGMENTS = [
  '측정 없이 하는 최적화는 우연히 좋아지거나 우연히 나빠진다.',
  '고빈도 업데이트가 들어오면 리렌더보다 메인 스레드 태스크 길이가 먼저 무너진다.',
  '같은 조건에서 다시 재보지 못하는 수치는 근거가 아니라 일화다.',
  '스크롤 성능은 리스트 길이와 카드 복잡도에 비례해서 나빠진다.',
  '프레임 예산 16.7ms를 넘기는 순간 사용자는 그걸 지연으로 체감한다.',
  '캐시를 여러 번 쓰는 것보다 한 프레임에 모아서 한 번 쓰는 게 싸다.'
];

/**
 * Builds `size` posts. Ids are `gen-*` so they never collide with the seed feed
 * (`p*`) or with posts created through `POST /api/posts` (`server-*`).
 */
export function generateFeed(size: number, seed: number = DEFAULT_FEED_SEED): SnsCardData[] {
  const rand = mulberry32(seed);

  return Array.from({ length: size }, (_, i) => {
    const author = AUTHORS[Math.floor(rand() * AUTHORS.length)];
    const imageCount = Math.floor(rand() * 5);
    const fragmentStart = Math.floor(rand() * CONTENT_FRAGMENTS.length);
    const fragmentCount = 1 + Math.floor(rand() * CONTENT_FRAGMENTS.length);
    const id = `gen-${i + 1}`;

    return {
      id,
      user: {
        profileImageUrl: avatar(author.username),
        displayName: author.displayName,
        username: author.username
      },
      post: {
        content: Array.from(
          { length: fragmentCount },
          (_unused, k) => CONTENT_FRAGMENTS[(fragmentStart + k) % CONTENT_FRAGMENTS.length]
        ).join(' '),
        images:
          imageCount > 0
            ? Array.from({ length: imageCount }, (_unused, k) => img(`${id}-${k + 1}`))
            : undefined,
        createdAt: new Date(FEED_ORIGIN_MS - i * POST_INTERVAL_MS).toISOString()
      },
      stats: {
        comments: Math.floor(rand() * 200),
        retweets: Math.floor(rand() * 400),
        likes: Math.floor(rand() * 5_000),
        views: Math.floor(rand() * 150_000)
      },
      liked: false
    };
  });
}
