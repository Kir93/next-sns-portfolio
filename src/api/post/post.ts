import type { CreatePostInput } from '@lib/schemas/post';
import type { SnsCardData } from '@type/sns';

/** Fetch the feed. In development MSW intercepts `GET /api/posts`. */
export async function getPosts(): Promise<SnsCardData[]> {
  const res = await fetch('/api/posts');
  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }
  const data: { posts: SnsCardData[] } = await res.json();
  return data.posts;
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
