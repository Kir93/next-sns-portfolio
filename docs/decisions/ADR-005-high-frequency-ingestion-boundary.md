---
id: ADR-005
title: 고빈도 갱신 수용 경계
status: accepted
date: 2026-09-27
supersedes: null
superseded_by: null
---

## 1. Context

[ADR-004](ADR-004-async-responsibility-boundary.md)는 비동기 책임을 경계로 옮기면서 "향후 고빈도 성능 슬라이스(scheduler.yield, notifyManager rAF 등)는 이 피드 위에 쌓인다"고 예고했다. 이 ADR이 그 슬라이스의 결정이다. 좋아요·조회 수를 시세 틱처럼 계속 바뀌는 서버 값으로 두고, 그 갱신이 좋아요 탭의 interaction latency(INP-정렬 지표)를 얼마나 늦추는지 재고 줄였다.

- **기본 규모에서는 무너지지 않았다.** 처음 세운 절대 임계(p75 > 200ms)는 재현되지 않았다. 506장 피드는 명목 100Hz 틱에서도 p75 16–24ms, long task 사실상 0건이었다. React 19 배칭, React Compiler, `content-visibility`([ADR-002](ADR-002-feed-virtualization.md))가 흡수했다([스파이크 판정](../perf/high-frequency/spike-verdict.md)).
- **그래서 붕괴 기준을 같은 실행의 대조군 대비로 다시 정했다.** 2000장·명목 20Hz에서 (1) p75가 틱 없는 대조군의 2배 이상이고 (2) 틱 전달률이 무부하 틱 대조군(506장)보다 회차 간 변동을 넘어 낮으면 붕괴로 본다. 커밋 `f1edff5`에서 두 실행 모두 충족했다. p75는 24 → 72ms, 전달률은 11.1–11.5 → 6.1–6.3/s였다([00-baseline](../perf/high-frequency/00-baseline.md)). 같은 커밋의 이전 실행 한 건은 대조군이 머신 부하로 흔들려 1.9배에 그쳤고, 리포트 한계 절에 공개했다.
- **남은 비용은 렌더 횟수가 아니라 태스크 길이였다.** 틱 1회에 캐시 반영(ingestion)이 35–37ms, 서버 측 피드 변이가 2.2–2.3ms 들었다. 틱 없는 대조군의 인터랙션 React commit은 회차마다 40건으로 같았다.

결정이 없으면 틱을 `setQueryData`로 직접 쓰는 경로가 호출부마다 생기고, 커밋 단위·분해·낙관 갱신과의 병합 규칙도 호출부마다 달라진다.

## 2. Decision

**고빈도 서버 갱신은 query cache에 직접 쓰지 않고 하나의 수용 경계(ingestion boundary)를 지나게 한다.** 서버(MSW `feed`)가 진실이고, 캐시는 경계가 그 값을 옮겨 적은 사본이다. 경계는 `src/mocks/tick/applyTicks.ts`의 `createIngestor` 한 곳이며 세 가지를 소유한다.

1. **커밋 단위** — 틱마다 커밋할지, 버퍼에 모아 프레임당 한 번 병합 커밋할지.
2. **분해** — 캐시 반영 계산을 5ms 조각으로 나누고 조각 사이에 `scheduler.yield()`로 양보할지. 미지원 브라우저에서는 양보 없이 이어서 실행한다.
3. **필드 병합** — `liked`는 사용자의 마지막 의도, `likes`는 서버 값에 아직 반영되지 않은 내 ±1을 더한 값으로 맞춰, 틱이 낙관 갱신을 지우지 않게 한다.

스케줄링은 이 경계 안에서만 바꾸고 TanStack Query의 전역 `notifyManager` 스케줄러는 건드리지 않는다. 두 축을 `?sched=off|yield|raf|both`로 따로 켤 수 있게 둔 것은 기여를 같은 실행에서 분리해 재기 위해서다. 그 측정에서 p75를 가장 안정적으로 줄인 것은 분해 단독이었다(72 → 5회 모두 32ms, [01](../perf/high-frequency/01-coalescing-yield.md)). `raf`도 중앙값은 32ms였지만 한 회차가 72ms였다.

## 3. Consequences

### Before / After (측정값, 커밋 `f1edff5`)

| 항목                                | Before (`?sched=off`)                | After                                        | 출처                                                |
| ----------------------------------- | ------------------------------------ | -------------------------------------------- | --------------------------------------------------- |
| interaction p75, 2000장·명목 20Hz   | 72 ms                                | `yield` 32 · `both` 40 ms                    | [01](../perf/high-frequency/01-coalescing-yield.md) |
| 틱당 ingestion                      | 35.3 ms                              | `yield` 34.8 ms (작업량 불변) · `raf` 4.6 ms | [01](../perf/high-frequency/01-coalescing-yield.md) |
| 틱 전달률                           | 6.2/s                                | `raf` 6.1 · `both` 6.2/s (개선 없음)         | [01](../perf/high-frequency/01-coalescing-yield.md) |
| 틱 중 좋아요 연타·실패 후 최종 상태 | 경합 시나리오 3개 모두 서버와 불일치 | 경합 단위 테스트 4건 + e2e 1건 통과          | [02](../perf/high-frequency/02-dedup.md)            |
| 탭당 React commit (틱 없음)         | 3                                    | 2                                            | [02](../perf/high-frequency/02-dedup.md)            |

- (+) 갱신 경로가 한 곳이라 커밋 단위와 분해를 모드로 바꿔 끼우고 같은 실행 안에서 비교할 수 있다.
- (+) 분해는 작업량을 줄이지 않고 한 번에 메인 스레드를 붙잡는 시간만 줄인다. 틱당 ingestion은 `off`와 `yield`가 같았다.
- (−) 코얼레싱은 처리량을 늘리지 못했다. 전달된 틱(초당 6건 남짓)이 프레임보다 드물어 병합 commit이 회차당 0–2건이었고, 커밋마다 뒤따르는 통지·렌더가 남았다. 렌더 비용은 직접 재지 않았으므로 이 부분은 해석이다.
- (−) 배포 코드에 before 경로(`?sched=off`)가 남는다. 분기를 `createIngestor` 한 곳에 모아 drift를 줄였지만, 네 모드가 같은 최종 캐시를 만드는지 계속 테스트로 묶어 두어야 한다.
- (−) 필드 병합은 경계가 서버의 `liked`를 안다는 데모 구조에 기댄다. 사용자별 상태를 싣지 않는 실제 스트림이라면 대기 중인 요청의 델타를 클라이언트가 따로 들고 있어야 한다.
- (−) 멀티탭은 풀지 않았다. 탭마다 틱 엔진과 ingestion이 따로 돈다. 후속 멀티탭 결정은 새 주제의 ADR로 추가하지 않고, 이 ADR을 supersede하는 개정판에 담는다.
- (잠금) `docs/decisions/`는 이 ADR로 5건이 되어 캡에 도달했다. 이후에는 새 ADR을 만들지 않고, 결정이 바뀌면 기존 ADR을 supersede한다.

## 4. Alternatives Considered

- **`refetchInterval` 폴링**: 갱신 주기가 서버가 아닌 클라이언트 타이머에 묶이고, fetch가 끝날 때마다 페이지를 fetch 시작 시점 값으로 교체한다. [02](../perf/high-frequency/02-dedup.md)에서 확인한 fetch 덮어쓰기 경주가 주기마다 생긴다 → 기각.
- **external store 분리**(틱 값을 query cache 밖 store에 두고 카드가 구독): 커밋마다 뒤따르는 통지·렌더 범위를 줄일 수 있는 유일한 후보다. 하지만 진실이 캐시와 store 둘로 나뉘어 낙관 토글과 실패 철회 규칙이 두 저장소에 걸친다 → 이 슬라이스에서는 기각, 처리량이 요구되면 재검토.
- **windowing(react-window 등)**: ADR-002가 가변 높이 카드와 sentinel 무한스크롤 때문에 기각한 선택이다. 이 경계는 그 결정 위에 쌓는다 → 일관 기각.
- **전역 `notifyManager.setScheduler` 교체**: API는 실재한다(`@tanstack/query-core@5.103.1`). 하지만 틱과 무관한 모든 쿼리·mutation 통지의 시점이 기본 `setTimeout(0)`에서 바뀐다 → 국소 경계 채택.
- **`scheduler-polyfill` 도입**: Safari의 `scheduler.yield()` 미지원을 메우지만 새 런타임 의존성이다([ADR-003](ADR-003-dependency-weight-quality-metric.md)). 기능 감지 후 양보 없이 이어서 실행하는 폴백으로 대신한다 → 미도입.
