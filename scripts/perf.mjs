#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, arch, platform, release } from 'node:os';

/**
 * Single-command perf reproduction: install browser → build → measure → aggregate.
 *
 * The Playwright `perf` project owns the build (its webServer runs
 * `pnpm build && pnpm start`) and the K repetitions (PERF_REPEAT), so this runner
 * invokes it once and turns the raw per-run numbers into medians and coefficients
 * of variation. Conditions and limits live in docs/perf/methodology.md.
 */

const RESULTS_DIR = 'perf-results';
const INTERACTION_REPORT = `${RESULTS_DIR}/feed-interaction.json`;
const CONTENT_VISIBILITY_REPORT = `${RESULTS_DIR}/content-visibility.json`;
const SUMMARY_FILE = `${RESULTS_DIR}/summary.md`;

function round(value) {
  return Math.round(value * 10) / 10;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Coefficient of variation in percent — the harness's own noise floor.
 * An all-zero series returns `null`, not 0%: "never observed" must not be
 * presented as "perfectly deterministic", which is how the threshold table
 * reads a 0% metric.
 */
function coefficientOfVariation(values) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return round((Math.sqrt(variance) / Math.abs(mean)) * 100);
}

/** `null` entries mean "no data" and must not be folded in as zeros. */
function aggregate(runs, pick) {
  const values = runs.map(pick).filter((value) => value !== null && value !== undefined);
  if (values.length === 0) return { samples: 0, median: null, cv: null };
  return {
    samples: values.length,
    median: round(median(values)),
    cv: coefficientOfVariation(values)
  };
}

function formatCell(stat) {
  if (stat.samples === 0) return '데이터 없음';
  const allZero = stat.median === 0 && stat.cv === null;
  const cv = stat.cv === null ? (allZero ? '산출 불가(전 회차 0)' : '—') : `${stat.cv}%`;
  return `${stat.median} (n=${stat.samples}, CV ${cv})`;
}

/**
 * A tarball download or a shallow CI checkout may have no git metadata, and a
 * dirty tree means the numbers do not belong to the commit that labels them.
 */
function currentCommit() {
  const git = (args) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const hash = git(['rev-parse', '--short', 'HEAD']);
    return git(['status', '--porcelain']) === '' ? hash : `${hash}-dirty (미커밋 변경 포함)`;
  } catch {
    return 'unknown (git 메타데이터 없음)';
  }
}

/** Stale JSON from an earlier run must never be re-published under a new commit. */
rmSync(RESULTS_DIR, { recursive: true, force: true });

// pnpm does not run @playwright/test's postinstall (allowBuilds in
// pnpm-workspace.yaml), so a fresh clone has no browser until this runs.
console.info('▶ Playwright chromium 확인...');
execFileSync('pnpm', ['exec', 'playwright', 'install', 'chromium'], { stdio: 'inherit' });

console.info('▶ perf project 실행 (production 빌드 + 반복 측정)...');
// One failing spec must not discard the specs that did produce numbers — the
// results directory was already cleared, so throwing here would leave nothing.
let measurementError = null;
try {
  execFileSync('pnpm', ['exec', 'playwright', 'test'], {
    stdio: 'inherit',
    env: { ...process.env, PERF_RUN: '1' }
  });
} catch (error) {
  measurementError = error instanceof Error ? error.message : String(error);
  console.error('⚠ perf project 일부 실패 — 남은 결과로 요약을 작성한다.');
}

if (!existsSync(INTERACTION_REPORT)) {
  console.error(`측정 결과가 없습니다: ${INTERACTION_REPORT}`);
  process.exit(1);
}

const { runs, conditions, limits } = JSON.parse(readFileSync(INTERACTION_REPORT, 'utf8'));
const commit = currentCommit();
const [cpu] = cpus();

// 인터랙션 구간 지표가 본체다. 로드 구간은 부하 생성기 오버헤드가 인터랙션
// 수치에 섞이지 않았음을 보이는 참고 행으로만 싣는다.
const metrics = {
  'interaction p75 (ms)': aggregate(runs, (run) => run.interaction.p75),
  'interaction max (ms)': aggregate(runs, (run) => run.interaction.max),
  'interaction 관측 건수': aggregate(runs, (run) => run.interaction.count),
  'long task 총합 (ms)': aggregate(runs, (run) => run.longTask.total),
  'long task 최대 (ms)': aggregate(runs, (run) => run.longTask.max),
  'long task 건수': aggregate(runs, (run) => run.longTask.count),
  'React commit (초기 로드)': aggregate(runs, (run) => run.commits.load),
  'React commit (인터랙션)': aggregate(runs, (run) => run.commits.interaction),
  '〔참고〕 로드 구간 long task 총합 (ms)': aggregate(runs, (run) => run.loadLongTask.total),
  '〔참고〕 로드 구간 long task 건수': aggregate(runs, (run) => run.loadLongTask.count)
};

const p75Samples = runs.filter((run) => run.interaction.p75 !== null).length;

const lines = [
  '# perf 리포트',
  '',
  ...(measurementError
    ? [
        `> ⚠ **일부 spec이 실패했다** — 아래 수치는 성공한 spec만 담고 있다. (${measurementError})`,
        ''
      ]
    : []),
  `- 커밋: \`${commit}\``,
  `- 러너: ${platform()} ${release()} / ${arch()} / ${cpu?.model ?? 'unknown CPU'} × ${cpus().length}${process.env.CI ? ' (CI)' : ' (로컬)'}`,
  `- 피드 규모: 요청 ${conditions.feedSizeRequested} / 실제 서빙 ${conditions.feedSizeServed} (seed \`${conditions.feedSeed}\`)`,
  `- CPU throttle: ${conditions.cpuThrottleRate}x · 빌드: ${conditions.buildMode} · 원격 이미지: ${conditions.remoteImages}`,
  `- 반복: ${conditions.completedRuns ?? runs.length}/${conditions.repeat}회 완료 (warm-up ${conditions.warmupRuns ?? 0}회 폐기) · 회차당 좋아요 탭 ${conditions.likeTapsPerRun}회(인덱스 ${conditions.tapOffset}부터)`,
  '',
  '## 지표 (중앙값, 변동 계수)',
  '',
  '| 지표 | 값 |',
  '| --- | --- |',
  ...Object.entries(metrics).map(([name, stat]) => `| ${name} | ${formatCell(stat)} |`),
  '',
  '## 회차별 원시값',
  '',
  '| # | long task 총합 | long task 최대 | long task 건수 | interaction 관측 | interaction p75 | interaction max | 〔참고〕 로드 long task |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...runs.map(
    (run, index) =>
      `| ${index + 1} | ${run.longTask.total} | ${run.longTask.max ?? '—'} | ${run.longTask.count} | ${run.interaction.count} | ${run.interaction.p75 ?? '—'} | ${run.interaction.max ?? '—'} | ${run.loadLongTask.total} (${run.loadLongTask.count}건) |`
  ),
  '',
  '## 해석 한계',
  '',
  `- event timing 하한 ${limits.eventDurationThresholdMs}ms · 8ms 양자화 — 회차당 시도한 ${limits.attemptedInteractionsPerRun}건 중 이 하한을 넘은 것만 관측된다.`,
  `- p75는 표본 ${limits.minInteractionSample}건 이상일 때만 산출한다 (이번 실행에서 산출된 회차: ${p75Samples}/${runs.length}).`,
  `- 관측값이 ${limits.eventDurationThresholdMs}ms 하한에 몰리면 CV가 0%로 나온다. 이는 결정론이 아니라 해상도 아래라 분산이 보이지 않는다는 뜻이다.`,
  '- 절대값은 러너 환경에 종속된다. 같은 러너 안에서의 상대 비교만 유효하다.'
];

if (existsSync(CONTENT_VISIBILITY_REPORT)) {
  const cv = JSON.parse(readFileSync(CONTENT_VISIBILITY_REPORT, 'utf8'));
  lines.push(
    '',
    '## content-visibility 격리 실험 (after.md 교차 재현)',
    '',
    `- cv:auto가 생략한 layout: **${cv.skippedByContentVisibilityMs.layout} ms**`,
    `- cv:auto가 생략한 style 재계산: **${cv.skippedByContentVisibilityMs.recalcStyle} ms**`,
    '- 1회 측정, 방향 확인용. 원 실험은 비스로틀 시스템 Chrome 기준이라 절대값은 비교하지 않는다.'
  );
} else {
  lines.push(
    '',
    '## content-visibility 격리 실험',
    '',
    `- 이번 실행에서는 측정되지 않았다(${CONTENT_VISIBILITY_REPORT} 없음).`
  );
}

const summary = `${lines.join('\n')}\n`;
writeFileSync(SUMMARY_FILE, summary);

console.info(`\n${summary}`);
console.info(`요약 저장: ${SUMMARY_FILE}`);

if (measurementError) process.exit(1);
