const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'always' });

/** Absolute fallback for old posts. No timeZone → renders in the viewer's local time. */
const absoluteFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Korean relative time for an ISO timestamp ("방금 전" / "N분 전" / "N시간 전" /
 * "N일 전"), falling back to an absolute local date once the post is a week old.
 * `now` is injectable for deterministic tests.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diff = now - then;
  if (diff < MINUTE) return '방금 전';
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour');
  if (diff < WEEK) return rtf.format(-Math.floor(diff / DAY), 'day');
  return absoluteFormatter.format(then);
}
