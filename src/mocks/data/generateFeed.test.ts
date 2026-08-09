import { describe, expect, it } from 'vitest';

import { DEFAULT_FEED_SEED, generateFeed } from './generateFeed';

describe('generateFeed', () => {
  it('같은 seed로 두 번 생성하면 완전히 동일한 피드를 만든다', () => {
    expect(generateFeed(500)).toEqual(generateFeed(500));
  });

  it('seed가 다르면 다른 피드를 만든다(상수 출력이 아님)', () => {
    expect(generateFeed(20, 1)).not.toEqual(generateFeed(20, 2));
  });

  it('요청한 개수만큼 만들고 id가 중복되지 않는다', () => {
    const feed = generateFeed(506);
    expect(feed).toHaveLength(506);
    expect(new Set(feed.map((p) => p.id)).size).toBe(506);
  });

  it('SnsCardData 계약을 만족한다 — 이미지 0~4장, ISO createdAt, 시간 역순', () => {
    const feed = generateFeed(200);

    for (const post of feed) {
      expect(post.post.images?.length ?? 0).toBeLessThanOrEqual(4);
      expect(post.post.content.length).toBeGreaterThan(0);
      expect(new Date(post.post.createdAt).toISOString()).toBe(post.post.createdAt);
      expect(post.liked).toBe(false);
    }

    const times = feed.map((p) => Date.parse(p.post.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('기본 seed 생성 결과 스냅샷', () => {
    expect(generateFeed(3, DEFAULT_FEED_SEED)).toMatchSnapshot();
  });
});
