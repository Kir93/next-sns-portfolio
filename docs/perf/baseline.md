# 성능 베이스라인 (before)

> ⚠️ **측정 대기**: 아래 수치 표는 **실측 전 비어 있음**. 정량값은 자동화 도구가 없는 환경에서 날조하지 않는다(프로젝트 규칙: 실측만 기록). 아래 "측정 절차"로 동일 조건 실측 후 채운다. 가상화 결정의 정성 근거는 [ADR-002](../decisions/ADR-002-feed-virtualization.md) 참조.

## 측정 조건 (재현 가능하게 고정)

- 빌드: `pnpm build && pnpm start` (production), 또는 Lighthouse-CI.
- 디바이스/스로틀: Lighthouse 모바일 프리셋(Moto G Power, 4x CPU, Slow 4G).
- 데이터: MSW mock 피드(`src/mocks/data/posts.ts`) — 누적 스크롤 시나리오는 무한쿼리 N페이지 로드.
- 측정 3회 중앙값.

## 측정 절차

```bash
pnpm build && pnpm start          # http://localhost:3000
npx lighthouse http://localhost:3000 \
  --preset=desktop --form-factor=mobile --output=json --output=html \
  --output-path=./docs/perf/lh-baseline
# React DevTools Profiler: 피드 스크롤/작성 시 SnsCard 리렌더 횟수 기록
```

## 결과 (실측 후 기입)

| 지표                          | 값          | 비고                               |
| ----------------------------- | ----------- | ---------------------------------- |
| Lighthouse Performance        | _측정 대기_ | 모바일 프리셋                      |
| LCP                           | _측정 대기_ |                                    |
| CLS                           | _측정 대기_ | next/image dimensions로 0 목표     |
| INP                           | _측정 대기_ | 스크롤/작성 상호작용               |
| 피드 스크롤 시 SnsCard 리렌더 | _측정 대기_ | React Compiler 자동 메모 효과 검증 |
| a11y (Lighthouse/axe)         | _측정 대기_ | critical 0 목표                    |
