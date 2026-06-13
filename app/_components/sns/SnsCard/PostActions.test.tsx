import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PostActions from './PostActions';

import type { SnsStats } from '@type/sns';

const stats: SnsStats = { comments: 12, retweets: 0, likes: 4820, views: 130400 };

describe('PostActions', () => {
  it('renders an aria-labelled button for every action', () => {
    render(<PostActions stats={stats} />);
    for (const label of ['댓글', '리트윗', '좋아요', '조회수']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('shows a count for positive stats and hides a zero count', () => {
    render(<PostActions stats={stats} />);
    expect(screen.getByRole('button', { name: /좋아요/ }).textContent ?? '').toMatch(/\d/);
    expect(screen.getByRole('button', { name: /리트윗/ }).textContent ?? '').not.toMatch(/\d/);
  });
});
