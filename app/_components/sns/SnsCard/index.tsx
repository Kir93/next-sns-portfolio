import PostActions from './PostActions';
import PostContent from './PostContent';
import PostHeader from './PostHeader';

import type { SnsCardData } from '@type/sns';

export type SnsCardProps = Omit<SnsCardData, 'id'>;

export default function SnsCard({ user, post, stats }: SnsCardProps) {
  return (
    <article className="flex flex-col gap-3 px-4 py-3">
      <PostHeader user={user} createdAt={post.createdAt} />
      <PostContent post={post} authorName={user.displayName} />
      <PostActions stats={stats} />
    </article>
  );
}
