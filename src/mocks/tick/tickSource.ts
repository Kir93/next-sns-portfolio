import { mulberry32 } from '../data/generateFeed';

/** One post's change in one tick — counts other users produced since the last tick. */
export interface TickDelta {
  id: string;
  views: number;
  likes: number;
}

export type Tick = readonly TickDelta[];

/** Share of the feed updated on every tick — also recorded in the perf report conditions. */
export const DEFAULT_TICK_RATIO = 0.3;

/**
 * Where ticks come from. Ingestion only depends on this boundary, so a later
 * multi-tab slice can swap the in-page timer for a shared-worker source without
 * touching how ticks reach the feed and the cache.
 */
export interface TickSource {
  subscribe(listener: (tick: Tick) => void): () => void;
  start(): void;
  stop(): void;
}

export interface LocalTickSourceOptions {
  /** Nominal ticks per second. Under CPU pressure fewer are delivered — measure, never assume. */
  hz: number;
  /** Post ids eligible for updates. */
  ids: readonly string[];
  /** Share of `ids` that receives an update on every tick (the hot set), 0..1. */
  ratio: number;
  seed: number;
}

/**
 * In-page timer source. The hot set and every delta derive from the seed, so the
 * same seed produces the same tick sequence — only the delivery timing varies.
 */
export function createLocalTickSource({
  hz,
  ids,
  ratio,
  seed
}: LocalTickSourceOptions): TickSource {
  const rand = mulberry32(seed);
  const hot = ids.filter(() => rand() < ratio);
  const listeners = new Set<(tick: Tick) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    const tick = hot.map((id) => ({
      id,
      views: 1 + Math.floor(rand() * 3),
      likes: rand() < 0.1 ? 1 : 0
    }));
    listeners.forEach((listener) => listener(tick));
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (timer === null) timer = setInterval(emit, 1000 / hz);
    },
    stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
    }
  };
}
