/**
 * Counters for the perf harness, exposed on one window namespace in tick mode only.
 * Every update is an O(1) increment or a `performance.now()` pair, so the observer
 * adds no work proportional to the feed it is measuring.
 */
export interface TickEngineStats {
  /** Tick callbacks that ran — the server side applied them to the feed. */
  ticks: number;
  /** Cache writes made by ingestion; each one notifies the feed's observers. */
  commits: number;
  /** Commits that carried more than one tick (frame coalescing or yield backlog). */
  mergedCommits: number;
  /** Yielding commits redone on the latest cache because it changed during the yields. */
  rebases: number;
  /** Server side: ticks applied to the MSW feed. */
  feedMs: number;
  /** Client side: main-thread time spent in ingestion, summed across yielded slices. */
  ingestMs: number;
  /**
   * Ticks received but not yet committed (buffered, or mid-drain across yields).
   * 0 means ingestion is idle — the harness waits for it before reading costs, so a
   * tick counted as delivered also has its ingestion cost and commit counted.
   */
  pending: number;
}

/**
 * Measurement handle. `stop` exists for the perf harness: its end condition waits
 * for the React commit stream to go quiet, which never happens while ticks commit.
 */
export type TickEngineWindow = Window & {
  __tickEngine?: { stats: TickEngineStats; stop: () => void };
};

export function createTickEngineStats(): TickEngineStats {
  return {
    ticks: 0,
    commits: 0,
    mergedCommits: 0,
    rebases: 0,
    feedMs: 0,
    ingestMs: 0,
    pending: 0
  };
}

/** Records one commit that carried `ticks` ticks. */
export function countCommit(stats: TickEngineStats, ticks: number): void {
  stats.commits += 1;
  if (ticks > 1) stats.mergedCommits += 1;
  stats.pending -= ticks;
}

/** Ticks settled without a commit — there was no feed cache to write to yet. */
export function countSkipped(stats: TickEngineStats, ticks: number): void {
  stats.pending -= ticks;
}
