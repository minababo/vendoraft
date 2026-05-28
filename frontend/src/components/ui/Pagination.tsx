import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

function getPageNumbers(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [1];
  if (page > 3) pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    pages.push(i);
  }
  if (page < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center gap-2 pt-4">
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                p === page
                  ? 'border border-rose-200 bg-rose-50 text-rose-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <span className="text-xs text-gray-400">
        Showing {start}–{end} of {totalItems}
      </span>
    </div>
  );
}
