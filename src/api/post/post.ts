import { QueryOptions, useMutation, useQuery } from '@tanstack/react-query';

import { fetch } from '@configs/axios';

import { TPostAPI } from '.';
import { IPost, IPosts } from './post.types';

export const baseUrl = '/api/post';

export const useGetPosts = (options?: Omit<QueryOptions, 'queryKey' | 'queryFn'>) => {
  const queryKey = `${baseUrl}/posts`;
  const queryFn = async () => fetch.get(`${queryKey}`).then((res: { data: IPosts }) => res.data);
  return useQuery({
    queryKey: [queryKey],
    queryFn,
    ...options
  });
};

export const useGetPost = (
  postId: string,
  options?: Omit<QueryOptions, 'mutationKey' | 'mutationFn'>
) => {
  const mutationKey = `${baseUrl}/post`;
  const mutationFn = async () =>
    fetch.get(`${mutationKey}?postId=${postId}`).then((res: { data: IPost }) => res.data);
  return useMutation({ mutationKey: [mutationKey], mutationFn, ...options });
};

export const useAddPost = (data: TPostAPI.IPost, options: QueryOptions) => {
  const queryKey = `${baseUrl}/post`;
  const queryFn = async () => fetch.post(queryKey, data).then((res: { data: IPost }) => res.data);
  return useMutation({ queryKey: [queryKey], queryFn, ...options });
};
