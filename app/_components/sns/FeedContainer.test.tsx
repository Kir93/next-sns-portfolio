import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FeedContainer from './FeedContainer';
import { mapPost } from './SnsCard/useToggleLike';
import { FEED_QUERY_KEY } from './useInfiniteFeed';
import { server } from '../../../src/mocks/server';
import { createWrapper } from '../../../src/test/react-query';

import type { InfiniteData } from '@tanstack/react-query';
import type { FeedPage } from '@type/sns';

describe('FeedContainer 비동기 경계', () => {
  it('로딩 중 스켈레톤(role=status)을 보여주고, 로드되면 피드로 전환된다', async () => {
    const { Wrapper } = createWrapper();
    render(<FeedContainer />, { wrapper: Wrapper });

    // Suspense fallback이 동기 렌더되므로 fetch 해소 전 스켈레톤이 보인다.
    expect(screen.getByRole('status', { name: /불러오는 중/ })).toBeInTheDocument();

    expect(await screen.findByRole('region', { name: '피드' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /불러오는 중/ })).not.toBeInTheDocument();
  });

  it('로드 실패 시 에러 + 다시 시도 버튼을 보여주고, 클릭하면 복구된다', async () => {
    server.use(
      http.get('/api/posts', () => HttpResponse.json({ error: 'boom' }, { status: 500 }), {
        once: true
      })
    );
    const { Wrapper } = createWrapper();
    render(<FeedContainer />, { wrapper: Wrapper });

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(screen.getByRole('alert')).toHaveTextContent(/불러오지 못했/);

    await userEvent.click(retry);

    expect(await screen.findByRole('region', { name: '피드' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
    );
  });
});

describe('FeedContainer 무한스크롤 sentinel', () => {
  const stubbed = globalThis.IntersectionObserver;
  afterEach(() => vi.stubGlobal('IntersectionObserver', stubbed));

  it('좋아요 탭이 다음 페이지 로드를 취소해도 토글이 끝나면 sentinel을 다시 관찰해 이어서 로드한다', async () => {
    // A real observer fires only on an intersection change; this stub fires only
    // when the test says so, so a fresh observer is the one way loading resumes.
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          callbacks.push(callback);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
    );
    const intersect = () =>
      callbacks.at(-1)?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );

    // Hold next-page responses so the tap lands while the fetch is in flight, and
    // the like until the test releases it; returning nothing falls through to the
    // default handler.
    let releaseLike = () => {};
    const likeGate = new Promise<void>((resolve) => (releaseLike = resolve));
    server.use(
      http.get('/api/posts', async ({ request }) => {
        if (new URL(request.url).searchParams.has('cursor')) await delay(100);
      }),
      http.post('/api/posts/:id/like', async () => {
        await likeGate;
      })
    );

    const { Wrapper } = createWrapper();
    render(<FeedContainer />, { wrapper: Wrapper });
    await screen.findByRole('region', { name: '피드' });
    expect(screen.getAllByRole('article')).toHaveLength(6);

    // The sentinel starts the next page; a like tap lands before it resolves.
    act(() => intersect());
    await screen.findByRole('status', { name: '다음 페이지 불러오는 중' });
    const observersBefore = callbacks.length;
    fireEvent.click(screen.getAllByRole('button', { name: /^좋아요/ })[0]);

    // The cancelled page fetch ends, but the sentinel stays off until the toggle settles.
    await waitFor(() =>
      expect(screen.queryByRole('status', { name: '다음 페이지 불러오는 중' })).toBeNull()
    );
    expect(callbacks.length).toBe(observersBefore);

    releaseLike();
    await waitFor(() => expect(callbacks.length).toBeGreaterThan(observersBefore));
    act(() => intersect());
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(12));
  });
});

describe('FeedContainer 카드 구독 경계', () => {
  // jsdom has no content-visibility; the test plays the browser's part.
  class SkipEvent extends Event {
    constructor(readonly skipped: boolean) {
      super('contentvisibilityautostatechange');
    }
  }
  afterEach(() => vi.unstubAllGlobals());

  it('브라우저가 건너뛰는 카드는 카운트 갱신을 받지 않고, 다시 보이면 최신값으로 따라잡는다', async () => {
    vi.stubGlobal('ContentVisibilityAutoStateChangeEvent', SkipEvent);
    const { client, Wrapper } = createWrapper();
    render(<FeedContainer />, { wrapper: Wrapper });
    const feed = await screen.findByRole('region', { name: '피드' });
    const [card, control] = feed.querySelectorAll('li');

    const likeButton = () => within(card).getByRole('button', { name: /^좋아요/ });
    // The MSW feed outlives each test, so read the count instead of assuming the seed's.
    const before = likeButton().getAttribute('aria-label');

    act(() => {
      card.dispatchEvent(new SkipEvent(true));
    });
    act(() => {
      client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
        // The first two seed posts — `card` and `control`.
        ['p1', 'p2'].reduce(
          (data, id) =>
            mapPost(data, id, (post) => ({
              ...post,
              stats: { ...post.stats, likes: 500 }
            })),
          old
        )
      );
    });
    // Cache notifications are async: the visible card updating proves one went out.
    expect(await within(control).findByRole('button', { name: '좋아요 500' })).toBeInTheDocument();
    expect(likeButton()).toHaveAttribute('aria-label', before);

    act(() => {
      card.dispatchEvent(new SkipEvent(false));
    });
    expect(await within(card).findByRole('button', { name: '좋아요 500' })).toBeInTheDocument();
  });
});
