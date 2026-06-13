# ADR-001 · RSC ↔ Client rendering & data boundary

- **Status**: Accepted (2026-06)
- **Slices affected**: feed-core, infinite-scroll, post-compose, perf-a11y

## Context

The feed needs a clear rendering/data boundary: should the initial page be server-rendered (RSC) or fetched entirely on the client? This shapes data flow, optimistic updates, and cache coherence across multiple slices.

Key constraint: the data source is **MSW (Mock Service Worker)**. The MSW browser worker only intercepts **client-side** fetches. Fetching from a Server Component bypasses the worker, so mocking would require wiring `msw/node` into the RSC runtime. Leaving the boundary undecided would let each slice diverge and destabilize optimistic-update and infinite-query cache coherence.

## Decision

**Data-fetching components stay on the client.** `layout.tsx` / `page.tsx` remain RSC (static shell + metadata), while `FeedContainer` (`useInfiniteQuery`) and `PostComposer` (mutation) are Client Components driven by TanStack Query + the MSW browser worker. No RSC prefetch/dehydration.

## Consequences

- **+** Single data path — dev and test both mock through the same `handlers.ts`; optimistic updates and the infinite-query cache live in one place (client).
- **+** The shell and metadata are still server-rendered.
- **−** The feed body is not server-rendered, so initial LCP/SEO are weaker than SSR. Acceptable for a mock portfolio (not search-indexed).
- **Lock-in** Client fetching until a real backend replaces MSW. A real API would justify revisiting this with RSC prefetch + `HydrationBoundary` (supersede candidate at that point).

Quantitative LCP/Web-Vitals comparison (RSC vs client) is to be measured via Lighthouse-CI; see [perf measurements](../perf/baseline.md).

## Alternatives Considered

- **RSC initial page + client hydration** — better LCP/SEO, but MSW can't mock server fetches without `msw/node` wiring; little gain in a mock environment. Rejected.
- **Full SSR/streaming** — no real backend (MSW), so moot. Rejected.
