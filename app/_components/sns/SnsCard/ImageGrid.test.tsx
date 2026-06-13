import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ImageGrid from './ImageGrid';

const makeImages = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/x-${i}/700/700`);

describe('ImageGrid', () => {
  it('renders nothing when there are no images', () => {
    const { container } = render(<ImageGrid alt="alt" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 4],
    [8, 4]
  ])('renders %i image(s) as %i tile(s), capping at 4', (input, expected) => {
    render(<ImageGrid images={makeImages(input)} alt="alt" />);
    expect(screen.getAllByRole('img')).toHaveLength(expected);
  });

  it('gives every image an accessible alt', () => {
    render(<ImageGrid images={makeImages(3)} alt="포스트 이미지" />);
    for (const img of screen.getAllByRole('img')) {
      expect(img).toHaveAccessibleName(/포스트 이미지/);
    }
  });
});
