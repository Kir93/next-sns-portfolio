import { QueryOptions, useMutation, useQuery } from '@tanstack/react-query';

import { fetch } from '@configs/axios';

import { TUserAPI } from '.';

import type { IUser } from './user.types';

export const baseUrl = '/api/user';

export const useGetUser = (
  userId: string,
  options?: Omit<QueryOptions, 'queryKey' | 'queryFn'>
) => {
  const queryKey = `${baseUrl}/user`;
  const queryFn = async () =>
    fetch.get(`${queryKey}?userId=${userId}`).then((res: { data: IUser }) => res.data);
  return useQuery({ queryKey: [queryKey], queryFn, ...options });
};

export const usePutUser = (
  data: TUserAPI.IUser,
  options?: Omit<QueryOptions, 'mutationKey' | 'mutationFn'>
) => {
  const mutationKey = `${baseUrl}/user`;
  const mutationFn = async () =>
    fetch.put(`${mutationKey}?userId=${data.id}`, data).then((res: { data: IUser }) => res.data);
  return useMutation({ mutationKey: [mutationKey], mutationFn, ...options });
};
