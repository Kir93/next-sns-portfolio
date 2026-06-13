/**
 * SNS feed data contract. Mirrors `docs/ui/mainpage.md` SnsCardProps,
 * with `createdAt` as an ISO string (serialization / hydration safe).
 */
export interface SnsUser {
  profileImageUrl: string;
  displayName: string;
  username: string;
}

export interface SnsPost {
  content: string;
  /** Image URLs. May be absent or hold 0..N entries. */
  images?: string[];
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface SnsStats {
  comments: number;
  retweets: number;
  likes: number;
  views: number;
}

export interface SnsCardData {
  id: string;
  user: SnsUser;
  post: SnsPost;
  stats: SnsStats;
}

/** One page of the cursor-paginated feed. `nextCursor: null` marks the end. */
export interface FeedPage {
  posts: SnsCardData[];
  nextCursor: string | null;
}
