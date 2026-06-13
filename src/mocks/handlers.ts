import { http, HttpResponse } from 'msw';

import { CURRENT_USER } from '@lib/current-user';
import { createPostSchema } from '@lib/schemas/post';

import { posts as seedPosts } from './data/posts';

import type { SnsCardData } from '@type/sns';

/** In-memory feed so a created post survives the success-driven refetch. */
let feed: SnsCardData[] = [...seedPosts];
let nextId = 1;

export const handlers = [
  http.get('/api/posts', () => HttpResponse.json({ posts: feed })),

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
      stats: { comments: 0, retweets: 0, likes: 0, views: 0 }
    };
    feed = [post, ...feed];

    return HttpResponse.json({ post }, { status: 201 });
  })
];
