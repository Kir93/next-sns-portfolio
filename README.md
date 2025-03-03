# Next SNS Portfolio

## 프로젝트 개요

Next SNS Portfolio 제작

## Quick start

```zsh
git clone https://github.com/Kir93/next-sns-portfolio.git
```

1. Install packages - pnpm install or npm install or yarn
2. Changed Theme - ./styles/theme.ts
3. Theme Typegen - npx @chakra-ui/cli typegen ./src/styles/theme.ts
4. Running Project - pnpm dev or npm run dev or yarn dev

## Repository short explanation

NextJS app router simple template.

- FrameWork : next
- Styling Tool: @chakra-ui/react
- Global State Management : zustand
- Server State Management : @tanstack/react-query
- Form State Management : react-hook-form
- Form Schema Validation : zod

## Package Version

Important library version history

| Name                  | Version |
| :-------------------- | :------ |
| react                 | v19     |
| next                  | v15.1.6 |
| @chakra-ui/react      | v3.8.0  |
| zustand               | v5.0.3  |
| @tanstack/react-query | v5.66.0 |
| react-hook-form       | v3.24.2 |
| zod                   | v3.24.2 |

## Process List

1. **페이지 제작**
   - [ ] 헤더, 푸터, 네비게이션 등 기본 컴포넌트 개발
   - [ ] 페이지 기본 UI 설계
   - [ ] react-hook-form과 zod를 이용한 form 구성
   - [ ] 페이지 기능 통합 및 테스트
2. **모킹(mocking) 구현**
   - [ ] msw 설정 파일 구성
   - [ ] API 모킹 스크립트 작성
   - [ ] 모킹 환경에서 테스트 실행
3. **E2E 테스트 추가**
   - [ ] Playwright 환경 설정
   - [ ] E2E 테스트 케이스 작성
   - [ ] 자동화 테스트 워크플로우 구축
4. **리팩토링**
   - [ ] 코드 정리 및 주석 보완
   - [ ] 컴포넌트 재사용성 강화
   - [ ] 코드 리뷰 후 개선
5. **최적화**
   - [ ] 성능 분석 및 프로파일링 진행
   - [ ] 불필요한 라이브러리 제거
   - [ ] 번들 사이즈 및 로딩 시간 최적화
