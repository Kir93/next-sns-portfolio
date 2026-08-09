import { defineConfig, devices } from '@playwright/test';

/**
 * Two run shapes share this config:
 * - default — `pnpm dev` on :3000 for the behavioral specs in `e2e/`.
 * - `PERF_RUN=1` (what `pnpm perf` sets) — a production build on :3001 for `e2e/perf/`,
 *   single-worker so the measurement does not compete with a parallel test for CPU.
 *
 * MSW serves the data in both shapes: the browser worker starts in every environment
 * (`src/provider/MswProvider.tsx`), not only in development.
 */
const isPerfRun = process.env.PERF_RUN === '1';
const PERF_PORT = 3001;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isPerfRun,
  forbidOnly: Boolean(process.env.CI),
  retries: !isPerfRun && process.env.CI ? 2 : 0,
  workers: isPerfRun ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: isPerfRun ? `http://localhost:${PERF_PORT}` : 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: isPerfRun
    ? [{ name: 'perf', testDir: './e2e/perf', use: { ...devices['Pixel 5'] } }]
    : [{ name: 'mobile', testIgnore: 'perf/**', use: { ...devices['Pixel 5'] } }],
  webServer: isPerfRun
    ? {
        command: `pnpm build && pnpm start --port ${PERF_PORT}`,
        url: `http://localhost:${PERF_PORT}`,
        reuseExistingServer: false,
        timeout: 300_000
      }
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
});
