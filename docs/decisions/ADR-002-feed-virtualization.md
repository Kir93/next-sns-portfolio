# ADR-002 · Infinite-feed virtualization strategy

- **Status**: Accepted (2026-06)
- **Slices affected**: infinite-scroll, perf-a11y

## Context

Infinite scroll accumulates posts, so off-screen DOM render cost degrades scrolling once hundreds pile up. The central trade-off is **variable-height cards**: `SnsCard` height varies widely with image count (0–4), so fixed-height windowing mis-estimates heights and causes scroll jumps. The infinite-scroll sentinel must also remain present at the bottom of the DOM, which conflicts with windowing that removes nodes.

## Decision

Apply **CSS `content-visibility: auto` + `contain-intrinsic-size: auto 420px`** to each feed card (`<li>`). The browser skips layout/paint for off-screen cards while keeping the DOM nodes intact. No library.

## Consequences

- **+** Zero library / bundle cost; no conflict with React 19 / React Compiler / the infinite query.
- **+** Handles variable height natively — the `auto` keyword remembers the last rendered size, reducing estimate error.
- **+** DOM nodes persist, so the sentinel observer, scroll anchoring, and the accessibility tree keep working (consistent with the infinite-scroll slice).
- **−** Not true windowing — nodes remain, so extreme accumulation (tens of thousands) still carries DOM-node memory cost. Sufficient for this portfolio's scale (hundreds).
- **−** `contain-intrinsic-size` is an estimate, so the scrollbar position over un-rendered regions is approximate (negligible in practice).
- **Revisit** If measured performance is insufficient at scale, escalate to `virtua` (windowing with dynamic-height support) — supersede candidate.

Before/after numbers (Lighthouse, Profiler re-renders, long-list scroll INP) are to be measured; see [perf measurements](../perf/after.md).

## Alternatives Considered

- **react-window** — mature but fixed-height oriented; variable height needs `VariableSizeList` + manual measurement and removes nodes (breaks the sentinel / scroll anchor). Rejected.
- **virtua** — handles dynamic-height windowing well, but the library cost and true windowing are overkill at the current scale. Deferred (revisit at extreme scale).
- **No virtualization** — scroll jank as the list grows. Rejected.
