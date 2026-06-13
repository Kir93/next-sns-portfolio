import { z } from 'zod';

export const MAX_CONTENT = 280;
export const MAX_IMAGES = 4;

/** Content rule shared by the compose form and the server (single source). */
export const contentField = z
  .string()
  .min(1, '내용을 입력해 주세요.')
  .max(MAX_CONTENT, `${MAX_CONTENT}자를 넘을 수 없습니다.`);

/** API contract for `POST /api/posts`. Validated client-side and in the MSW handler. */
export const createPostSchema = z.object({
  content: contentField,
  images: z
    .array(z.url('올바른 이미지 URL이 아닙니다.'))
    .max(MAX_IMAGES, `이미지는 최대 ${MAX_IMAGES}장입니다.`)
    .optional()
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
