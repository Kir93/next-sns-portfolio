'use client';

import { type ReactNode, useEffect, useState } from 'react';

/**
 * Cached so the worker starts exactly once even when React Strict Mode
 * double-invokes the effect in development.
 */
let workerStarted: Promise<unknown> | null = null;

function startWorkerOnce() {
  if (!workerStarted) {
    workerStarted = import('../mocks/browser')
      .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
      .then(async () => {
        // Stress mode only (`?tick=Hz`): the default URL never loads the tick engine.
        if (!new URLSearchParams(location.search).has('tick')) return;
        const { startTickEngine } = await import('../mocks/tick/applyTicks');
        startTickEngine(location.search);
      });
  }
  return workerStarted;
}

/**
 * Starts the MSW browser worker (the app's only data source — see ADR-001) and
 * gates rendering until it is ready, so the first client query cannot leak to a
 * real route before the Service Worker intercepts it. Runs in development and in
 * the deployed demo build alike, since there is no real backend. A browser that
 * cannot register Service Workers gets an explanation instead of a blank page.
 */
export default function MswProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'pending' | 'ready' | 'failed'>('pending');

  useEffect(() => {
    let active = true;
    startWorkerOnce().then(
      () => {
        if (active) setStatus('ready');
      },
      (error: unknown) => {
        console.error('[MswProvider]', error);
        if (active) setStatus('failed');
      }
    );

    return () => {
      active = false;
    };
  }, []);

  if (status === 'failed') {
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[600px] items-center p-10">
        <p role="alert" className="text-center text-sm text-gray-600">
          데모 데이터를 제공하는 Service Worker를 시작하지 못했습니다. Service Worker를 허용하는
          브라우저에서 다시 열어 주세요.
        </p>
      </main>
    );
  }
  if (status === 'pending') return null;
  return children;
}
