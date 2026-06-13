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
