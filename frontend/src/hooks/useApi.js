import { useCallback, useEffect, useState } from 'react';

/**
 * Runs loader(signal) on mount and whenever deps change (or reload() is called).
 * Keeps the previous data on screen while a reload is in flight and aborts stale requests.
 */
export function useApi(loader, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    loader(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        setState((s) => ({ data: s.data, error, loading: false }));
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
