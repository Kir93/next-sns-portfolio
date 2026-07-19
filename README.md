# Next SNS Portfolio

X(트위터) 스타일 모바일 SNS 피드 데모.

**데모** · <https://next-sns-portfolio.vercel.app/>

<img src="public/readme-feed.webp" alt="SNS 피드 데모 — 게시 컴포저와 텍스트·이미지 카드, 인터랙션 통계" width="270" height="499" />

## 주요 기능

- 이미지 0~4장 조건부 레이아웃 (CSS Grid + aspect-ratio)
- 커서 페이지네이션 무한스크롤 (IntersectionObserver)
- 게시 낙관적 업데이트 (rollback/invalidate) · 좋아요 낙관 토글
- Suspense + 자체 ErrorBoundary 선언적 비동기 경계 (로딩/에러/재시도)
- `Intl.RelativeTimeFormat` 기반 상대시간 (런타임 의존성 0)
- content-visibility 가상화 · 접근성 · 단위/E2E 테스트

## 기술 스택

Next.js 16 · React 19 · TypeScript · Tailwind v4 · TanStack Query · React Hook Form · Zod · MSW · Vitest · Playwright

## 실행

```bash
pnpm install
pnpm dev      # MSW 활성
pnpm test     # Vitest / Playwright
```

> 설계 결정은 [docs/decisions](docs/decisions/), 성능 실측은 [docs/perf/baseline.md](docs/perf/baseline.md)에 정리해 두었습니다.
