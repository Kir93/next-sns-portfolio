# Next SNS Portfolio

## 프로젝트 개요

본 프로젝트는 X.com(구 트위터)의 피드 형태를 모티브로 한 모바일 전용 SNS 피드 웹 애플리케이션입니다.
모바일 우선 접근 방식(max-width: 414px, 768px 기준)의 반응형 UI 구현 능력을 증명하고, 동시에 테스트 코드 작성, 개발 프로세스 자동화, 성능 최적화를 목표로 제작합니다.

## Quick start

```zsh
git clone https://github.com/Kir93/next-sns-portfolio.git
```

1. Install packages - pnpm install
2. Changed Theme - ./styles/theme.ts
3. Theme Typegen - npx @chakra-ui/cli typegen ./src/styles/theme.ts
4. Running Project - pnpm dev or npm run dev or yarn dev

## Repository short explanation

NextJS app router simple template.

- **Framework**: Next.js, React
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query, Zustand
- **Form Handling**: React-Hook-Form, Zod
- **API Mocking**: MSW (Mock Service Worker)
- **Testing**: Playwright (E2E Test)
- **Deployment**: Vercel

## Package Version

Important library version history

| Name                  | Version |
| :-------------------- | :------ |
| next                  | latest  |
| react                 | v19     |
| @chakra-ui/react      | v3.8.0  |
| zustand               | v5.0.3  |
| @tanstack/react-query | v5.66.0 |
| react-hook-form       | v3.24.2 |
| zod                   | v3.24.2 |
