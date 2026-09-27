# Architecture

An X-style mobile SNS feed built to demonstrate a production-standard Next.js stack, measurement-driven performance work, and documented decisions.

## Stack

| Layer     | Choice                                                                 |
| --------- | ---------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router) + React 19 + React Compiler                    |
| Styling   | Tailwind CSS v4 + clsx + tailwind-merge + lucide-react                 |
| Data      | TanStack Query (server state) + MSW (mock API)                         |
| State     | React local state (no dedicated store)                                 |
| Forms     | React Hook Form + Zod                                                  |
| Testing   | Vitest + Testing Library (unit), Playwright (E2E), GitHub Actions (CI) |

All dependency versions are pinned (no floating ranges) for reproducibility.

## Delivery strategy — vertical slices

Instead of a waterfall of horizontal phases, the app was built as independent **vertical slices**, each shipped and reviewed as its own unit (slices 0–7 as PRs, 8–10 as commits on `main`):

0. **stack-migration** — Chakra → Tailwind v4 + Base UI; React Compiler; version pinning.
1. **feed-core** — `SnsCard` + conditional `ImageGrid` (0/1/2/3/4+ images), MSW `GET /api/posts`, TanStack Query feed.
2. **post-compose** — RHF + Zod compose form, `POST /api/posts`, optimistic update with rollback.
3. **infinite-scroll** — cursor pagination, `useInfiniteQuery`, IntersectionObserver.
4. **quality-testing** — Vitest unit tests, Playwright E2E, GitHub Actions CI.
5. **perf-a11y** — accessibility pass, `content-visibility` virtualization, measurement + ADRs.
6. **documentation** — public docs promotion + README.
7. **feed-hygiene-async-boundary** — phantom-dependency purge (ADR-003); async responsibility moved to a Suspense + self-implemented ErrorBoundary boundary (ADR-004); `Intl.RelativeTimeFormat` relative time; like-button optimistic toggle.
8. **narrative-debt-zero** — public-narrative cleanup: ADR-003/004 promoted to `docs/decisions`, README and architecture made current, stale docs removed.
9. **reproducible-perf-harness** — seeded `?feedSize` feed generator, production-build Playwright perf project under CDP CPU throttle, `pnpm perf` + [methodology](perf/methodology.md).
10. **high-frequency-tick-inp** — `?tick` engine that mutates the MSW feed (single source of truth), `?sched` ingestion modes (per-tick vs rAF-merged commits × `scheduler.yield` slicing), like-toggle reconciliation under ticks, reports [00–02](perf/high-frequency/00-baseline.md) (ADR-005).

## Key decisions (ADRs)

- [ADR-001 — RSC ↔ Client rendering & data boundary](decisions/ADR-001-rendering-data-boundary.md): the feed stays client-fetched because MSW only mocks client-side requests.
- [ADR-002 — Feed virtualization](decisions/ADR-002-feed-virtualization.md): CSS `content-visibility` over a windowing library, to fit variable-height cards and the infinite-scroll sentinel.
- [ADR-003 — Dependency weight as a quality metric](decisions/ADR-003-dependency-weight-quality-metric.md): remove phantom dependencies; a dependency must prove its weight (real import, cost proportional to the work).
- [ADR-004 — Async responsibility as a boundary](decisions/ADR-004-async-responsibility-boundary.md): move loading/error/retry into a Suspense + ErrorBoundary boundary so the feed body assumes data always exists.
- [ADR-005 — High-frequency ingestion boundary](decisions/ADR-005-high-frequency-ingestion-boundary.md): server-pushed counter updates pass one ingestion boundary that owns commit granularity, `scheduler.yield` slicing, and field-level merge with optimistic likes; the global `notifyManager` scheduler stays untouched. This is the fifth and last ADR — later changes supersede an existing one.

## Directory layout (App Router co-location)

- `app/_components/sns/**` — route-specific feed components (`SnsCard`, `FeedContainer`, `PostComposer`).
- `src/components/common/**` — cross-route primitives (`Avatar`, `Icon`).
- `src/{lib,api,types,mocks,provider,utils,config}/**` — shared infrastructure.

## Data & mocking

A single `src/mocks/handlers.ts` is shared by the browser worker (dev + deployed demo, `src/mocks/browser.ts`) and the Node server (test, `src/mocks/server.ts`), so every environment mocks identically.

## Performance

Measurement methodology lives in [perf/methodology.md](perf/methodology.md). Results: [baseline](perf/baseline.md) and [after](perf/after.md) (content-visibility), and the high-frequency reports [00–02](perf/high-frequency/00-baseline.md).
