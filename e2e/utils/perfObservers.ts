import type { Page } from '@playwright/test';

/**
 * Shared instrumentation for the perf project: interaction latency (INP-aligned,
 * never claimed as INP itself) and long tasks, measured on a production build with
 * CPU throttling applied over CDP.
 *
 * Generalizes the `layout-shift` PerformanceObserver injection already used by
 * `e2e/feed-async-boundary.spec.ts` to the `event` + `longtask` entry types.
 */

/**
 * Spec minimum for `PerformanceObserver('event')`. Durations are also quantized to
 * 8ms, so values below ~16ms are invisible and every number carries that floor —
 * recorded in the sample meta and in `docs/perf/methodology.md`.
 */
export const EVENT_DURATION_THRESHOLD = 16;

export interface PerfSample {
  /** Per-interaction duration in ms — the max duration seen for each `interactionId`. */
  interactions: number[];
  /** Duration in ms of every `longtask` entry. */
  longTasks: number[];
}

/**
 * Below this many observed interactions a percentile says more about the sample
 * than about the app, so `p75` is reported as `null` rather than as a number that
 * reads like a measurement.
 */
export const MIN_INTERACTION_SAMPLE = 4;

export interface CommitCounts {
  /** Commits up to the moment the feed first painted. */
  load: number;
  /** Commits caused by the scripted interactions after that. */
  interaction: number;
}

export interface LongTaskStats {
  count: number;
  total: number;
  max: number | null;
}

/** `null` marks "no data", never "measured as zero" — see {@link MIN_INTERACTION_SAMPLE}. */
export interface PerfMetrics {
  interaction: { count: number; p75: number | null; max: number | null };
  /** Long tasks during the scripted scroll/tap only. */
  longTask: LongTaskStats;
  /** Long tasks up to first paint — feed generation and initial render. */
  loadLongTask: LongTaskStats;
  commits: CommitCounts;
}

/** `durationThreshold` is `event`-only and absent from the base DOM typing. */
type EventObserverInit = PerformanceObserverInit & { durationThreshold: number };

/** `interactionId` groups the pointer/click entries of one user interaction. */
type EventTimingEntry = PerformanceEntry & { interactionId?: number };

type PerfWindow = Window & { __perf?: PerfSample; __perfReset?: () => void };

/**
 * Installs the observers for every subsequent navigation. Call once per page,
 * before the first `goto` — each navigation re-runs the script, so a repeated
 * measurement starts from an empty sample.
 */
export async function installPerfObservers(page: Page): Promise<void> {
  await page.addInitScript((threshold: number) => {
    const w = window as PerfWindow;
    const sample: PerfSample = { interactions: [], longTasks: [] };
    w.__perf = sample;

    // One interaction fires several event entries (pointerdown/pointerup/click);
    // its latency is the longest of them, which is how INP itself is derived.
    const byInteraction = new Map<number, number>();

    // Clearing the map too is what makes the reset real: the event observer
    // rebuilds `interactions` from it on every callback, so emptying the array
    // alone would be undone by the next entry.
    w.__perfReset = () => {
      byInteraction.clear();
      sample.interactions = [];
      sample.longTasks = [];
    };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const id = (entry as EventTimingEntry).interactionId;
        if (!id) continue;
        byInteraction.set(id, Math.max(byInteraction.get(id) ?? 0, entry.duration));
      }
      sample.interactions = [...byInteraction.values()];
    }).observe({
      type: 'event',
      durationThreshold: threshold,
      buffered: true
    } as EventObserverInit);

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        sample.longTasks.push(entry.duration);
      }
    }).observe({ type: 'longtask', buffered: true });
  }, EVENT_DURATION_THRESHOLD);
}

/**
 * Drops everything collected so far. Called at the load→interaction boundary so
 * feed generation and initial render do not land in the interaction numbers —
 * without it the reported long tasks are a mix of both phases.
 */
export async function resetPerfSample(page: Page): Promise<void> {
  await page.evaluate(() => (window as PerfWindow).__perfReset?.());
}

/**
 * Applies CDP CPU throttling. Playwright's Pixel 5 device only emulates viewport
 * and UA, so without this a desktop runner never reproduces the mobile load.
 */
export async function throttleCpu(page: Page, rate: number): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate });
}

/**
 * Opens one CDP session and returns a reader for the cumulative renderer counters
 * (`LayoutDuration`, `RecalcStyleDuration`, … in seconds). Reading twice and
 * subtracting isolates the work done in between — the technique
 * `docs/perf/after.md` used for its content-visibility experiment.
 *
 * The session is created once on purpose: re-enabling the Performance domain on a
 * fresh session restarts the counters, which silently yields a zero delta.
 */
export async function createRendererCounterReader(
  page: Page
): Promise<() => Promise<Record<string, number>>> {
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');

  return async () => {
    const { metrics } = await session.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
  };
}

/**
 * Blocks the picsum image CDN so the measurement isolates rendering cost from
 * network variance — the same isolation `docs/perf/after.md` applied manually.
 */
export async function blockRemoteImages(page: Page): Promise<void> {
  await page.route('**picsum.photos/**', (route) => route.abort());
}

/**
 * Rewrites the feed request's `limit` so a 500-post feed lands in the query cache
 * in one page instead of 84 scroll-driven fetches. Only the request URL changes —
 * the handler's existing `limit` support does the rest, and app code stays untouched.
 *
 * Throws when the rewrite cannot be applied: a silently un-boosted run would still
 * finish green while measuring a 6-post page, which is a different scenario.
 */
export async function boostFeedPageLimit(page: Page, limit: number): Promise<void> {
  await page.addInitScript((size: number) => {
    const originalFetch = window.fetch;
    window.fetch = (input, init) => {
      if (typeof input !== 'string' || !input.startsWith('/api/posts?')) {
        return originalFetch(input, init);
      }
      if (!/limit=\d+/.test(input)) {
        throw new Error(`perf harness: no limit parameter to rewrite in ${input}`);
      }
      return originalFetch(input.replace(/limit=\d+/, `limit=${size}`), init);
    };
  }, limit);
}

type CommitWindow = Window & { __commits?: number };

/**
 * Counts React commits by registering a minimal DevTools global hook before the
 * renderer loads — the same channel React DevTools uses. Verified on a plain
 * production build: `next build --profile` is not required, and no `<Profiler>`
 * wrapper leaks into app code. Re-runs on every navigation, so the counter starts
 * at 0 for each measured run.
 */
export async function installCommitCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as CommitWindow & { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown };
    w.__commits = 0;
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
      supportsFiber: true,
      inject: () => 1,
      onCommitFiberRoot: () => {
        w.__commits = (w.__commits ?? 0) + 1;
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
      setStrictMode: () => {}
    };
  });
}

export async function readCommitCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as CommitWindow).__commits ?? 0);
}

export async function readPerfSample(page: Page): Promise<PerfSample> {
  return page.evaluate(() => (window as PerfWindow).__perf ?? { interactions: [], longTasks: [] });
}

/** Nearest-rank p75 — with the small sample counts here, interpolation would overstate precision. */
function p75(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)];
}

function longTaskStats(durations: number[]): LongTaskStats {
  return {
    count: durations.length,
    total: round(durations.reduce((sum, duration) => sum + duration, 0)),
    max: durations.length > 0 ? round(Math.max(...durations)) : null
  };
}

export function summarize(
  sample: PerfSample,
  loadSample: PerfSample,
  commits: CommitCounts
): PerfMetrics {
  const { interactions, longTasks } = sample;
  return {
    commits,
    interaction: {
      count: interactions.length,
      p75: interactions.length >= MIN_INTERACTION_SAMPLE ? round(p75(interactions)) : null,
      max: interactions.length > 0 ? round(Math.max(...interactions)) : null
    },
    longTask: longTaskStats(longTasks),
    loadLongTask: longTaskStats(loadSample.longTasks)
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
