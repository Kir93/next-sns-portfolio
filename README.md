# Next SNS Portfolio

X(트위터) 스타일 모바일 SNS 피드 데모.

**데모** · <https://next-sns-portfolio.vercel.app/>

> **고빈도 갱신 아래의 탭 응답.** 좋아요·조회 수가 명목 20Hz로 바뀌는 2000장 피드에서 좋아요 탭의 interaction latency(INP-정렬 지표) p75는 틱 없는 대조군의 [3.0배](docs/perf/high-frequency/00-baseline.md)로 늘었습니다. 갱신을 [하나의 수용 경계](docs/decisions/ADR-005-high-frequency-ingestion-boundary.md)로 모으고 캐시 반영을 5ms 조각으로 나누자 같은 부하에서 [72ms → 32ms](docs/perf/high-frequency/01-coalescing-yield.md)로 줄었습니다.

<img src="public/readme-feed.webp" alt="SNS 피드 데모 — 게시 컴포저와 텍스트·이미지 카드, 인터랙션 통계" width="270" height="499" />

## 측정 요약

production 빌드 · CPU 4x throttle · 같은 실행 안의 조건 비교입니다. 조건과 재현 커맨드는 [methodology](docs/perf/methodology.md)와 각 리포트의 재현 절에 있습니다.

| 단계                     | 비교                          | 결과                                                                         | 리포트                                                                 |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 붕괴 재현                | 2000장 · 명목 20Hz vs 틱 없음 | p75 24 → 72ms, 틱 전달률 11.1–11.5 → 6.1–6.3/s (506장 무부하 틱 대조군 대비) | [00-baseline](docs/perf/high-frequency/00-baseline.md)                 |
| 분해 (`scheduler.yield`) | `?sched=off` vs `yield`       | p75 72 → 32ms, 틱당 ingestion 35.3 → 34.8ms (작업량 불변)                    | [01-coalescing-yield](docs/perf/high-frequency/01-coalescing-yield.md) |
| 코얼레싱 (rAF 병합)      | `?sched=off` vs `raf`         | 틱당 ingestion 35.3 → 4.6ms, 틱 전달률 6.2 → 6.1/s (개선 없음)               | [01-coalescing-yield](docs/perf/high-frequency/01-coalescing-yield.md) |
| 정합                     | 틱 중 좋아요 연타 · 요청 실패 | 최종 좋아요 상태 · 카운트가 서버와 일치 (경합 단위 테스트 4건 + e2e 1건)     | [02-dedup](docs/perf/high-frequency/02-dedup.md)                       |

## 주요 기능

- 이미지 0~4장에 따른 조건부 레이아웃 (CSS Grid + aspect-ratio)
- 커서 페이지네이션 기반 무한스크롤 (IntersectionObserver)
- 게시(rollback/invalidate)와 좋아요 토글(실패 시 자기 ±1만 철회)의 낙관적 업데이트
- Suspense와 자체 ErrorBoundary로 만든 선언적 비동기 경계 (로딩/에러/재시도)
- `Intl.RelativeTimeFormat` 기반 상대시간 (런타임 의존성 0)
- content-visibility 기반 가상화
- 접근성 · 단위/E2E 테스트

## 기술 스택

Next.js 16 · React 19 · TypeScript · Tailwind v4 · TanStack Query · React Hook Form · Zod · MSW · Vitest · Playwright

## 실행

```bash
pnpm install
pnpm dev      # MSW 활성
pnpm test     # Vitest / Playwright
```

> 설계 결정은 [docs/decisions](docs/decisions/), 성능 실측은 [docs/perf/baseline.md](docs/perf/baseline.md)에 정리해 두었습니다.
