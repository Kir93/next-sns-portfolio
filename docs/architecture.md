# Architecture

An X-style mobile SNS feed built to demonstrate a production-standard Next.js stack, measurement-driven performance work, and documented decisions.

## Stack

| Layer     | Choice                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router) + React 19 + React Compiler                                                |
| Styling   | Tailwind CSS v4 + Base UI (headless) + shadcn pattern (CVA / clsx / tailwind-merge) + lucide-react |
| Data      | TanStack Query (server state) + MSW (mock API)                                                     |
| State     | Zustand (client state, as needed)                                                                  |
| Forms     | React Hook Form + Zod                                                                              |
| Testing   | Vitest + Testing Library (unit), Playwright (E2E), GitHub Actions (CI)                             |

All dependency versions are pinned (no floating ranges) for reproducibility.

## Delivery strategy — vertical slices

Instead of a waterfall of horizontal phases, the app was built as independent **vertical slices**, each shipped as its own reviewed PR:

0. **stack-migration** — Chakra → Tailwind v4 + Base UI; React Compiler; version pinning.
1. **feed-core** — `SnsCard` + conditional `ImageGrid` (0/1/2/3/4+ images), MSW `GET /api/posts`, TanStack Query feed.
2. **post-compose** — RHF + Zod compose form, `POST /api/posts`, optimistic update with rollback.
3. **infinite-scroll** — cursor pagination, `useInfiniteQuery`, IntersectionObserver.
4. **quality-testing** — Vitest unit tests, Playwright E2E, GitHub Actions CI.
5. **perf-a11y** — accessibility pass, `content-visibility` virtualization, measurement + ADRs.
6. **documentation** — public docs promotion + README.

## Key decisions (ADRs)

- [ADR-001 — RSC ↔ Client rendering & data boundary](decisions/ADR-001-rendering-data-boundary.md): the feed stays client-fetched because MSW only mocks client-side requests.
- [ADR-002 — Feed virtualization](decisions/ADR-002-feed-virtualization.md): CSS `content-visibility` over a windowing library, to fit variable-height cards and the infinite-scroll sentinel.

## Directory layout (App Router co-location)

- `app/_components/sns/**` — route-specific feed components (`SnsCard`, `FeedContainer`, `PostComposer`).
- `src/components/common/**` — cross-route primitives (`Avatar`, `Icon`).
- `src/{lib,api,types,mocks,provider,utils,config}/**` — shared infrastructure.

## Data & mocking

A single `src/mocks/handlers.ts` is shared by the browser worker (dev, `src/mocks/browser.ts`) and the Node server (test, `src/mocks/server.ts`), so dev and tests mock identically.

## Performance

Measurement methodology and before/after results live in [docs/perf](perf/baseline.md).
