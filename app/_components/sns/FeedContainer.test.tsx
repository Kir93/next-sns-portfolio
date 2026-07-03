import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import FeedContainer from './FeedContainer';
import { server } from '../../../src/mocks/server';
import { createWrapper } from '../../../src/test/react-query';

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
