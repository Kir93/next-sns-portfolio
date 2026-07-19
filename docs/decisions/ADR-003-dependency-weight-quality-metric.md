---
id: ADR-003
title: 의존성 무게를 품질지표로
status: accepted
date: 2026-06-28
supersedes: null
superseded_by: null
---

## 1. Context

`feed-hygiene-async-boundary` 슬라이스 진입 시 `package.json`에 선언됐으나 `src`/`app`에서 import 0건인 의존성 4종(`@base-ui/react`, `dayjs`, `class-variance-authority`, `zustand`)이 있었다. 이전 `stack-migration` 슬라이스가 "선언 스택/foundation으로 보존"이라 carry-over한 잔재다.

문제는 **선언↔실사용 drift**다. phantom 의존성은 (a) 공급망 공격 표면, (b) 설치 시간·`node_modules` 용량, (c) lockfile/audit 노이즈, (d) "이 스택을 쓴다"는 거짓 신호를 남긴다. 이번 슬라이스 자체가 위생 청산이므로, 의존성 판단 기준을 ADR로 고정해 향후 슬라이스가 재발을 막도록 한다.

## 2. Decision

**phantom 의존성 4종을 제거하고, "의존성 무게(weight)를 품질지표로" 취급하는 정책을 채택한다.** 의존성은 자리값을 증명해야 한다:

1. **실제 import**가 있어야 한다. 선언만 하고 안 쓰는 의존성은 즉시 제거.
2. **무게를 작업 규모에 비례**시킨다 — 사소한 helper에 무거운 라이브러리 금지, stdlib/내장(`Intl.RelativeTimeFormat` 등)이나 기존 의존성으로 되면 새 의존성 추가 금지.
3. **`pnpm depcheck`를 위생 게이트**로 둔다(path-alias·flat-config false positive는 인지하고 4종 신호만 본다).

이 정책의 첫 적용으로 시간 표시를 `dayjs` 대신 **`Intl.RelativeTimeFormat('ko')` 기반 자체 유틸**(`src/utils/relativeTime.ts`)로 구현했다 — 새 런타임 의존성 0.

## 3. Consequences

### Before / After (측정값)

| 항목 | Before | After |
| ---- | ------ | ----- |
| 선언 의존성(dependencies) | 14 | 10 |
| import 0건 phantom dep | 4 | 0 |
| `depcheck` Unused dependencies | 4 | 0 |
| 제거 패키지 설치 footprint(.pnpm) | `@base-ui/react` 14M · `dayjs` 1.9M · `zustand` 252K · `cva` 44K ≈ **16M** | 0 |
| **런타임 번들 영향** | **0 (import 0이라 애초에 번들 미포함)** | **0** |

- (+) manifest 정직성 회복 — 선언=실사용. 공급망/audit 표면, 설치 footprint(~16M) 축소.
- (+) 시간 표시는 플랫폼 내장 API로 충분 — 의존성 0으로 기능 확보, UTC 하드코딩 버그까지 동시 수정.
- (=) **번들 크기 개선은 없다** — 4종은 import가 없어 tree-shaking 이전에 의존성 그래프에 들어가지도 않았다. 본 작업은 **perf가 아니라 위생**이다. 이 점을 호도하지 않는 것이 본 ADR의 정직성 핵심.
- (−) `depcheck`는 tsconfig path alias(`@type/*` 등)와 flat-config 플러그인을 미해석해 false positive(Missing/Unused devDeps)를 낸다 → 게이트는 "dependencies의 Unused" 신호만 신뢰하고 나머지는 수동 판독.

## 4. Alternatives Considered

- **foundation으로 보존(현상 유지)**: "다음 슬라이스가 쓸 것"이라는 예측은 YAGNI. 실제로 슬라이스 1-2에서 쓰지 않았고 phantom으로 부패 → 기각.
- **자동 도구만 도입(정책 없이 depcheck)**: 도구는 신호일 뿐. "무게를 작업에 비례"라는 판단 기준이 없으면 새 phantom이 다시 쌓임 → 정책과 병행해야 함.
- **`react-error-boundary`·`@suspensive/react` 등 신규 도입으로 경계 단순화**: 의존성 정리 슬라이스에서 새 런타임 의존성 추가는 역설 → 자체 구현 채택(연계: ADR-004).
