'use client';

import { useEffect, useRef } from 'react';

interface Options {
  enabled?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Observes a single sentinel element and runs `onIntersect` when it enters the
 * viewport. The latest callback is held in a ref so the observer instance stays
 * stable, and the observer is disconnected on cleanup (no leak).
 */
export function useIntersectionObserver<T extends Element>(
  onIntersect: () => void,
  { enabled = true, rootMargin = '0px', threshold = 0 }: Options = {}
) {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(onIntersect);

  useEffect(() => {
    callbackRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold]);

  return ref;
}
