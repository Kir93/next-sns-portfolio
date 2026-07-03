interface FeedErrorProps {
  onRetry: () => void;
}

/** Error fallback for the feed boundary, with a retry that resets the query. */
export default function FeedError({ onRetry }: FeedErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center"
    >
      <p className="text-sm text-gray-600">피드를 불러오지 못했습니다.</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        다시 시도
      </button>
    </div>
  );
}
