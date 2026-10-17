import { z } from 'zod';

export const MAX_CONTENT = 280;
export const MAX_IMAGES = 4;

/** Content rule shared by the compose form and the server (single source). */
export const contentField = z
  .string()
  .min(1, '내용을 입력해 주세요.')
  .max(MAX_CONTENT, `${MAX_CONTENT}자를 넘을 수 없습니다.`);

/**
 * Image URL rule shared by the compose form and the server. Restricted to the host
 * `next.config.mjs` `images.remotePatterns` allows: `next/image` throws on any other
 * host in development and the optimizer rejects it in production.
 */
export const imageUrlField = z.url({
  protocol: /^https$/,
  hostname: /^picsum\.photos$/,
  error: 'picsum.photos의 https 이미지 URL만 사용할 수 있습니다.'
});

/** API contract for `POST /api/posts`. Validated client-side and in the MSW handler. */
export const createPostSchema = z.object({
  content: contentField,
  images: z.array(imageUrlField).max(MAX_IMAGES, `이미지는 최대 ${MAX_IMAGES}장입니다.`).optional()
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
