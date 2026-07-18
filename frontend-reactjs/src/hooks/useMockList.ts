import { useEffect, useState, useCallback, type Dispatch, type SetStateAction } from 'react';

interface UseMockListResult<T> {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  loading: boolean;
  refresh: () => void;
}

/**
 * Loads a list from a mock service function and keeps an editable local
 * copy so pages can apply optimistic updates. `deps` re-triggers the fetch
 * (e.g. when a filter changes) without resetting `loading` after first
 * load — acceptable since mock latency is a few hundred ms.
 */
export function useMockList<T>(
  fetcher: () => Promise<T[]>,
  deps: React.DependencyList,
): UseMockListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetcher().then((result) => {
      if (!cancelled) {
        setItems(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return { items, setItems, loading, refresh };
}
