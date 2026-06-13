import type { CreatePostInput } from '@lib/schemas/post';
import type { FeedPage, SnsCardData } from '@type/sns';

/** Fetch one cursor page of the feed. In development MSW intercepts `GET /api/posts`. */
export async function getPostsPage({
  cursor,
  limit = 10
}: {
  cursor: string | null;
  limit?: number;
}): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));

  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }
  return res.json() as Promise<FeedPage>;
}

/** Create a post. In development MSW intercepts `POST /api/posts`. */
export async function createPost(input: CreatePostInput): Promise<SnsCardData> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(`Failed to create post: ${res.status}`);
  }
  const data: { post: SnsCardData } = await res.json();
  return data.post;
}
