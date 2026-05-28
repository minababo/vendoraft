export function formatLKR(value: number | string): string {
  const num = Number(value);
  if (isNaN(num)) return 'LKR 0.00';
  return 'LKR ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatQty(value: number): string {
  return value.toLocaleString('en-LK');
}
