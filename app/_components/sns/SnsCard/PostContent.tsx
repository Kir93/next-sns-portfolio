import ImageGrid from './ImageGrid';

import type { SnsPost } from '@type/sns';

interface PostContentProps {
  post: SnsPost;
  authorName: string;
}

export default function PostContent({ post, authorName }: PostContentProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {Boolean(post.content) && (
        <p className="text-[15px] leading-normal whitespace-pre-wrap break-words text-gray-900">
          {post.content}
        </p>
      )}
      <ImageGrid images={post.images} alt={`${authorName}님의 게시물 이미지`} />
    </div>
  );
}
