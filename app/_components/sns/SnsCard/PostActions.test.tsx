import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PostActions from './PostActions';
import { createWrapper } from '../../../../src/test/react-query';

import type { SnsStats } from '@type/sns';

const stats: SnsStats = { comments: 12, retweets: 0, likes: 4820, views: 130400 };

function renderActions(props?: Partial<{ postId: string; liked: boolean; stats: SnsStats }>) {
  const { Wrapper } = createWrapper();
  return render(<PostActions postId="p1" liked={false} stats={stats} {...props} />, {
    wrapper: Wrapper
  });
}

describe('PostActions', () => {
  it('renders an aria-labelled button for every action', () => {
    renderActions();
    for (const label of ['댓글', '리트윗', '좋아요', '조회수']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('shows a count for positive stats and hides a zero count', () => {
    renderActions();
    expect(screen.getByRole('button', { name: /좋아요/ }).textContent ?? '').toMatch(/\d/);
    expect(screen.getByRole('button', { name: /리트윗/ }).textContent ?? '').not.toMatch(/\d/);
  });

  it('exposes the liked state via aria-pressed', () => {
    renderActions({ liked: true });
    expect(screen.getByRole('button', { name: /좋아요/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables the like button for an optimistic (temp) card', () => {
    renderActions({ postId: 'temp-abc' });
    expect(screen.getByRole('button', { name: /좋아요/ })).toBeDisabled();
  });
});
