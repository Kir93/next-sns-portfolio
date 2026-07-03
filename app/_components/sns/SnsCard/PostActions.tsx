import { BarChart3, Heart, MessageCircle, Repeat2 } from 'lucide-react';

import Icon from '@components/common/Icon';

import { cn } from '@lib/utils';

import { useToggleLike } from './useToggleLike';

import type { SnsStats } from '@type/sns';
import type { LucideIcon } from 'lucide-react';

interface PostActionsProps {
  postId: string;
  liked: boolean;
  stats: SnsStats;
}

const numberFormatter = new Intl.NumberFormat('ko-KR', { notation: 'compact' });

const actionButtonClass =
  'flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2';

function StatButton({ icon, label, count }: { icon: LucideIcon; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-label={`${label} ${numberFormatter.format(count)}`}
      className={cn(actionButtonClass, 'hover:text-gray-900')}
    >
      <Icon icon={icon} />
      {count > 0 && <span className="tabular-nums">{numberFormatter.format(count)}</span>}
    </button>
  );
}

export default function PostActions({ postId, liked, stats }: PostActionsProps) {
  const toggleLike = useToggleLike(postId);
  // A just-composed optimistic card has no server id yet — guard its like button.
  const disabled = postId.startsWith('temp-') || toggleLike.isPending;

  return (
    <div className="flex items-center justify-between pt-1 text-gray-500">
      <StatButton icon={MessageCircle} label="댓글" count={stats.comments} />
      <StatButton icon={Repeat2} label="리트윗" count={stats.retweets} />
      <button
        type="button"
        aria-pressed={liked}
        aria-label={`좋아요 ${numberFormatter.format(stats.likes)}`}
        disabled={disabled}
        onClick={() => toggleLike.mutate()}
        className={cn(
          actionButtonClass,
          'disabled:cursor-not-allowed disabled:opacity-50',
          liked ? 'text-rose-500' : 'hover:text-rose-500'
        )}
      >
        <Icon icon={Heart} className={liked ? 'fill-current' : undefined} />
        {stats.likes > 0 && (
          <span className="tabular-nums">{numberFormatter.format(stats.likes)}</span>
        )}
      </button>
      <StatButton icon={BarChart3} label="조회수" count={stats.views} />
    </div>
  );
}
