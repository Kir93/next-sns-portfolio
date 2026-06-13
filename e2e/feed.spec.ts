import { expect, test } from '@playwright/test';

test('홈 진입 시 MSW가 가로챈 피드 카드가 렌더된다', async ({ page }) => {
  await page.goto('/');

  const feed = page.getByRole('region', { name: '피드' });
  await expect(feed).toBeVisible();
  await expect(feed.getByRole('article').first()).toBeVisible();
});
