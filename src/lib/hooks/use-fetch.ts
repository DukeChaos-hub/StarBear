'use client';

import { useCallback, useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Manually re-trigger the fetch (e.g. after a mutation). */
  refresh: () => void;
}

/**
 * Minimal GET hook. Treats the response as JSON.
 *
 * Pass `null` for `url` to skip the fetch (handy for "depends on a
 * selected id" patterns: the parent only fetches when an id is picked).
 */
export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  // Bump to force a refetch on demand.
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  useEffect(() => {
    if (url === null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          let body: { error?: string; message?: string } = {};
          try {
            body = (await r.json()) as typeof body;
          } catch {
            /* ignore */
          }
          throw new Error(`${r.status} ${body.error ?? r.statusText}`);
        }
        return (await r.json()) as T;
      })
      .then((d) => {
        if (!ac.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError' || ac.signal.aborted) return;
        setError(e.message);
        setLoading(false);
      });
    return () => ac.abort();
  }, [url, refreshTick]);

  return { data, error, loading, refresh };
}

interface ApiCallState {
  busy: boolean;
  error: string | null;
}

interface CallOptions {
  /** Override the URL for this single call. */
  url?: string;
  /** Override the HTTP method. */
  method?: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  /** Optional body; when present and method != DELETE, sent as JSON. */
  body?: unknown;
}

/**
 * Helper hook for POST / PATCH / DELETE actions. `call(opts?)` hits the
 * bound URL (or the URL passed in `opts.url`) and returns the parsed JSON
 * response, or `null` on failure. Errors are mirrored into `state.error`
 * for inline display.
 *
 * Use `call({ url: '/foo', method: 'POST' })` when the same hook is
 * reused across multiple endpoints (e.g. the same component that
 * activates, renames, and deletes an env).
 */
export function useApiCall(url: string, method: 'POST' | 'PATCH' | 'DELETE' = 'POST') {
  const [state, setState] = useState<ApiCallState>({ busy: false, error: null });

  const call = useCallback(
    async (opts: CallOptions = {}): Promise<unknown | null> => {
      const target = opts.url ?? url;
      const m = opts.method ?? method;
      const body = opts.body;
      setState({ busy: true, error: null });
      try {
        const res = await fetch(target, {
          method: m,
          headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          let j: { error?: string; message?: string; hint?: string } = {};
          try {
            j = (await res.json()) as typeof j;
          } catch {
            /* ignore */
          }
          throw new Error(
            `${res.status} ${j.error ?? res.statusText}${j.message ? `: ${j.message}` : ''}`,
          );
        }
        const text = await res.text();
        setState({ busy: false, error: null });
        return text.length > 0 ? JSON.parse(text) : null;
      } catch (e) {
        setState({ busy: false, error: (e as Error).message });
        return null;
      }
    },
    [url, method],
  );

  return { ...state, call };
}
