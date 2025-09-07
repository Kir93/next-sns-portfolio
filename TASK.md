# SNS 피드 서비스 개발 작업 목록 (TASK)

## Phase 1: 페이지 제작

- [ ] **기본 UI 설계**
  - [ ] 공통 Layout 컴포넌트 (Header, Footer 등)
  - [ ] `FeedContainer` 컴포넌트 구조 설계
  - [ ] `SnsCard` 컴포넌트 기본 구조 설계
  - [ ] `SnsCard` 이미지 레이아웃 Variations 구현 (0-4장)
- [ ] **Form 구성 (react-hook-form, zod)**
  - [ ] 게시물 작성 Form UI 구현
  - [ ] `zod`를 이용한 유효성 검사 스키마 정의
  - [ ] `react-hook-form`과 `zod` 연동
- [ ] **페이지 기능 통합 및 테스트**
  - [ ] Form 제출 시 피드 목록에 새 카드 추가 기능 구현
  - [ ] 각 컴포넌트 단위 기능 수동 테스트

## Phase 2: 모킹(Mocking) 구현

- [ ] **MSW 환경 설정**
  - [ ] `msw` 라이브러리 설치 및 기본 설정
  - [ ] `src/mocks` 폴더 구조 설정 (handlers, browser, server)
- [ ] **API 모킹 스크립트 작성**
  - [ ] `GET /api/posts` 핸들러 작성 (피드 목록 조회)
  - [ ] `POST /api/posts` 핸들러 작성 (새 게시물 작성)
- [ ] **모킹 환경에서 테스트**
  - [ ] 개발 환경에서 MSW 활성화 확인
  - [ ] 모킹된 API를 통해 피드 조회 및 작성 기능 연동 테스트

## Phase 3: E2E 테스트 추가

- [ ] **Playwright 환경 설정**
  - [ ] `playwright` 라이브러리 설치 및 `playwright.config.ts` 설정
- [ ] **E2E 테스트 케이스 작성**
  - [ ] `게시물 작성` 시나리오 테스트 코드 작성 (글 입력 > 제출 > 목록에 반영 확인)
  - [ ] `피드 조회` 시나리오 테스트 코드 작성 (페이지 진입 시 카드 목록 렌더링 확인)
- [ ] **자동화 테스트 워크플로우 구축 (Optional)**
  - [ ] Github Actions 연동하여 PR 생성 시 E2E 테스트 자동 실행

## Phase 4: 리팩토링

- [ ] **코드 정리 및 주석 보완**
  - [ ] `ESLint`, `Prettier` 규칙에 따른 코드 포맷팅
  - [ ] 복잡한 로직에 대한 주석 추가
- [ ] **컴포넌트 재사용성 강화**
  - [ ] `SnsCard` 내부 요소를 재사용 가능한 컴포넌트로 분리 (e.g., `Avatar`, `PostActions`)
  - [ ] 공통 `Custom Hook` 로직 분리 (e.g., `useUser`, `usePosts`)
- [ ] **코드 리뷰 및 개선**
  - [ ] 동료 또는 나 자신에게 코드 리뷰 요청 (Self-review)
  - [ ] 리뷰 피드백 반영하여 코드 품질 개선

## Phase 5: 최적화

- [ ] **성능 분석 및 프로파일링**
  - [ ] Lighthouse 점수 측정 (초기 상태 기록)
  - [ ] React Developer Tools Profiler를 이용한 리렌더링 분석
- [ ] **최적화 작업**
  - [ ] `React.memo`, `useCallback` 등을 사용한 불필요한 리렌더링 방지
  - [ ] 이미지 최적화 (Next.js `Image` 컴포넌트 활용, WebP 포맷)
  - [ ] 코드 스플리팅(Code Splitting) 적용 검토
  - [ ] (심화) `react-window` 등을 이용한 가상 스크롤(Virtual Scroll) 구현
- [ ] **결과 측정 및 문서화**
  - [ ] 최적화 후 Lighthouse 점수 재측정 및 개선 수치 기록
  - [ ] `README.md`에 최적화 결과 요약 추가
