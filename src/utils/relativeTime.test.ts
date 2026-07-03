import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from './relativeTime';

const NOW = Date.parse('2026-06-20T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it('1분 미만은 "방금 전"', () => {
    expect(formatRelativeTime(ago(30_000), NOW)).toBe('방금 전');
  });

  it('분 단위', () => {
    expect(formatRelativeTime(ago(5 * MINUTE), NOW)).toBe('5분 전');
  });

  it('시간 단위', () => {
    expect(formatRelativeTime(ago(3 * HOUR), NOW)).toBe('3시간 전');
  });

  it('일 단위', () => {
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe('2일 전');
  });

  it('7일 이상은 절대 날짜로 폴백', () => {
    const iso = ago(10 * DAY);
    const expected = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(iso));
    const result = formatRelativeTime(iso, NOW);
    expect(result).toBe(expected);
    expect(result).not.toMatch(/전$/);
  });

  it('잘못된 입력은 빈 문자열', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });
});
