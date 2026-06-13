import type { SnsCardData } from '@type/sns';

const img = (seed: string) => `https://picsum.photos/seed/${seed}/700/700`;
const avatar = (seed: string) => `https://picsum.photos/seed/${seed}/96/96`;

/**
 * Mock feed covering every ImageGrid variation (0/1/2/3/4/5+ images).
 * `createdAt` values are fixed ISO strings for deterministic rendering.
 */
export const posts: SnsCardData[] = [
  {
    id: 'p1',
    user: {
      profileImageUrl: avatar('ada'),
      displayName: 'Ada Lovelace',
      username: 'ada'
    },
    post: {
      content: '텍스트만 있는 게시물. 이미지 영역은 렌더되지 않아야 함.',
      createdAt: '2026-06-13T09:30:00.000Z'
    },
    stats: { comments: 12, retweets: 4, likes: 88, views: 1203 }
  },
  {
    id: 'p2',
    user: {
      profileImageUrl: avatar('grace'),
      displayName: 'Grace Hopper',
      username: 'grace'
    },
    post: {
      content: '이미지 1장 — 16:9 풀 너비.',
      images: [img('p2-1')],
      createdAt: '2026-06-13T08:10:00.000Z'
    },
    stats: { comments: 3, retweets: 1, likes: 25, views: 410 }
  },
  {
    id: 'p3',
    user: {
      profileImageUrl: avatar('alan'),
      displayName: 'Alan Turing',
      username: 'alan'
    },
    post: {
      content: '이미지 2장 — 1:1 좌우 분할.',
      images: [img('p3-1'), img('p3-2')],
      createdAt: '2026-06-12T21:45:00.000Z'
    },
    stats: { comments: 7, retweets: 9, likes: 132, views: 2890 }
  },
  {
    id: 'p4',
    user: {
      profileImageUrl: avatar('katherine'),
      displayName: 'Katherine Johnson',
      username: 'katherine'
    },
    post: {
      content: '이미지 3장 — 좌 1장(1:2) + 우 2장(1:1 스택).',
      images: [img('p4-1'), img('p4-2'), img('p4-3')],
      createdAt: '2026-06-12T14:05:00.000Z'
    },
    stats: { comments: 21, retweets: 33, likes: 540, views: 9921 }
  },
  {
    id: 'p5',
    user: {
      profileImageUrl: avatar('linus'),
      displayName: 'Linus Torvalds',
      username: 'linus'
    },
    post: {
      content: '이미지 4장 — 2x2 그리드.',
      images: [img('p5-1'), img('p5-2'), img('p5-3'), img('p5-4')],
      createdAt: '2026-06-11T18:20:00.000Z'
    },
    stats: { comments: 0, retweets: 0, likes: 0, views: 64 }
  },
  {
    id: 'p6',
    user: {
      profileImageUrl: avatar('margaret'),
      displayName: 'Margaret Hamilton',
      username: 'margaret'
    },
    post: {
      content: '이미지 5장 — 처음 4장만 2x2 그리드로 표시(+N 오버레이는 범위 밖).',
      images: [img('p6-1'), img('p6-2'), img('p6-3'), img('p6-4'), img('p6-5')],
      createdAt: '2026-06-10T07:00:00.000Z'
    },
    stats: { comments: 102, retweets: 268, likes: 4820, views: 130400 }
  }
];
