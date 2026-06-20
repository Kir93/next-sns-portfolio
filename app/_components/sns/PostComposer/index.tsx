'use client';

import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

import { MAX_CONTENT, contentField } from '@lib/schemas/post';

import { useCreatePost } from './useCreatePost';

const composeSchema = z.object({
  content: contentField,
  imageUrl: z.union([z.literal(''), z.url('올바른 이미지 URL이 아닙니다.')])
});

type ComposeForm = z.infer<typeof composeSchema>;

export default function PostComposer() {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ComposeForm>({
    resolver: zodResolver(composeSchema),
    defaultValues: { content: '', imageUrl: '' }
  });

  const { mutate, isPending, isError } = useCreatePost();

  const content = useWatch({ control, name: 'content' });

  const onSubmit = handleSubmit(({ content: text, imageUrl }) => {
    mutate(
      { content: text, images: imageUrl ? [imageUrl] : undefined },
      { onSuccess: () => reset({ content: '', imageUrl: '' }) }
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3">
      <label htmlFor="post-content" className="sr-only">
        게시물 내용
      </label>
      <textarea
        id="post-content"
        rows={3}
        placeholder="무슨 일이 일어나고 있나요?"
        className="w-full resize-none bg-transparent text-[15px] leading-normal outline-none placeholder:text-gray-400"
        {...register('content')}
      />
      {Boolean(errors.content) && (
        <p role="alert" className="text-sm text-red-600">
          {errors.content?.message}
        </p>
      )}

      <label htmlFor="post-image" className="sr-only">
        이미지 URL (선택)
      </label>
      <input
        id="post-image"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://example.com/image.jpg"
        className="w-full rounded-md bg-gray-100 px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        {...register('imageUrl')}
      />
      {Boolean(errors.imageUrl) && (
        <p role="alert" className="text-sm text-red-600">
          {errors.imageUrl?.message}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs tabular-nums text-gray-500">
          {content.length}/{MAX_CONTENT}
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {isPending && <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />}
          {isPending ? '게시 중…' : '게시하기'}
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm text-red-600">
        {isError ? '게시에 실패했습니다. 다시 시도해 주세요.' : ''}
      </p>
    </form>
  );
}
