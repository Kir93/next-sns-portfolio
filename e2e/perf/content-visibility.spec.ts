import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { expect, test } from '@playwright/test';

import { DEFAULT_FEED_SEED } from '../../src/mocks/data/generateFeed';
import {
  blockRemoteImages,
  boostFeedPageLimit,
  createRendererCounterReader,
  throttleCpu
} from '../utils/perfObservers';

import type { Page } from '@playwright/test';

/**
 * Re-runs `docs/perf/after.md`'s N=506 content-visibility experiment on this
 * harness, so the report's claim stops depending on an uncommitted script.
 *
 * Method (unchanged from the original): read the cumulative renderer counters
 * with `content-visibility: auto` in effect, force every card to `visible`, then
 * read them again. The delta is the layout/style work `cv:auto` skipped.
 *
 * This is a direction check, not a number-for-number reproduction — the original
 * ran unthrottled on system Chrome with a `featured 6 + generated 500` feed.
 */

const FEED_SIZE = 506;
const CPU_THROTTLE = 4;
const OUT_FILE = process.env.PERF_CV_OUT ?? 'perf-results/content-visibility.json';

/** Forces pending layout, then waits out the renderer work both reads must exclude. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.body.getBoundingClientRect().height);
  await page.waitForTimeout(2_000);
}

test('content-visibility:auto가 생략하는 렌더 작업량을 격리 측정한다', async ({ page }) => {
  test.setTimeout(180_000);

  await blockRemoteImages(page);
  await boostFeedPageLimit(page, FEED_SIZE);
  await throttleCpu(page, CPU_THROTTLE);

  await page.goto(`/?feedSize=${FEED_SIZE}`);
  const feed = page.getByRole('region', { name: '피드' });
  await expect(feed.getByRole('article').first()).toBeVisible();
  expect(await feed.getByRole('article').count()).toBe(FEED_SIZE);

  const readCounters = await createRendererCounterReader(page);

  // Both reads settle the same way. Reading the baseline while the initial render
  // is still finishing would charge that leftover work to the forced-visible delta.
  await settle(page);
  const withContentVisibility = await readCounters();

  // Force every card to render, then read the counters the forced work advanced.
  await page.addStyleTag({
    content: 'main li { content-visibility: visible !important; }'
  });
  await settle(page);

  const forcedVisible = await readCounters();

  // Sanity check that the toggle actually took effect, as the original did.
  const computed = await feed
    .getByRole('article')
    .first()
    .evaluate((node) => getComputedStyle(node.parentElement as HTMLElement).contentVisibility);
  expect(computed).toBe('visible');

  const deltaMs = (name: string) =>
    Math.round((forcedVisible[name] - withContentVisibility[name]) * 10_000) / 10;

  const report = {
    scenario: 'content-visibility-isolation',
    conditions: {
      feedSizeRequested: FEED_SIZE,
      feedSeed: DEFAULT_FEED_SEED,
      cpuThrottleRate: CPU_THROTTLE,
      buildMode: 'production',
      remoteImages: 'blocked'
    },
    /** Work `cv:auto` skipped — positive means the CSS virtualization saved that much. */
    skippedByContentVisibilityMs: {
      layout: deltaMs('LayoutDuration'),
      recalcStyle: deltaMs('RecalcStyleDuration')
    },
    note: 'single run, direction check only — the original after.md experiment ran unthrottled on system Chrome; compare sign and rough magnitude, never the absolute numbers'
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
});
