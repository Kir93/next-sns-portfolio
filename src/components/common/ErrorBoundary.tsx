'use client';

import { Component } from 'react';

import type { ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Renders the fallback; `reset` clears the error and retries the subtree. */
  fallback: (reset: () => void) => ReactNode;
  /** Called on reset before clearing — wire to TanStack's QueryErrorResetBoundary. */
  onReset?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Minimal self-implemented error boundary (no `react-error-boundary` dependency,
 * see ADR-003/ADR-004). Catches a render error in its subtree and shows a
 * resettable fallback.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.reset);
    }
    return this.props.children;
  }
}
