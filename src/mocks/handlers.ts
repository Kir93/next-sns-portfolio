import { http, HttpResponse } from 'msw';

import { CURRENT_USER } from '@lib/current-user';
import { createPostSchema } from '@lib/schemas/post';

import { generateFeed } from './data/generateFeed';
import { posts as seedPosts } from './data/posts';

import type { SnsCardData } from '@type/sns';

/** Upper bound so a stray `?feedSize=1e9` cannot lock up the demo. */
const MAX_FEED_SIZE = 2000;

/**
 * Reads the `?feedSize=N` stress-feed size, clamped to {@link MAX_FEED_SIZE}.
 * Returns `null` for an absent, malformed, or non-positive value so the caller
 * keeps the original seed feed — the default URL stays byte-identical.
 */
export function parseFeedSize(search: string): number | null {
  const raw = new URLSearchParams(search).get('feedSize');
  if (raw === null) return null;

  const size = Number(raw);
  if (!Number.isInteger(size) || size <= 0) return null;

  return Math.min(size, MAX_FEED_SIZE);
}

/**
 * Resolved once, when this module is first evaluated. Changing `?feedSize`
 * therefore needs a fresh page load — which is how the perf harness navigates.
 */
function resolveInitialFeed(): SnsCardData[] {
  if (typeof location === 'undefined') return [...seedPosts];

  const size = parseFeedSize(location.search);
  return size === null ? [...seedPosts] : generateFeed(size);
}

/** In-memory feed so a created post survives the success-driven refetch. */
let feed: SnsCardData[] = resolveInitialFeed();
let nextId = 1;

export const handlers = [
  http.get('/api/posts', ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limit = Number(url.searchParams.get('limit')) || 10;

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = feed.findIndex((p) => p.id === cursor);
      // Unknown/stale cursor → signal end rather than silently re-serving page 1.
      if (cursorIndex === -1) {
        return HttpResponse.json({ posts: [], nextCursor: null });
      }
      startIndex = cursorIndex + 1;
    }
    const page = feed.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < feed.length;
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

    return HttpResponse.json({ posts: page, nextCursor });
  }),

  http.post('/api/posts', async ({ request }) => {
    const parsed = createPostSchema.safeParse(await request.json());
    if (!parsed.success) {
      return HttpResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid post' },
        { status: 422 }
      );
    }

    const post: SnsCardData = {
      id: `server-${nextId++}`,
      user: CURRENT_USER,
      post: {
        content: parsed.data.content,
        images: parsed.data.images,
        createdAt: new Date().toISOString()
      },
      stats: { comments: 0, retweets: 0, likes: 0, views: 0 },
      liked: false
    };
    feed = [post, ...feed];

    return HttpResponse.json({ post }, { status: 201 });
  }),

  http.post('/api/posts/:id/like', ({ params }) => {
    const target = feed.find((p) => p.id === params.id);
    if (!target) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    // Single toggle: flip liked, adjust the count by ±1, confirm with the response.
    const liked = !target.liked;
    target.liked = liked;
    target.stats = { ...target.stats, likes: target.stats.likes + (liked ? 1 : -1) };

    return HttpResponse.json({ id: target.id, liked, likes: target.stats.likes });
  })
];
