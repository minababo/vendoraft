export function marginPct(price: string, costPrice: string): number {
  const p = Number(price);
  if (p === 0) return 0;
  return ((p - Number(costPrice)) / p) * 100;
}

export function MarginBadge({ price, costPrice }: { price: string; costPrice: string }) {
  const m = marginPct(price, costPrice);
  const colour = m >= 40 ? 'text-green-600' : m >= 20 ? 'text-yellow-600' : 'text-red-600';
  return <span className={colour}>{m.toFixed(1)}%</span>;
}
