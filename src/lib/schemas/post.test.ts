import { describe, expect, it } from 'vitest';

import { createPostSchema, imageUrlField } from './post';

describe('imageUrlField', () => {
  it('next.config가 허용한 picsum.photos https URL은 통과한다', () => {
    expect(imageUrlField.safeParse('https://picsum.photos/seed/demo/700/700').success).toBe(true);
  });

  it.each([
    'https://example.com/image.jpg',
    'http://picsum.photos/seed/demo/700/700',
    'https://picsum.photos.evil.com/a.jpg',
    'javascript:alert(1)'
  ])('%s 는 거부한다 — next/image가 렌더할 수 없는 URL', (url) => {
    expect(imageUrlField.safeParse(url).success).toBe(false);
  });

  it('서버 계약(createPostSchema)도 같은 규칙으로 거부한다', () => {
    const parsed = createPostSchema.safeParse({
      content: '본문',
      images: ['https://example.com/image.jpg']
    });
    expect(parsed.success).toBe(false);
  });
});
