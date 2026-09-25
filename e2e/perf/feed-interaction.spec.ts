import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { expect, test } from '@playwright/test';

import { DEFAULT_FEED_SEED } from '../../src/mocks/data/generateFeed';
import { DEFAULT_TICK_RATIO } from '../../src/mocks/tick/tickSource';
import {
  EVENT_DURATION_THRESHOLD,
  MIN_INTERACTION_SAMPLE,
  blockRemoteImages,
  boostFeedPageLimit,
  installCommitCounter,
  installPerfObservers,
  readCommitCount,
  readPerfSample,
  readTickStats,
  resetPerfSample,
  stopTicks,
  summarize,
  throttleCpu,
  tickMetrics
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

interface PerfCondition {
  label: string;
  feedSize: number;
  /** 0 = no ticks. */
  tickHz: number;
  /** Ingestion mode for tick conditions (`?sched`); absent = the app default, `off`. */
  sched?: 'off' | 'yield' | 'raf' | 'both';
}

/**
 * Conditions compared within one run — across runs only the commit count is a
 * valid comparison (`docs/perf/methodology.md`), so a before/after or an A/B has
 * to be measured back to back. `default` is the original single-condition run CI
 * keeps; `high-frequency` (the 00 baseline) and `sched` (the four `?sched` ingestion
 * modes) are opt-in because a 2000-card run takes minutes per load.
 */
const SCENARIOS: Record<string, PerfCondition[]> = {
  default: [{ label: 'baseline', feedSize: FEED_SIZE, tickHz: 0 }],
  'high-frequency': [
    { label: 'N=2000 · 틱 off (대조군)', feedSize: 2000, tickHz: 0 },
    { label: 'N=2000 · 20Hz', feedSize: 2000, tickHz: 20 },
    { label: 'N=506 · 20Hz (무부하 틱 대조군)', feedSize: 506, tickHz: 20 }
  ],
  sched: [
    { label: 'N=2000 · 틱 off (대조군)', feedSize: 2000, tickHz: 0 },
    { label: 'sched=off', feedSize: 2000, tickHz: 20, sched: 'off' },
    { label: 'sched=yield', feedSize: 2000, tickHz: 20, sched: 'yield' },
    { label: 'sched=raf', feedSize: 2000, tickHz: 20, sched: 'raf' },
    { label: 'sched=both', feedSize: 2000, tickHz: 20, sched: 'both' }
  ]
};

const SCENARIO = process.env.PERF_SCENARIO ?? 'default';
const CONDITIONS = SCENARIOS[SCENARIO];
if (!CONDITIONS) {
  throw new Error(
    `Unknown PERF_SCENARIO "${SCENARIO}" — one of ${Object.keys(SCENARIOS).join(', ')}`
  );
}

/**
 * Distinct cards per run, so every tap sends its own request — repeated taps on one
 * card are deduplicated by `useToggleLike`. Sized well above the observable count on purpose: event timing hides
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

interface ConditionReport extends PerfCondition {
  /** Cards actually rendered — the requested size can be clamped by the handler. */
  feedSizeServed: number;
  runs: PerfMetrics[];
}

test('스트레스 피드에서 interaction latency와 long task를 반복 측정한다', async ({ page }) => {
  // Generous per-load headroom: a 2000-card tick run spends over a minute in its
  // taps on a local machine, and a shared CI runner is slower still.
  test.setTimeout(60_000 + CONDITIONS.length * (REPEAT + 1) * 180_000);

  await blockRemoteImages(page);
  // One rewrite for every condition: a limit above the feed size still returns
  // the whole (smaller) feed, and the count check below catches a short page.
  await boostFeedPageLimit(page, Math.max(...CONDITIONS.map((c) => c.feedSize)));
  await installCommitCounter(page);
  await installPerfObservers(page);
  await throttleCpu(page, CPU_THROTTLE);

  const reports: ConditionReport[] = [];

  for (const condition of CONDITIONS) {
    const params = new URLSearchParams({ feedSize: String(condition.feedSize) });
    if (condition.tickHz > 0) params.set('tick', String(condition.tickHz));
    if (condition.sched) params.set('sched', condition.sched);
    const url = `/?${params.toString()}`;
    const report: ConditionReport = { ...condition, feedSizeServed: 0, runs: [] };
    reports.push(report);

    // Warm-up load per condition, discarded. The first production load pays JIT
    // and cache costs that land entirely in run 1 otherwise: measured 336-371ms
    // of load-phase long task against 69-79ms for every later run, which alone
    // pushed that metric's coefficient of variation from ~6% to ~93%. A tick
    // condition also loads the tick engine chunk for the first time here.
    await page.goto(url);
    await expect(
      page.getByRole('region', { name: '피드' }).getByRole('article').first()
    ).toBeVisible();

    for (let run = 0; run < REPEAT; run += 1) {
      await page.goto(url);

      const feed = page.getByRole('region', { name: '피드' });
      await expect(feed.getByRole('article').first()).toBeVisible();

      // Instrumentation survival: a boosted feed of the requested size must actually
      // be on the page, or the run measured something other than the stress scenario.
      report.feedSizeServed = await feed.getByRole('article').count();
      expect(report.feedSizeServed).toBe(condition.feedSize);

      const commitsAfterLoad = await readCommitCount(page);
      expect(commitsAfterLoad).toBeGreaterThan(0);

      // Close the load phase: keep its long tasks as their own figure (feed
      // generation + initial render), then clear so the interaction numbers below
      // measure only the scroll/tap work.
      const loadSample = await readPerfSample(page);
      await resetPerfSample(page);
      const ticksAtStart = await readTickStats(page);
      // A tick condition without a running engine would measure the no-tick case.
      expect(ticksAtStart !== null).toBe(condition.tickHz > 0);

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

      const ticksAtStop = await stopTicks(page);
      // Yielding modes may still be draining ticks delivered before the stop.
      // Their cost and commits belong to this run, so wait for ingestion to go idle.
      if (ticksAtStop) {
        await expect
          .poll(async () => (await readTickStats(page))?.pending, {
            timeout: 30_000,
            intervals: [100]
          })
          .toBe(0);
      }
      const ticksDrained = await readTickStats(page);

      // Wait for the commit stream itself to go quiet — two consecutive samples with
      // the same count. A slow run would otherwise lose the trailing commits of
      // in-flight mutations (measured before the like redesign: 60 → 47) and the
      // count would stop being comparable.
      // Ticks are stopped above for the same reason: they would keep the stream
      // from ever settling.
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

      report.runs.push(
        summarize(
          await readPerfSample(page),
          loadSample,
          { load: commitsAfterLoad, interaction: commitsTotal - commitsAfterLoad },
          ticksAtStart && ticksAtStop && ticksDrained
            ? tickMetrics(condition.tickHz, ticksAtStart, ticksAtStop, ticksDrained)
            : null
        )
      );

      // Written every repetition: a later failure then still leaves the completed
      // runs on disk instead of discarding the whole session.
      writeReport();
    }
  }

  function writeReport(): void {
    const report = {
      scenario: 'feed-interaction',
      conditions: {
        name: SCENARIO,
        feedSeed: DEFAULT_FEED_SEED,
        cpuThrottleRate: CPU_THROTTLE,
        repeat: REPEAT,
        /** Discarded loads before measuring each condition — JIT/cache warm-up. */
        warmupRuns: 1,
        likeTapsPerRun: LIKE_TAPS,
        tapOffset: TAP_OFFSET,
        tickRatio: DEFAULT_TICK_RATIO,
        buildMode: 'production',
        remoteImages: 'blocked'
      },
      limits: {
        eventDurationThresholdMs: EVENT_DURATION_THRESHOLD,
        attemptedInteractionsPerRun: LIKE_TAPS,
        minInteractionSample: MIN_INTERACTION_SAMPLE,
        note: 'event timing is quantized to 8ms and hides durations under the threshold, so interaction.count is the observed subset of attemptedInteractionsPerRun — not the number of taps. p75 is null when count is under minInteractionSample. Compare relatively within one runner, never as absolute values across machines.'
      },
      groups: reports
    };

    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  }
});
