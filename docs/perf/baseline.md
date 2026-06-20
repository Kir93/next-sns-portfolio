# 성능 베이스라인 — 프로덕션 page-load

> ✅ **측정 완료 (2026-06-20)**: 배포된 프로덕션 URL에 Lighthouse 모바일 프리셋을 3회 돌린 중앙값이다. 정량값은 동일 조건 실측만 기록한다(프로젝트 규칙: 날조 금지). `content-visibility` 가상화 단독 효과의 격리 실험은 [after.md](after.md) 참조.

## 측정 조건 (재현 가능하게 고정)

- 대상: 배포 URL <https://next-sns-portfolio.vercel.app/> — Vercel. 데이터는 MSW 브라우저 워커가 제공한다([ADR-001](../decisions/ADR-001-rendering-data-boundary.md), 실백엔드 없음).
- 도구: Lighthouse 13.4.0, 모바일 프리셋(시뮬레이트 스로틀 — 412×823, CPU 4x slowdown, Slow 4G 상당).
- 측정 3회 중앙값.

## 측정 절차

```bash
pnpm dlx lighthouse https://next-sns-portfolio.vercel.app/ \
  --only-categories=performance,accessibility \
  --output=json --output-path=./docs/perf/lh-baseline \
  --chrome-flags="--headless=new"
# 3회 반복 후 각 지표 중앙값
```

## 결과 (2026-06-20 실측, 3회 중앙값)

| 지표                   | 값                  | 비고                                                                 |
| ---------------------- | ------------------- | -------------------------------------------------------------------- |
| Lighthouse Performance | **87**              | 모바일 프리셋 (runs: 85 / 88 / 87)                                   |
| LCP                    | **4.0 s** (4010 ms) | 피드가 client-fetch + MSW 게이팅 후 렌더 → ADR-001의 약한 LCP tradeoff가 수치로 드러남 |
| CLS                    | **0**               | `aspect-ratio` 이미지 박스로 레이아웃 시프트 없음                    |
| TBT (INP 랩 프록시)    | **84 ms**           | INP은 필드 지표라 랩에선 TBT로 대용 (<200 ms 양호)                  |
| FCP                    | **1.2 s** (1214 ms) | 서버 렌더 셸                                                         |
| Speed Index            | **2.3 s** (2287 ms) |                                                                      |
| Accessibility          | **96**              | 실패 감사 1건: `color-contrast` (저대비 보조 텍스트)               |

## 관찰 / 후속

- **LCP 4.0 s가 가장 큰 개선 여지.** 원인은 ADR-001의 결정(피드 client-fetch + MSW 워커 준비까지 렌더 게이팅)으로, 이는 ADR-001이 명시한 "−" tradeoff를 정량화한 것이다. 실백엔드 도입 시 RSC prefetch + `HydrationBoundary`로 개선 가능(ADR-001 supersede 후보).
- **color-contrast 1건**: 타임스탬프/보조 텍스트의 회색 대비 부족 추정 — a11y 100 달성하려면 대비 상향 필요.
- React Compiler 자동 메모(스크롤 시 SnsCard 리렌더 억제)는 React DevTools Profiler 계측이 필요해 이번 page-load 패스에선 다루지 않았다. 스크롤은 피드 상태를 바꾸지 않으므로 구조적으로 리렌더 트리거가 없다.
</content>
</invoke>
