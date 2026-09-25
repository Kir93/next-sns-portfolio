import { expect, test } from '@playwright/test';

import type { TickEngineWindow } from '../src/mocks/tick/instrumentation';
import type { FeedPage } from '../src/types/sns';

/**
 * Taps racing a live tick stream must end exactly where the server (the MSW feed)
 * ends — no lost like, no lost tick. Only the settled state is asserted: the
 * intermediate counts during the race are allowed to move.
 */
test('틱 폭주 중 연타해도 좋아요 상태와 카운트가 서버와 같게 끝난다', async ({ page }) => {
  await page.goto('/?tick=20');
  const cards = page.getByRole('region', { name: '피드' }).getByRole('article');
  await expect(cards.first()).toBeVisible();
  await page.waitForFunction(() => Boolean((window as TickEngineWindow).__tickEngine));

  // Cards 0..3 are p1..p4 (the first page serves the seed feed in order).
  const tapsPerCard = [1, 2, 3, 1];
  for (const [index, taps] of tapsPerCard.entries()) {
    const like = cards.nth(index).getByRole('button', { name: /^좋아요/ });
    for (let tap = 0; tap < taps; tap += 1) await like.click();
  }

  // Let ticks keep landing on top of the in-flight toggles, then stop them.
  await page.waitForTimeout(1_500);
  await page.evaluate(() => (window as TickEngineWindow).__tickEngine?.stop());

  const matchesServer = () =>
    page.evaluate(async (count) => {
      const res = await fetch('/api/posts?limit=18');
      const { posts }: FeedPage = await res.json();
      const format = new Intl.NumberFormat('ko-KR', { notation: 'compact' });
      const buttons = [
        ...(document.querySelector('section[aria-label="피드"]')?.querySelectorAll('article') ?? [])
      ]
        .slice(0, count)
        .map((article) => article.querySelector('button[aria-pressed]'));
      return buttons.every((button, index) => {
        const server = posts[index];
        return (
          button?.getAttribute('aria-pressed') === String(server.liked) &&
          button?.getAttribute('aria-label') === `좋아요 ${format.format(server.stats.likes)}`
        );
      });
    }, tapsPerCard.length);

  await expect.poll(matchesServer, { timeout: 10_000 }).toBe(true);

  // The taps were not no-ops: odd tap counts flipped the server's liked state.
  const liked = await cards.evaluateAll((articles) =>
    articles
      .slice(0, 4)
      .map((a) => a.querySelector('button[aria-pressed]')?.getAttribute('aria-pressed'))
  );
  expect(liked).toEqual(['true', 'false', 'true', 'true']);
});
