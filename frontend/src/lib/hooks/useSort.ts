import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string;
  direction: SortDirection;
}

function getValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function useSort<T>(data: T[]) {
  const [sortState, setSortState] = useState<SortState>({ column: '', direction: null });

  function handleSort(column: string) {
    setSortState((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return { column: '', direction: null };
    });
  }

  const sorted = useMemo(() => {
    if (!sortState.column || sortState.direction === null) return data;

    return [...data].sort((a, b) => {
      const aVal = getValue(a, sortState.column);
      const bVal = getValue(b, sortState.column);

      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        const aStr = String(aVal ?? '');
        const bStr = String(bVal ?? '');
        const aNum = parseFloat(aStr);
        const bNum = parseFloat(bStr);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          cmp = aNum - bNum;
        } else {
          cmp = aStr.localeCompare(bStr);
        }
      }

      return sortState.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sortState]);

  return { sorted, sortState, handleSort };
}
