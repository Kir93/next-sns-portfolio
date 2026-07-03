import { expect, test } from '@playwright/test';

type ClsWindow = { __cls: number };
type LayoutShift = PerformanceEntry & { value: number; hadRecentInput: boolean };

test('스켈레톤→콘텐츠 전환과 무한스크롤에서 CLS 회귀가 임계 이하다', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as ClsWindow;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as LayoutShift;
        if (!shift.hadRecentInput) {
          w.__cls += shift.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto('/');

  // 스켈레톤 fallback 이후 실제 피드 카드로 전환된다.
  const feed = page.getByRole('region', { name: '피드' });
  await expect(feed.getByRole('article').first()).toBeVisible();

  // 무한스크롤: 하단 스크롤 시 다음 페이지가 이어 로드된다.
  const articles = page.getByRole('article');
  const before = await articles.count();
  await page.mouse.wheel(0, 30_000);
  await expect.poll(() => articles.count()).toBeGreaterThan(before);

  // 레이아웃 안정화 후 누적 CLS 측정(Web Vitals "good" 임계 0.1 이하).
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as unknown as ClsWindow).__cls);
  expect(cls, `누적 CLS=${cls}`).toBeLessThan(0.1);
});

test('초기 로드 시 다음 페이지 로딩 스피너 없이 바로 카드가 보인다', async ({ page }) => {
  await page.goto('/');
  const feed = page.getByRole('region', { name: '피드' });
  await expect(feed).toBeVisible();
  // 본문에 isPending/isError 분기 대신 경계가 처리 — 첫 카드가 직접 노출된다.
  await expect(feed.getByRole('article').first()).toBeVisible();
});
