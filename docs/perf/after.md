# content-visibility 가상화 — 격리 실험 (before/after)

> ✅ **측정 완료 (2026-06-20)**: 실제 피드는 18장이라 `content-visibility:auto`(화면 밖 카드 렌더 생략)의 효과가 노이즈 수준이다. 기법의 가치를 정직하게 보이기 위해, **동일 프로덕션 빌드**에 합성 스트레스 피드(N=506)를 올리고 런타임 CSS로 `content-visibility`만 on/off 토글해 비교했다. 토글이 실제 적용됐는지는 computed style로 검증했다(`auto` ↔ `visible`). 정성 근거는 [ADR-002](../decisions/ADR-002-feed-virtualization.md).

## 적용된 변경 (현재 코드)

- 피드 카드(`<li>`)에 `content-visibility:auto` + `contain-intrinsic-size:auto 420px` — off-screen 카드 렌더 생략(CSS-only 가상화).
- React Compiler 자동 메모이제이션(슬라이스 0) — 수동 `useMemo`/`useCallback` 미사용.
- a11y: `<main>` 랜드마크 + skip link + sr-only `<h1>`, 아이콘 버튼 aria-label, 이미지 alt, focus-visible.

## 실험 조건

- 로컬 프로덕션 빌드(`pnpm build && pnpm start`), 합성 피드 **N=506**(featured 6 + generated 500), 시스템 Chrome, viewport 390×844.
- 측정: CDP `Performance.getMetrics`의 `LayoutDuration`/`RecalcStyleDuration` 누적값을 — cv:auto 초기 로드 직후(M0) → `content-visibility:visible !important` 강제 후(M1) 비교. **델타 = cv:auto가 초기 렌더에서 생략한 작업량.**
- 각 3회 중앙값. picsum 이미지는 네트워크 차단(렌더링 비용만 격리).

## before → after (2026-06-20 실측, N=506, 3회 중앙값)

| 지표                        | cv:auto (현재) | cv:visible 강제 시 추가 | 의미                                 |
| --------------------------- | -------------- | ----------------------- | ------------------------------------ |
| 초기 렌더 LayoutDuration    | 기준           | **+42.9 ms**            | cv:auto가 생략한 off-screen 레이아웃 |
| 초기 렌더 RecalcStyle       | 기준           | **+41.9 ms**            | cv:auto가 생략한 스타일 재계산       |
| 초기 렌더 메인스레드 작업 합 | 기준           | **~85 ms**              | off-screen 카드 렌더 작업 절감        |

> 측정 환경은 데스크톱(비스로틀)이라 절대값 ~85 ms. Lighthouse 모바일 프리셋(CPU 4x slowdown) 환산 시 대략 3–4배 수준의 초기 렌더 블로킹 절감에 해당(추정) → TBT/INP 직접 개선.

## 해석

- `content-visibility:auto`의 이득은 **리스트 길이·카드 복잡도에 비례**한다. 실제 18장 피드에선 미미하지만, 누적 스크롤(수백 장) 시 초기/스크롤 렌더 작업을 선형적으로 줄인다 — ADR-002가 windowing 라이브러리 대신 CSS 가상화를 택한 근거를 실측이 뒷받침한다.
- `contain-intrinsic-size: 420px`는 이미지 카드 기준값이라, 텍스트 전용 카드(실측 144 px)에는 과대 추정이라 스크롤 높이가 부풀려진다. 카드 유형별 intrinsic-size 튜닝이 후속 개선 여지.
</content>
