# 성능 측정 (after) — 가상화·최적화 적용 후

> ⚠️ **측정 대기**: [baseline](baseline.md)과 **동일 조건**으로 가상화(`content-visibility`, [ADR-002](../decisions/ADR-002-feed-virtualization.md)) 적용 후 재측정해 채운다. 실측 전 수치 날조 금지.

## 적용된 변경

- 피드 카드(`<li>`)에 `content-visibility: auto` + `contain-intrinsic-size: auto 420px` — off-screen 카드 렌더 생략(CSS-only 가상화).
- a11y: `<main>` 랜드마크 + skip link + sr-only `<h1>`, 아이콘 버튼 aria-label, 이미지 alt, focus-visible(슬라이스 1~2부터).
- React Compiler 자동 메모이제이션(슬라이스 0) — 수동 `useMemo`/`useCallback` 미사용.

## before → after (실측 후 기입)

| 지표                   | before | after  | 개선                    |
| ---------------------- | ------ | ------ | ----------------------- |
| Lighthouse Performance | _대기_ | _대기_ | _대기_                  |
| LCP                    | _대기_ | _대기_ |                         |
| CLS                    | _대기_ | _대기_ |                         |
| INP (긴 리스트 스크롤) | _대기_ | _대기_ | content-visibility 효과 |
| SnsCard 리렌더(스크롤) | _대기_ | _대기_ |                         |
| a11y critical 위반     | _대기_ | 0 목표 |                         |

## 측정 절차

baseline.md "측정 절차"와 동일. 누적 스크롤(수백 카드) 시나리오에서 off-screen 렌더 생략으로 인한 INP/스크롤 프레임 개선을 중점 비교.
