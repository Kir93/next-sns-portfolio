import { expect, test } from '@playwright/test';

test('게시물 작성 시 피드 최상단에 즉시 반영된다', async ({ page }) => {
  await page.goto('/');

  const content = `E2E 작성 테스트 ${Date.now()}`;
  await page.getByLabel('게시물 내용').fill(content);
  await page.getByRole('button', { name: '게시하기' }).click();

  await expect(page.getByRole('article').first()).toContainText(content);
});
