const COL_WIDTHS = ['w-3/4', 'w-1/2', 'w-1/4', 'w-3/4', 'w-1/2'];

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-4">
      {/* Header row */}
      <div className="mb-3 flex gap-4 border-b border-gray-100 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 flex-1 animate-pulse rounded-md bg-gray-200" />
        ))}
      </div>
      {/* Data rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 animate-pulse rounded-md bg-gray-100 ${COL_WIDTHS[(r + c) % COL_WIDTHS.length]}`}
                style={{ flex: '1' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const heights = ['h-16', 'h-24', 'h-20', 'h-32', 'h-12', 'h-28', 'h-20'];
  return (
    <div className="flex items-end gap-3 px-2 pb-2" style={{ height: 200 }}>
      {heights.map((h, i) => (
        <div key={i} className={`flex-1 animate-pulse rounded-t-md bg-gray-100 ${h}`} />
      ))}
    </div>
  );
}
