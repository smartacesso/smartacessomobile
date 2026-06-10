import { ApiError, PaginatedResponse } from '@/lib/apiService';
import { useCallback, useEffect, useRef, useState } from 'react';

type LoadMode = 'initial' | 'more' | 'refresh';

export function usePaginatedList<T>(options: {
  enabled: boolean;
  resetKey: string;
  fetchPage: (pagina: number) => Promise<PaginatedResponse<T>>;
  onUnauthorized?: (error: ApiError) => void;
}) {
  const { enabled, resetKey, fetchPage, onUnauthorized } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const currentPageRef = useRef(0);
  const busyRef = useRef(false);
  const fetchPageRef = useRef(fetchPage);
  const lastLoadMorePageRef = useRef(-1);

  fetchPageRef.current = fetchPage;

  const applyPage = useCallback((page: PaginatedResponse<T>, append: boolean) => {
    setItems((prev) => (append ? [...prev, ...page.content] : page.content));
    setHasMore(page.hasMore && page.content.length > 0);
    currentPageRef.current = page.pagina;
    setLoadError(false);
  }, []);

  const load = useCallback(
    async (pagina: number, mode: LoadMode) => {
      if (!enabled || busyRef.current) return;

      busyRef.current = true;

      if (mode === 'initial') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);

      try {
        const page = await fetchPageRef.current(pagina);
        applyPage(page, mode === 'more');
      } catch (error) {
        if (mode !== 'more') {
          setLoadError(true);
        }

        if (error instanceof ApiError && error.isUnauthorized) {
          onUnauthorized?.(error);
        } else {
          throw error;
        }
      } finally {
        busyRef.current = false;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [enabled, applyPage, onUnauthorized]
  );

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setHasMore(false);
      return;
    }

    currentPageRef.current = 0;
    lastLoadMorePageRef.current = -1;
    setHasMore(false);
    setLoadError(false);
    setItems([]);

    load(0, 'initial').catch(() => {
      /* erro tratado no estado loadError */
    });
  }, [enabled, resetKey, load]);

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || busyRef.current || loadingMore || loading) return;

    const nextPage = currentPageRef.current + 1;
    if (lastLoadMorePageRef.current === nextPage) return;

    lastLoadMorePageRef.current = nextPage;
    load(nextPage, 'more')
      .catch(() => {
        lastLoadMorePageRef.current = -1;
      });
  }, [enabled, hasMore, loadingMore, loading, load]);

  const refresh = useCallback(() => {
    currentPageRef.current = 0;
    lastLoadMorePageRef.current = -1;
    return load(0, 'refresh');
  }, [load]);

  const replaceItems = useCallback((next: T[]) => {
    setItems(next);
  }, []);

  return {
    items,
    setItems: replaceItems,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    loadError,
    loadMore,
    refresh,
  };
}
