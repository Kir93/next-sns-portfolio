# Next SNS Portfolio

X(트위터) 스타일 모바일 SNS 피드 데모.

**데모** · <https://next-sns-portfolio.vercel.app/>

## 주요 기능

- 이미지 0~4장 조건부 레이아웃 (CSS Grid + aspect-ratio)
- 커서 페이지네이션 무한스크롤 (IntersectionObserver)
- 게시 시 낙관적 업데이트 (rollback/invalidate)
- content-visibility 가상화 · 접근성 · 단위/E2E 테스트

## 기술 스택

Next.js 16 · React 19 · TypeScript · Tailwind v4 · TanStack Query · Zustand · React Hook Form · Zod · MSW · Vitest · Playwright

## 실행

```bash
pnpm install
pnpm dev      # MSW 활성
pnpm test     # Vitest / Playwright
```

> 설계 결정(ADR)과 성능 실측은 [docs/](docs/)에 정리해 두었습니다.
</content>
