---
id: ADR-004
title: 비동기 책임을 경계로
status: accepted
date: 2026-06-28
supersedes: null
superseded_by: null
---

## 1. Context

`FeedContainer`는 비동기 상태를 본문에서 **명령형 분기**로 다뤘다: `const { data, isPending, isError } = useInfiniteFeed()` 후 `if (isPending) …; if (isError) …;`. 이 패턴은 (a) 데이터 존재 여부를 모든 소비 지점에서 재확인하게 하고(`data?.pages`), (b) 로딩/에러/성공 책임을 한 컴포넌트에 뭉치며, (c) 토스류 선언적 UI 정체성과 어긋난다.

향후 고빈도 성능 슬라이스(scheduler.yield, notifyManager rAF 등)는 이 피드 위에 쌓인다. 그 전에 비동기 책임을 **경계(Suspense + ErrorBoundary)**로 끌어올려, 본문은 "데이터가 항상 있다"는 단일 가정만 갖게 한다.

제약: content-visibility 가상화 자산([ADR-002](ADR-002-feed-virtualization.md))을 훼손하지 않을 것, 새 런타임 의존성 추가 금지([ADR-003](ADR-003-dependency-weight-quality-metric.md)).

## 2. Decision

**비동기 책임을 선언적 경계로 이관한다.**

1. `useInfiniteQuery` → `useSuspenseInfiniteQuery`. 본문에서 `data`는 항상 존재, `isPending`/`isError` 제거.
2. `FeedContainer` = `QueryErrorResetBoundary` → 자체 `ErrorBoundary`(reset 연동) → `<Suspense fallback={<FeedSkeleton/>}>` → `FeedList`(실제 본문). 로딩=Suspense, 에러=ErrorBoundary, 재시도=`reset`.
3. **ErrorBoundary는 자체 구현**(클래스 컴포넌트, `getDerivedStateFromError` + `componentDidCatch`). `react-error-boundary`·`@suspensive/react` 미도입 — ADR-003 "의존성 무게" 정책 준수(의존성 정리 슬라이스에서 새 런타임 의존성 추가는 역설).
4. **FeedSkeleton 높이를 `contain-intrinsic-size: auto 420px`(ADR-002)와 정합**시켜 fallback↔콘텐츠 전환의 스크롤 점프(CLS)를 차단. 측정이 이 작업의 완료 게이트.

## 3. Consequences

### Before / After (측정값)

| 항목 | Before | After |
| ---- | ------ | ----- |
| 본문 `isPending`/`isError` 분기 | 2 (`FeedContainer`) | **0** (경계로 이관) |
| `useInfiniteQuery` 잔존 | 1 | 0 (`useSuspenseInfiniteQuery`) |
| 로딩 UI | 중앙 텍스트 "불러오는 중…" → 콘텐츠 치환 | 카드형 스켈레톤(높이 정합) → 콘텐츠 |
| 에러 UI | 중앙 텍스트(재시도 불가) | role=alert + **다시 시도** 버튼(reset) |
| CLS(초기 로드~무한스크롤) | 미측정(e2e 없음) | **< 0.1** (Web Vitals "good", e2e 게이트) |
| 새 런타임 의존성 | — | **0** (자체 ErrorBoundary) |

- (+) 본문은 "데이터 항상 존재" 단일 가정 — 고빈도 성능 슬라이스가 이 경계 위에 안전하게 쌓인다.
- (+) 로딩/에러/재시도 책임 분리, role=status/alert로 접근성 명시. 재시도 = `QueryErrorResetBoundary` reset + ErrorBoundary 상태 초기화 연동.
- (+) content-visibility(ADR-002)·sentinel 무한스크롤·게시/좋아요 낙관 업데이트(`setQueryData`) 모두 보존 — Suspense는 background refetch에서 재suspend하지 않아 낙관 prepend가 스켈레톤을 깜빡이지 않는다.
- (−) 자체 ErrorBoundary 유지 비용(클래스 컴포넌트 1개) — 경계 로직이 복잡해지면 그때 라이브러리 도입을 ADR로 재검토.
- (검증) `FeedContainer.test.tsx`(에러→다시 시도→복구), `e2e/feed-async-boundary.spec.ts`(CLS < 0.1 + 무한스크롤). jsdom IntersectionObserver stub은 `vitest.setup.ts`에 추가.

## 4. Alternatives Considered

- **`react-error-boundary` 도입**: 성숙·간결하나 새 런타임 의존성 → ADR-003 역행 → 기각(경계 복잡도 상승 시 재검토).
- **`@suspensive/react`**: Suspense/ErrorBoundary 추상화를 잘 제공하나 동일하게 의존성 비용 → 보류.
- **명령형 분기 유지**: 변경 0이나 선언적 정체성 미달 + 본문 분기 잔존 + 재시도 UX 부재 → 기각.
- **단일 Suspense로 전체 래핑**: 가능하나 에러 reset 연동(`QueryErrorResetBoundary`)이 빠지면 재시도 무동작 → ErrorBoundary 조합 채택.
