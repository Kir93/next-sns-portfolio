import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';

/**
 * Test-only QueryClient with retries disabled so mutation/query failures surface
 * immediately instead of being retried. Shared by the mutation hook tests
 * (`useCreatePost`, `useToggleLike`).
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

/** Wrap a hook under test in a fresh QueryClientProvider; returns the client too. */
export function createWrapper(client: QueryClient = createTestQueryClient()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}
