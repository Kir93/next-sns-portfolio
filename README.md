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

## Git Rule

### 2.1 Add

파일 생성 시 사용

```zsh
git commit -m 'add test atom'
```

### 2.2 Update

리팩토링, 성능 향상 등

```zsh
git commit -m 'update test atom type 추가'
```

### 2.2 Style

단순 css 수정 등

```zsh
git commit -m 'style test atom margin'
```

### 2.2 Fix

기능 관련 오류 수정

```zsh
git commit -m 'fix userData update 안되는 현상 수정'
```

### 2.2 HotFix

서비스 치명적 오류 수정

```zsh
git commit -m 'hotfix 무한 로그인 현상 수정'
```

### 2.2 Delete

파일 삭제 시 사용

```zsh
git commit -m 'delete test atom'
```

### Branch Rule

- main → dev 하위로 feature 브랜치 생성
- hotfix는 dev에서 바로 브랜치 생성
- feature 및 하위 브랜치는 Squash and Merge
- dev에서 main은 Normal Merge

## Process List

1. **라우팅 구조 설계**
   - [x] 참고 사이트 페이지 흐름 분석
   - [x] URL 매핑 및 설계
   - [ ] 라우터 매핑 구현 및 테스트
2. **글로벌 컴포넌트 제작**
   - [ ] 디자인 시스템 정리 및 컴포넌트 스펙 작성
   - [ ] 헤더, 푸터, 네비게이션 등 기본 컴포넌트 개발
   - [ ] 컴포넌트 통합
3. **페이지 제작**
   - [ ] 페이지 기본 UI 설계
   - [ ] react-hook-form과 zod를 이용한 form 구성
   - [ ] 페이지 기능 통합 및 테스트
4. **모킹(mocking) 구현**
   - [ ] msw 설정 파일 구성
   - [ ] API 모킹 스크립트 작성
   - [ ] 모킹 환경에서 테스트 실행
5. **E2E 테스트 추가**
   - [ ] Playwright 환경 설정
   - [ ] E2E 테스트 케이스 작성
   - [ ] 자동화 테스트 워크플로우 구축
6. **리팩토링**
   - [ ] 코드 정리 및 주석 보완
   - [ ] 컴포넌트 재사용성 강화
   - [ ] 코드 리뷰 후 개선
7. **최적화**
   - [ ] 성능 분석 및 프로파일링 진행
   - [ ] 불필요한 라이브러리 제거
   - [ ] 번들 사이즈 및 로딩 시간 최적화
