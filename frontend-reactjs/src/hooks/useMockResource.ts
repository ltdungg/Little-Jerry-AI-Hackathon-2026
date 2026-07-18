import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

interface UseMockResourceResult<T> {
  data: T | undefined;
  setData: Dispatch<SetStateAction<T | undefined>>;
  loading: boolean;
}

/** Same contract as useMockList but for a single resource (dashboards, detail forms). */
export function useMockResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
): UseMockResourceResult<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetcher().then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading };
}
