'use client';

import { type ReactNode, useEffect, useState } from 'react';

/**
 * Cached so the worker starts exactly once even when React Strict Mode
 * double-invokes the effect in development.
 */
let workerStarted: Promise<unknown> | null = null;

function startWorkerOnce() {
  if (!workerStarted) {
    workerStarted = import('../mocks/browser').then(({ worker }) =>
      worker.start({ onUnhandledRequest: 'bypass' })
    );
  }
  return workerStarted;
}

/**
 * Starts the MSW browser worker (the app's only data source — see ADR-001) and
 * gates rendering until it is ready, so the first client query cannot leak to a
 * real route before the Service Worker intercepts it. Runs in development and in
 * the deployed demo build alike, since there is no real backend.
 */
export default function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void startWorkerOnce().then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  return children;
}
