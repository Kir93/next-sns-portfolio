import { expect, test } from '@playwright/test';

// A browser that cannot register Service Workers has no data source (ADR-001):
// the page must say so instead of staying blank.
test.use({ serviceWorkers: 'block' });

test('Service Worker를 쓸 수 없으면 빈 화면 대신 안내를 보여준다', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Service Worker를 시작하지 못했습니다'
  );
  await expect(page.getByRole('region', { name: '피드' })).toHaveCount(0);
});
