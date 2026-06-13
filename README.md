# Next SNS Portfolio

## 프로젝트 개요

본 프로젝트는 X.com(구 트위터)의 피드 형태를 모티브로 한 모바일 전용 SNS 피드 웹 애플리케이션입니다.
모바일 우선 접근 방식(max-width: 414px, 768px 기준)의 반응형 UI 구현 능력을 증명하고, 동시에 테스트 코드 작성, 개발 프로세스 자동화, 성능 최적화를 목표로 제작합니다.

## Quick start

```zsh
git clone https://github.com/Kir93/next-sns-portfolio.git
```

1. Install packages - pnpm install
2. Running Project - pnpm dev

## Repository short explanation

Next.js App Router based SNS feed portfolio.

- **Framework**: Next.js (App Router), React
- **Language**: TypeScript
- **Compiler**: React Compiler (automatic memoization)
- **Styling**: Tailwind CSS v4 + Base UI (headless) + shadcn pattern (CVA / clsx / tailwind-merge) + lucide-react
- **State Management**: React Query, Zustand
- **Form Handling**: React-Hook-Form, Zod
- **API Mocking**: MSW (Mock Service Worker)
- **Testing**: Playwright (E2E Test)
- **Deployment**: Vercel

## Package Version

Important library version history

| Name                  | Version  |
| :-------------------- | :------- |
| next                  | 16.2.7   |
| react                 | 19.2.7   |
| @base-ui/react        | 1.5.0    |
| tailwindcss           | 4.3.0    |
| zustand               | 5.0.14   |
| @tanstack/react-query | 5.100.14 |
| react-hook-form       | 7.76.1   |
| zod                   | 4.4.3    |
