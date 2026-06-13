'use client';

import { useQuery } from '@tanstack/react-query';

import { getPosts } from '@api/post/post';

import SnsCard from './SnsCard';

function FeedStatus({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 items-center justify-center p-10 text-center text-sm text-gray-500"
    >
      {message}
    </div>
  );
}

/**
 * Fetches the feed via TanStack Query and renders it as a vertical list of
 * SnsCard items. Structured to extend toward infinite scroll (slice 3).
 */
export default function FeedContainer() {
  const {
    data: posts,
    isPending,
    isError
  } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts
  });

  if (isPending) {
    return <FeedStatus message="피드를 불러오는 중…" />;
  }
  if (isError) {
    return <FeedStatus message="피드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />;
  }
  if (posts.length === 0) {
    return <FeedStatus message="아직 게시물이 없습니다." />;
  }

  return (
    <section aria-label="피드">
      <ul className="divide-y divide-gray-200">
        {posts.map((item) => (
          <li key={item.id}>
            <SnsCard user={item.user} post={item.post} stats={item.stats} />
          </li>
        ))}
      </ul>
    </section>
  );
}
