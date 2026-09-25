import { getQueryClient } from '@configs/get-query-client';

import {
  likeDelta,
  mapPost,
  TOGGLE_LIKE_KEY
} from '../../../app/_components/sns/SnsCard/useToggleLike';
import { FEED_QUERY_KEY } from '../../../app/_components/sns/useInfiniteFeed';
import { DEFAULT_FEED_SEED } from '../data/generateFeed';
import { getFeed } from '../handlers';
import { countCommit, countSkipped, createTickEngineStats } from './instrumentation';
import { createLocalTickSource, DEFAULT_TICK_RATIO } from './tickSource';

import type { TickEngineStats, TickEngineWindow } from './instrumentation';
import type { Tick } from './tickSource';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedPage, SnsCardData } from '@type/sns';

/** Upper bound so a stray `?tick=1e6` cannot spin the timer. */
const MAX_TICK_HZ = 120;

/**
 * Reads the `?tick=Hz` stress rate, clamped to {@link MAX_TICK_HZ}. `null` for an
 * absent, malformed, or non-positive value — the default URL never ticks.
 */
export function parseTickHz(search: string): number | null {
  const raw = new URLSearchParams(search).get('tick');
  if (raw === null) return null;

  const hz = Number(raw);
  if (!Number.isFinite(hz) || hz <= 0) return null;

  return Math.min(hz, MAX_TICK_HZ);
}

/**
 * Server side of a tick: the counts land in the feed the MSW handlers serve, so a
 * later page fetch or like response already carries them. Returns the posts it
 * changed; ids no longer in the feed are skipped.
 */
export function applyTickToFeed(tick: Tick): SnsCardData[] {
  const byId = new Map(getFeed().map((post) => [post.id, post]));
  const changed: SnsCardData[] = [];

  for (const { id, views, likes } of tick) {
    const post = byId.get(id);
    if (!post) continue;
    post.stats = {
      ...post.stats,
      views: post.stats.views + views,
      likes: post.stats.likes + likes
    };
    changed.push(post);
  }
  return changed;
}

/**
 * A cached post after taking the server's counts. `liked` stays the user's intent,
 * and a like the server has not applied yet keeps its ±1 on top of the server's
 * count — otherwise every tick would erase an in-flight optimistic toggle.
 */
const withServerStats = (post: SnsCardData, server: SnsCardData): SnsCardData => ({
  ...post,
  stats: { ...server.stats, likes: server.stats.likes + likeDelta(post.liked, server.liked) }
});

/**
 * Client side: derive the cache from the server's counts. Baseline on purpose —
 * one commit per tick, each changed post mapped through the whole feed
 * (`mapPost` is O(all posts)), so a tick costs O(changed × posts).
 */
export function ingestTick(client: QueryClient, changed: readonly SnsCardData[]): void {
  client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
    changed.reduce<InfiniteData<FeedPage> | undefined>(
      (data, server) => mapPost(data, server.id, (post) => withServerStats(post, server)),
      old
    )
  );
}

/**
 * `?sched` ingestion mode — two orthogonal axes, so each one's contribution can be
 * measured alone: commit unit (every tick: off·yield / once per frame: raf·both)
 * and slicing (none: off·raf / yield between slices: yield·both).
 */
export type SchedMode = 'off' | 'yield' | 'raf' | 'both';

const SCHED_MODES: readonly SchedMode[] = ['off', 'yield', 'raf', 'both'];

/** Unknown or absent `?sched` falls back to `off`, the baseline. */
export function parseSched(search: string): SchedMode {
  const raw = new URLSearchParams(search).get('sched');
  return SCHED_MODES.find((mode) => mode === raw) ?? 'off';
}

/** Main-thread slice before yielding — the same 5ms budget React's scheduler uses. */
const SLICE_MS = 5;

/**
 * `scheduler.yield()` where the browser has it. Elsewhere the work continues
 * without yielding — no polyfill (ADR-003), so there the slicing is a no-op.
 */
export function yieldToMain(): Promise<void> {
  return typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function'
    ? scheduler.yield()
    : Promise.resolve();
}

/** Runs `step(0..count-1)`, yielding whenever a slice passes {@link SLICE_MS}. */
async function runSliced(
  count: number,
  step: (index: number) => void,
  stats: TickEngineStats
): Promise<void> {
  let sliceStart = performance.now();
  for (let index = 0; index < count; index += 1) {
    step(index);
    if (performance.now() - sliceStart > SLICE_MS) {
      stats.ingestMs += performance.now() - sliceStart;
      await yieldToMain();
      sliceStart = performance.now();
    }
  }
  stats.ingestMs += performance.now() - sliceStart;
}

/** One pass over the feed: every changed post takes the server's counts. O(posts + changed). */
function mergeStats(
  data: InfiniteData<FeedPage> | undefined,
  changed: ReadonlyMap<string, SnsCardData>
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => {
        const server = changed.get(post.id);
        return server ? withServerStats(post, server) : post;
      })
    }))
  };
}

/**
 * Commits work computed across yields. Anything may have written the cache
 * meanwhile (an optimistic like, a page fetch), so the result is committed only if
 * the cache is still the snapshot it was built from; otherwise the same changes
 * are merged onto the latest cache instead of overwriting it.
 */
export function commitRebased(
  client: QueryClient,
  snapshot: InfiniteData<FeedPage>,
  next: InfiniteData<FeedPage>,
  changed: ReadonlyMap<string, SnsCardData>,
  stats: TickEngineStats
): void {
  if (client.getQueryData(FEED_QUERY_KEY) === snapshot) {
    client.setQueryData(FEED_QUERY_KEY, next);
    return;
  }
  stats.rebases += 1;
  client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (latest) =>
    mergeStats(latest, changed)
  );
}

type Ingest = (changed: readonly SnsCardData[]) => void;

/**
 * The only place `?sched` branches. Every mode except `off` buffers changed posts
 * by id, so a backlog (a busy main thread, a background tab whose frames stopped)
 * stays bounded by the hot set and costs one commit when it drains — and a commit
 * always copies the server's latest counts, so merging ticks loses nothing.
 */
export function createIngestor(
  mode: SchedMode,
  client: QueryClient,
  stats: TickEngineStats
): Ingest {
  const read = () => client.getQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY);

  let buffer = new Map<string, SnsCardData>();
  let buffered = 0;
  const add = (changed: readonly SnsCardData[]) => {
    changed.forEach((post) => buffer.set(post.id, post));
    buffered += 1;
    stats.pending += 1;
  };
  const take = () => {
    const taken = { changed: buffer, ticks: buffered };
    buffer = new Map();
    buffered = 0;
    return taken;
  };

  if (mode === 'off') {
    return (changed) => {
      stats.pending += 1;
      if (!read()) return countSkipped(stats, 1);
      const start = performance.now();
      ingestTick(client, changed);
      stats.ingestMs += performance.now() - start;
      countCommit(stats, 1);
    };
  }

  if (mode === 'raf') {
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      const { changed, ticks } = take();
      if (!read()) return countSkipped(stats, ticks);
      const start = performance.now();
      client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
        mergeStats(old, changed)
      );
      stats.ingestMs += performance.now() - start;
      countCommit(stats, ticks);
    };
    return (changed) => {
      add(changed);
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(flush);
    };
  }

  // yield: the baseline's per-post `mapPost` loop, sliced, one commit per tick.
  // both: the frame's merge pass, sliced. Either way one drain runs at a time;
  // ticks that land meanwhile wait in the buffer for the next drain.
  let draining = false;
  const drain = async () => {
    draining = true;
    while (buffered > 0) {
      const { changed, ticks } = take();
      const snapshot = read();
      if (!snapshot) {
        countSkipped(stats, ticks);
        continue;
      }

      let next: InfiniteData<FeedPage>;
      if (mode === 'yield') {
        const posts = [...changed.values()];
        let data: InfiniteData<FeedPage> | undefined = snapshot;
        await runSliced(
          posts.length,
          (index) => {
            const server = posts[index];
            data = mapPost(data, server.id, (post) => withServerStats(post, server));
          },
          stats
        );
        next = data ?? snapshot;
      } else {
        const pages: FeedPage[] = [];
        for (const page of snapshot.pages) {
          const posts: SnsCardData[] = [];
          await runSliced(
            page.posts.length,
            (index) => {
              const post = page.posts[index];
              const server = changed.get(post.id);
              posts.push(server ? withServerStats(post, server) : post);
            },
            stats
          );
          pages.push({ ...page, posts });
        }
        next = { ...snapshot, pages };
      }

      commitRebased(client, snapshot, next, changed, stats);
      countCommit(stats, ticks);
    }
    draining = false;
  };

  if (mode === 'yield') {
    return (changed) => {
      add(changed);
      if (!draining) void drain();
    };
  }

  let scheduled = false;
  const onFrame = () => {
    scheduled = false;
    if (!draining) void drain();
  };
  return (changed) => {
    add(changed);
    if (scheduled || draining) return;
    scheduled = true;
    requestAnimationFrame(onFrame);
  };
}

/**
 * Re-derives the cache from the server after a feed fetch resolves. The fetch
 * rebuilds pages from the cache as it was when it started, so ticks committed
 * during it would roll back on the older pages — and a response that raced a
 * like toggle can carry a `liked` the server has since changed. Posts with a
 * toggle still pending keep the user's intent (and its ±1); every other post
 * takes the server's `liked` and counts outright.
 */
export function resyncFromServer(client: QueryClient): void {
  const pending = new Set(
    client
      .getMutationCache()
      .findAll({ mutationKey: [TOGGLE_LIKE_KEY], status: 'pending' })
      .map((mutation) => mutation.options.mutationKey?.[1])
  );
  const byId = new Map(getFeed().map((post) => [post.id, post]));
  client.setQueryData<InfiniteData<FeedPage>>(FEED_QUERY_KEY, (old) =>
    mergeStats(
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) => {
                const server = byId.get(post.id);
                return server && !pending.has(post.id) ? { ...post, liked: server.liked } : post;
              })
            }))
          }
        : old,
      byId
    )
  );
}

/** Starts ticking the current feed when the URL asks for it. Call after the MSW worker is up. */
export function startTickEngine(search: string): void {
  const hz = parseTickHz(search);
  if (hz === null) return;

  const client = getQueryClient();
  const stats = createTickEngineStats();
  const ingest = createIngestor(parseSched(search), client, stats);
  const source = createLocalTickSource({
    hz,
    ids: getFeed().map((post) => post.id),
    ratio: DEFAULT_TICK_RATIO,
    seed: DEFAULT_FEED_SEED
  });

  source.subscribe((tick) => {
    const start = performance.now();
    const changed = applyTickToFeed(tick);
    stats.feedMs += performance.now() - start;
    stats.ticks += 1;
    ingest(changed);
  });
  source.start();

  // Only a real fetch resolving — `setQueryData` also emits `success`, marked manual.
  client.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      !event.action.manual &&
      event.query.queryKey[0] === FEED_QUERY_KEY[0]
    ) {
      resyncFromServer(client);
    }
  });

  (window as TickEngineWindow).__tickEngine = { stats, stop: () => source.stop() };
}
