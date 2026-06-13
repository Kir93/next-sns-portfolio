import FeedContainer from './_components/sns/FeedContainer';
import PostComposer from './_components/sns/PostComposer';

export default function Home() {
  return (
    <>
      <h1 className="sr-only">홈 피드</h1>
      <PostComposer />
      <FeedContainer />
    </>
  );
}
