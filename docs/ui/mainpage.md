# 프로젝트: SNS 피드 UI 개발

## 1. 프로젝트 목표

X.com (구 트위터) 스타일의 SNS 피드 페이지를 구성하는 핵심 UI 컴포넌트를 개발한다. 컴포넌트는 재사용 가능하고 확장하기 쉬운 구조로 설계하며, 다양한 데이터 형태(이미지 개수 등)에 유연하게 대응할 수 있어야 한다.

## 2. 핵심 UI 컴포넌트 명세

### 2.1. SNS 카드 (SnsCard)

피드의 개별 게시물을 나타내는 기본 단위 컴포넌트.

#### 2.1.1. Props 정의 (TypeScript Interface)

```ts
interface SnsCardProps {
  user: {
    profileImageUrl: string;
    displayName: string;
    username: string;
  };
  post: {
    content: string;
    images?: string[]; // 이미지 URL 배열. 없을 수도 있음.
    createdAt: Date;
  };
  stats: {
    comments: number;
    retweets: number;
    likes: number;
    views: number;
  };
}
```

#### 2.1.2. 기본 구조 (Layout)

상단: 사용자 프로필 이미지, 이름, 아이디, 작성 시간이 표시된다.

중단: 게시물 텍스트 내용과 이미지가 표시된다.

하단: 댓글, 리트윗, 좋아요, 조회수 등 인터랙션 통계와 아이콘이 표시된다.

#### 2.1.3. 이미지 레이아웃 조건부 렌더링 (Variations)

post.images 배열의 길이에 따라 다음과 같이 다른 레이아웃을 렌더링해야 한다.

images가 undefined 또는 length === 0 (사진 없는 카드):

이미지 영역을 렌더링하지 않는다.

images.length === 1 (사진 1장):

16:9 비율의 단일 이미지를 카드 가로폭에 꽉 차게 표시한다.

images.length === 2 (사진 2장):

2개의 이미지를 1:1 비율로 좌우로 나란히 표시한다. 각 이미지는 할당된 공간을 꽉 채운다. (세로 분할)

images.length === 3 (사진 3장):

첫 번째 이미지를 왼쪽에 세로로 길게 (1:2 비율) 표시한다.

두 번째, 세 번째 이미지를 오른쪽에 1:1 비율로 위아래로 쌓아 표시한다.

images.length >= 4 (사진 3장 이상, 즉 4장부터):

최대 4개의 이미지만을 2x2 그리드 레이아웃으로 표시한다.

5개 이상의 이미지가 주어지더라도 처음 4개만 그리드로 보여주고, 마지막 이미지에 +N (예: +3)과 같이 오버레이를 표시하는 것은 **추가 기능(Optional)**으로 둔다. 우선 4개 그리드 표시에 집중한다.

### 2.2. 피드 컨테이너 (FeedContainer)

여러 SnsCard 컴포넌트를 수직으로 나열하여 보여주는 컨테이너.

#### 2.2.1. Props 정의

```ts
interface FeedContainerProps {
  posts: SnsCardProps[]; // SnsCard에 전달될 데이터 배열
}
```

#### 2.2.2. 구조 및 기능

posts 배열을 map() 메소드로 순회하며 SnsCard 컴포넌트를 렌더링한다.

각 SnsCard 사이에는 1px의 회색 구분선(divider)을 둔다.

(심화) 무한 스크롤(Infinite Scroll) 기능을 염두에 두고 설계한다. Intersection Observer API를 활용하여 스크롤이 하단에 닿았을 때 추가 데이터를 로드하는 로직이 추가될 수 있도록 구조를 잡는다.

#### 3. 추천 파일 구조 (Directory Structure)

```bash
src/
└── components/
├── common/
│ ├── Avatar.tsx
│ └── Icon.tsx
└── domain/
└── sns/
├── FeedContainer.tsx
└── SnsCard/
├── index.tsx // SnsCard 컴포넌트 Main
├── ImageGrid.tsx // 이미지 레이아웃 로직 분리
├── PostHeader.tsx // 사용자 정보 부분
├── PostContent.tsx // 텍스트 및 이미지 부분
└── PostActions.tsx // 좋아요, 리트윗 등 버튼 부분
```
