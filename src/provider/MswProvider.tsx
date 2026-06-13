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
 * Starts the MSW browser worker in development and gates rendering until it is
 * ready, so the first client query cannot leak to a real route before the
 * Service Worker intercepts it. In production the worker is never started.
 */
export default function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => process.env.NODE_ENV !== 'development');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

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
