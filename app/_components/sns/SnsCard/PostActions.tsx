import { BarChart3, Heart, MessageCircle, Repeat2 } from 'lucide-react';

import Icon from '@components/common/Icon';

import type { SnsStats } from '@type/sns';

interface PostActionsProps {
  stats: SnsStats;
}

const numberFormatter = new Intl.NumberFormat('ko-KR', { notation: 'compact' });

const actions = [
  { key: 'comments', icon: MessageCircle, label: '댓글' },
  { key: 'retweets', icon: Repeat2, label: '리트윗' },
  { key: 'likes', icon: Heart, label: '좋아요' },
  { key: 'views', icon: BarChart3, label: '조회수' }
] as const;

export default function PostActions({ stats }: PostActionsProps) {
  return (
    <div className="flex items-center justify-between pt-1 text-gray-500">
      {actions.map(({ key, icon, label }) => {
        const count = stats[key];
        return (
          <button
            key={key}
            type="button"
            aria-label={`${label} ${numberFormatter.format(count)}`}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Icon icon={icon} />
            {count > 0 && <span className="tabular-nums">{numberFormatter.format(count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
