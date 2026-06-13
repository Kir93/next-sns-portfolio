import Avatar from '@components/common/Avatar';

import type { SnsUser } from '@type/sns';

interface PostHeaderProps {
  user: SnsUser;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC'
});

export default function PostHeader({ user, createdAt }: PostHeaderProps) {
  return (
    <header className="flex items-center gap-2">
      <Avatar src={user.profileImageUrl} alt={`${user.displayName} 프로필 이미지`} />
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm">
        <span className="truncate font-bold text-gray-900">{user.displayName}</span>
        <span className="truncate text-gray-500">@{user.username}</span>
        <span className="text-gray-400" aria-hidden>
          ·
        </span>
        <time dateTime={createdAt} className="text-gray-500">
          {dateFormatter.format(new Date(createdAt))}
        </time>
      </div>
    </header>
  );
}
