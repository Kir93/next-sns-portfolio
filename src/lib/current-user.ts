import type { SnsUser } from '@type/sns';

/**
 * The signed-in author for newly composed posts. This is a no-auth portfolio,
 * so the identity is fixed and shared by the optimistic update and the mock
 * server so the two cards match.
 */
export const CURRENT_USER: SnsUser = {
  profileImageUrl: 'https://picsum.photos/seed/me/96/96',
  displayName: '나',
  username: 'me'
};
