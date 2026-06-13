# Next SNS Portfolio

X(구 트위터) 스타일 모바일 SNS 피드 웹앱. 단순 UI 클론이 아니라 **실무 표준 스택 정합 · 측정 기반 성능 최적화 · 의사결정 문서화(ADR)** 로 "왜 이렇게 만들었는가"를 증명하는 6년차+ 프론트엔드 포트폴리오입니다.

## 데모

```bash
pnpm install
pnpm dev          # http://localhost:3000 (MSW 모킹 위 동작 데모)
```

- 배포 링크: _배포 후 추가_
- 스크린샷(이미지 0~4장 레이아웃 · 무한스크롤 · 작성 낙관적 업데이트): _캡처 후 추가_

## 핵심 역량

- **조건부 UI 설계** — `SnsCard`의 이미지 0/1/2/3/4+장 레이아웃을 CSS Grid + `aspect-ratio`로 분기(가장 까다로운 3장 비대칭 포함).
- **데이터 흐름** — TanStack Query 무한쿼리(커서 페이지네이션) + IntersectionObserver 무한스크롤, 작성 시 낙관적 업데이트(rollback/invalidate).
- **성능** — React Compiler 자동 메모이제이션 + `content-visibility` 가상화([ADR-002](docs/decisions/ADR-002-feed-virtualization.md)).
- **접근성** — 시맨틱 랜드마크 · skip link · 아이콘 버튼 aria-label · 이미지 alt · focus-visible · `aria-live`.
- **품질 게이트** — Vitest 유닛 + Playwright E2E + GitHub Actions CI(lint → type-check → unit → e2e).

## 아키텍처

스택, 수직 슬라이스 전략, 디렉토리(co-location), 데이터/모킹 전략은 [docs/architecture.md](docs/architecture.md)에 정리했습니다. 핵심 의사결정은 ADR로 남겼습니다:

- [ADR-001 — RSC ↔ Client 렌더링·데이터 경계](docs/decisions/ADR-001-rendering-data-boundary.md)
- [ADR-002 — 피드 가상화 전략](docs/decisions/ADR-002-feed-virtualization.md)

## 성능 측정

측정 방법론과 before/after는 [docs/perf](docs/perf/baseline.md)에 기록합니다. 정량 수치는 동일 조건 실측값만 기입하며(거짓 결과 금지), Lighthouse-CI/로컬 실측으로 채웁니다.

## AI-Assisted Development

이 프로젝트는 **수직 슬라이스 + 게이트 기반 워크플로**로 진행했습니다. 각 슬라이스(스택 전환 → 피드 → 작성 → 무한스크롤 → 테스트 → 성능/a11y → 문서)는 독립 PR 단위로 끝까지 관통했고, 매 슬라이스마다:

1. spec/ADR로 의도와 수용 기준을 먼저 고정,
2. 구현 후 **시맨틱 리뷰 + 명세 정합(drift) 게이트**로 검증(작성자와 평가자 분리),
3. lint/type-check/build + 단위·E2E 테스트로 회귀를 차단

하는 절차를 적용했습니다. 외부 사실(Next 16 React Compiler 활성화, Tailwind v4 셋업, MSW v2 패턴 등)은 추정 대신 공식 문서로 확인했습니다. AI를 보조 도구로 쓰되, 의사결정·게이트·검증은 사람이 통제하는 프로세스를 지향합니다.

## Getting Started

```bash
pnpm install
pnpm dev            # 개발 서버 (MSW 활성)
pnpm build          # 프로덕션 빌드 (React Compiler)
pnpm type-check     # 타입 체크
pnpm lint           # ESLint (flat config)
pnpm test           # Vitest 유닛
pnpm test:e2e       # Playwright E2E (chromium)
```

## Stack

| 영역         | 선택                                                                            |
| :----------- | :------------------------------------------------------------------------------ |
| Framework    | Next.js 16 (App Router), React 19, React Compiler                               |
| Language     | TypeScript                                                                      |
| Styling      | Tailwind CSS v4 + Base UI + shadcn 패턴(CVA/clsx/tailwind-merge) + lucide-react |
| Data / State | TanStack Query, Zustand                                                         |
| Forms        | React Hook Form, Zod                                                            |
| Mocking      | MSW (dev/test 단일 소스)                                                        |
| Testing      | Vitest, Testing Library, Playwright, GitHub Actions                             |

### 주요 버전 (고정)

| Name                  | Version  |
| :-------------------- | :------- |
| next                  | 16.2.7   |
| react                 | 19.2.7   |
| @base-ui/react        | 1.5.0    |
| tailwindcss           | 4.3.0    |
| @tanstack/react-query | 5.100.14 |
| react-hook-form       | 7.76.1   |
| zod                   | 4.4.3    |
| msw                   | 2.14.6   |
