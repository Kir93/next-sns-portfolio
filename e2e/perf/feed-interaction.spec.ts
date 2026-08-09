import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { expect, test } from '@playwright/test';

import { DEFAULT_FEED_SEED } from '../../src/mocks/data/generateFeed';
import {
  EVENT_DURATION_THRESHOLD,
  MIN_INTERACTION_SAMPLE,
  blockRemoteImages,
  boostFeedPageLimit,
  installCommitCounter,
  installPerfObservers,
  readCommitCount,
  readPerfSample,
  resetPerfSample,
  summarize,
  throttleCpu
} from '../utils/perfObservers';

import type { PerfMetrics } from '../utils/perfObservers';

/**
 * Report-only measurement — no threshold assertions. Blocking CI on a latency
 * number is deliberately out of scope (flake risk); `pnpm perf` aggregates the
 * runs and `docs/perf/methodology.md` records the conditions.
 */

/** A malformed override must fall back, not silently reshape the scenario. */
function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const FEED_SIZE = positiveInt(process.env.PERF_FEED_SIZE, 506);
const CPU_THROTTLE = positiveInt(process.env.PERF_CPU_THROTTLE, 4);
const REPEAT = positiveInt(process.env.PERF_REPEAT, 5);
const OUT_FILE = process.env.PERF_OUT ?? 'perf-results/feed-interaction.json';

/**
 * Distinct cards per run — the like button self-disables while its mutation is in
 * flight. Sized well above the observable count on purpose: event timing hides
 * anything under {@link EVENT_DURATION_THRESHOLD}, so a run only yields a usable
 * p75 when enough taps clear that floor.
 */
const LIKE_TAPS = 20;

/**
 * Taps start this far down the feed so they land on cards the scroll actually
 * reached. Tapping from index 0 would scroll the viewport back to the top and
 * measure a different scenario than the one this spec is named after.
 */
const TAP_OFFSET = 40;

test('스트레스 피드에서 interaction latency와 long task를 반복 측정한다', async ({ page }) => {
  // Generous per-run headroom: a shared CI runner is slower than a local machine,
  // and a timeout kill would leave the artifact without a summary at all.
  test.setTimeout(180_000 + REPEAT * 120_000);

  await blockRemoteImages(page);
  await boostFeedPageLimit(page, FEED_SIZE);
  await installCommitCounter(page);
  await installPerfObservers(page);
  await throttleCpu(page, CPU_THROTTLE);

  const runs: PerfMetrics[] = [];
  let servedCards = 0;

  // Warm-up load, discarded. The first production load pays JIT and cache costs
  // that land entirely in run 1 otherwise: measured 336-371ms of load-phase long
  // task against 69-79ms for every later run, which alone pushed that metric's
  // coefficient of variation from ~6% to ~93%.
  await page.goto(`/?feedSize=${FEED_SIZE}`);
  await expect(
    page.getByRole('region', { name: '피드' }).getByRole('article').first()
  ).toBeVisible();

  for (let run = 0; run < REPEAT; run += 1) {
    await page.goto(`/?feedSize=${FEED_SIZE}`);

    const feed = page.getByRole('region', { name: '피드' });
    await expect(feed.getByRole('article').first()).toBeVisible();

    // Instrumentation survival: a boosted feed of the requested size must actually
    // be on the page, or the run measured something other than the stress scenario.
    servedCards = await feed.getByRole('article').count();
    expect(servedCards).toBe(FEED_SIZE);

    const commitsAfterLoad = await readCommitCount(page);
    expect(commitsAfterLoad).toBeGreaterThan(0);

    // Close the load phase: keep its long tasks as their own figure (feed
    // generation + initial render), then clear so the interaction numbers below
    // measure only the scroll/tap work.
    const loadSample = await readPerfSample(page);
    await resetPerfSample(page);

    // Scroll down, then tap cards at that depth so the interaction happens where
    // the scroll left the viewport.
    for (let step = 0; step < 4; step += 1) {
      await page.mouse.wheel(0, 6_000);
    }

    const likeButtons = feed.getByRole('button', { name: /^좋아요/ });
    for (let tap = 0; tap < LIKE_TAPS; tap += 1) {
      const button = likeButtons.nth(TAP_OFFSET + tap);
      await button.scrollIntoViewIfNeeded();
      await button.click();
    }

    // Wait for the commit stream itself to go quiet — two consecutive samples with
    // the same count. A slow run would otherwise lose the trailing onSuccess
    // commits (measured: 60 → 47) and the count would stop being comparable.
    // Polling the disabled-button set instead would pass on its first sample,
    // before the pending mutations have even registered.
    let previousCount = -1;
    await expect
      .poll(
        async () => {
          const current = await readCommitCount(page);
          const settled = current === previousCount;
          previousCount = current;
          return settled;
        },
        { timeout: 30_000, intervals: [250] }
      )
      .toBe(true);

    // Event timing entries are dispatched asynchronously after the interaction.
    await page.waitForTimeout(1_000);
    const commitsTotal = await readCommitCount(page);

    runs.push(
      summarize(await readPerfSample(page), loadSample, {
        load: commitsAfterLoad,
        interaction: commitsTotal - commitsAfterLoad
      })
    );

    // Written every repetition: a later failure then still leaves the completed
    // runs on disk instead of discarding the whole session.
    writeReport();
  }

  function writeReport(): void {
    const report = {
      scenario: 'feed-interaction',
      conditions: {
        feedSizeRequested: FEED_SIZE,
        /** Cards actually rendered — the requested size can be clamped by the handler. */
        feedSizeServed: servedCards,
        feedSeed: DEFAULT_FEED_SEED,
        cpuThrottleRate: CPU_THROTTLE,
        repeat: REPEAT,
        completedRuns: runs.length,
        /** Discarded loads before measuring — JIT/cache warm-up. */
        warmupRuns: 1,
        likeTapsPerRun: LIKE_TAPS,
        tapOffset: TAP_OFFSET,
        buildMode: 'production',
        remoteImages: 'blocked'
      },
      limits: {
        eventDurationThresholdMs: EVENT_DURATION_THRESHOLD,
        attemptedInteractionsPerRun: LIKE_TAPS,
        minInteractionSample: MIN_INTERACTION_SAMPLE,
        note: 'event timing is quantized to 8ms and hides durations under the threshold, so interaction.count is the observed subset of attemptedInteractionsPerRun — not the number of taps. p75 is null when count is under minInteractionSample. Compare relatively within one runner, never as absolute values across machines.'
      },
      runs
    };

    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  }
});
