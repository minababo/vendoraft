import { useState, useEffect } from 'react';

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginated = items.slice((page - 1) * pageSize, page * pageSize);
  const goNext = () => setPage((p) => Math.min(p + 1, totalPages));
  const goPrev = () => setPage((p) => Math.max(p - 1, 1));
  const goTo = (n: number) => setPage(Math.max(1, Math.min(n, totalPages)));
  const reset = () => setPage(1);

  return {
    paginated,
    page,
    totalPages,
    goNext,
    goPrev,
    goTo,
    reset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
