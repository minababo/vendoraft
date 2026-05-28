'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { formatLKR, formatQty } from '@/lib/utils/formatLKR';
import { ShoppingCart, Package, CalendarIcon, ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';
import { TableSkeleton, ChartSkeleton } from '@/components/ui/TableSkeleton';
import { useSort } from '@/lib/hooks/useSort';
import { downloadCSV } from '@/lib/utils/exportCSV';
import { Button } from '@/components/ui/button';
import { MarginBadge } from '@/components/ui/MarginBadge';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface ChartDay {
  date: string;
  revenue: number;
}

interface CategoryStat {
  name: string;
  totalRevenue: number;
  itemsSold: number;
}

interface DailySale {
  id: string;
  referenceNo: string;
  totalAmount: string;
  saleItems: { id: string }[];
}

interface DailyReport {
  date: string;
  salesCount: number;
  totalRevenue: string;
  sales: DailySale[];
}

interface ValuationProduct {
  id: string;
  name: string;
  stockQty: number;
  costPrice: string;
  price: string;
  value: string;
}

interface Valuation {
  totalValue: string;
  products: ValuationProduct[];
}

const DAILY_SALE_HEADERS: Array<{ label: string; key?: string }> = [
  { label: 'Reference No', key: 'referenceNo' },
  { label: 'Items' },
  { label: 'Total Amount', key: 'totalAmount' },
];

const VALUATION_HEADERS: Array<{ label: string; key?: string }> = [
  { label: 'Product', key: 'name' },
  { label: 'Stock Qty', key: 'stockQty' },
  { label: 'Cost Price (LKR)', key: 'costPrice' },
  { label: 'Value (LKR)', key: 'value' },
  { label: 'Margin' },
];


function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function SortableHeader({
  label,
  sortKey,
  sortState,
  onSort,
}: {
  label: string;
  sortKey?: string;
  sortState: { column: string; direction: 'asc' | 'desc' | null };
  onSort: (key: string) => void;
}) {
  const active = !!sortKey && sortState.column === sortKey && !!sortState.direction;
  return (
    <th
      onClick={sortKey ? () => onSort(sortKey) : undefined}
      className={`px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold ${
        sortKey ? 'cursor-pointer select-none' : ''
      } ${active ? 'text-rose-600' : 'text-gray-500'}`}
    >
      {sortKey ? (
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (
            sortState.direction === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
          ) : (
            <ChevronsUpDown size={13} className="text-gray-300" />
          )}
        </span>
      ) : (
        label
      )}
    </th>
  );
}

export default function ReportsPage() {
  const { token } = useAuth();

  const [date, setDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = 'Reports | Vendoraft'; }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarOpen]);

  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [valLoading, setValLoading] = useState(true);
  const [valError, setValError] = useState('');

  const [chartData, setChartData] = useState<ChartDay[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const [categorySales, setCategorySales] = useState<CategoryStat[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState('');

  // Sort state for each table — called unconditionally at the top level
  const { sorted: sortedSales, sortState: salesSort, handleSort: handleSalesSort } = useSort<DailySale>(report?.sales ?? []);
  const { sorted: sortedValProducts, sortState: valSort, handleSort: handleValSort } = useSort<ValuationProduct>(valuation?.products ?? []);

  const fetchReport = useCallback(async (d: string) => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await api.get(`/api/reports/daily?date=${d}`);
      setReport(res.data);
    } catch {
      setError('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchReport(date);
  }, [token, date, fetchReport]);

  useEffect(() => {
    if (!token) return;
    setValLoading(true);
    setValError('');
    api.get('/api/reports/valuation')
      .then((res) => setValuation(res.data))
      .catch(() => setValError('Failed to load inventory valuation. Please try again.'))
      .finally(() => setValLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    async function fetchWeekChart() {
      const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days: { iso: string; label: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
          iso: d.toISOString().slice(0, 10),
          label: DAY_ABBR[d.getDay()],
        });
      }

      try {
        const results = await Promise.all(
          days.map((d) => api.get(`/api/reports/daily?date=${d.iso}`)),
        );
        setChartData(
          results.map((res, idx) => ({
            date: days[idx].label,
            revenue: parseFloat(res.data.totalRevenue) || 0,
          })),
        );
      } catch {
        // chart is non-critical — silently leave empty
      } finally {
        setChartLoading(false);
      }
    }

    fetchWeekChart();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    async function fetchCategoryStats() {
      setCatLoading(true);
      setCatError('');
      try {
        const [salesRes, productsRes] = await Promise.all([
          api.get('/api/sales'),
          api.get('/api/products'),
        ]);

        const sales = salesRes.data as Array<{
          voided: boolean;
          saleItems: Array<{ productId: string; quantity: number; subtotal: string }>;
        }>;

        const products = productsRes.data as Array<{
          id: string;
          category: { name: string };
        }>;

        const catMap = new Map(products.map((p) => [p.id, p.category.name]));
        const stats: Record<string, CategoryStat> = {};

        for (const sale of sales) {
          if (sale.voided) continue;
          for (const item of sale.saleItems) {
            const name = catMap.get(item.productId) ?? 'Uncategorized';
            if (!stats[name]) stats[name] = { name, totalRevenue: 0, itemsSold: 0 };
            stats[name].totalRevenue += Number(item.subtotal);
            stats[name].itemsSold += item.quantity;
          }
        }

        setCategorySales(
          Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue),
        );
      } catch {
        setCatError('Failed to load category sales data. Please try again.');
      } finally {
        setCatLoading(false);
      }
    }

    fetchCategoryStats();
  }, [token]);

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    setDate(format(day, 'yyyy-MM-dd'));
    setCalendarOpen(false);
  }

  function handleDailySalesCSV() {
    if (!report) return;
    downloadCSV(`vendoraft-sales-${date}.csv`, [
      ['Reference No', 'Date', 'Items', 'Total Amount (LKR)'],
      ...report.sales.map((sale) => [
        sale.referenceNo,
        report.date,
        String(sale.saleItems.length),
        sale.totalAmount,
      ]),
    ]);
  }

  function handleValuationCSV() {
    if (!valuation) return;
    downloadCSV(`vendoraft-valuation-${todayISO()}.csv`, [
      ['Product', 'Stock Qty', 'Cost Price (LKR)', 'Value (LKR)'],
      ...valuation.products.map((p) => [
        p.name,
        String(p.stockQty),
        p.costPrice,
        p.value,
      ]),
    ]);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Daily sales summaries and inventory valuation</p>
        </div>

        {/* Revenue — Last 7 Days */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-800">Revenue — Last 7 Days</h2>

          {chartLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="35%">
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v: number) =>
                    v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  formatter={(value) => [formatLKR(Number(value)), 'Revenue']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="revenue" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily Sales Report */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-800">Daily Sales Report</h2>
              {!loading && !error && report && report.salesCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleDailySalesCSV}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download CSV
                </Button>
              )}
            </div>
            <div ref={pickerRef} className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
                onClick={() => setCalendarOpen((v) => !v)}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                {format(parseISO(date), 'dd MMM yyyy')}
              </Button>
              {calendarOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={parseISO(date)}
                    onSelect={handleDaySelect}
                    className="w-full"
                    classNames={{
                      weekday: 'flex-1 py-2 text-center text-xs font-medium text-gray-400',
                      week: 'flex w-full',
                      day: 'flex-1 aspect-square',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {loading && <TableSkeleton rows={4} cols={3} />}

          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && report && (
            <div className="space-y-5">
              {/* Summary row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-md bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Date</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{report.date}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Total Sales
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{report.salesCount}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Total Revenue
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {formatLKR(report.totalRevenue)}
                  </p>
                </div>
              </div>

              {/* Sales table or empty state */}
              {report.salesCount === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="font-medium text-gray-500">No sales on this date</p>
                  <p className="mt-1 text-sm text-gray-400">Try selecting a different date</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                      <tr>
                        {DAILY_SALE_HEADERS.map(({ label, key }) => (
                          <SortableHeader
                            key={label}
                            label={label}
                            sortKey={key}
                            sortState={salesSort}
                            onSort={handleSalesSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedSales.map((sale) => (
                        <tr key={sale.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-500">
                            {sale.referenceNo}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {sale.saleItems.length}{' '}
                            {sale.saleItems.length === 1 ? 'item' : 'items'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatLKR(sale.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inventory Valuation */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Inventory Valuation</h2>
            {!valLoading && !valError && valuation && valuation.products.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleValuationCSV}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download CSV
              </Button>
            )}
          </div>

          {valLoading && <TableSkeleton rows={4} cols={5} />}

          {valError && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {valError}
            </div>
          )}

          {!valLoading && !valError && valuation && (
            <div className="space-y-5">
              <div className="rounded-md bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-500">Total Inventory Value:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {formatLKR(valuation.totalValue)}
                </span>
              </div>

              {valuation.products.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="font-medium text-gray-500">No products in inventory</p>
                  <p className="mt-1 text-sm text-gray-400">Add products to see valuation</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                      <tr>
                        {VALUATION_HEADERS.map(({ label, key }) => (
                          <SortableHeader
                            key={label}
                            label={label}
                            sortKey={key}
                            sortState={valSort}
                            onSort={handleValSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedValProducts.map((p) => (
                        <tr key={p.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-3 text-gray-700">{formatQty(p.stockQty)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatLKR(p.costPrice)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatLKR(p.value)}</td>
                          <td className="px-4 py-3 font-medium">
                            <MarginBadge price={p.price} costPrice={p.costPrice} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Sales by Category */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-800">Sales by Category</h2>

          {catLoading && <TableSkeleton rows={4} cols={3} />}

          {catError && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {catError}
            </div>
          )}

          {!catLoading && !catError && (
            categorySales.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No sales data available.</p>
            ) : (
              <div className="space-y-6">
                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        {['Category', 'Items Sold', 'Total Revenue'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categorySales.map((cat) => (
                        <tr key={cat.name} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                          <td className="px-4 py-3 text-gray-700">{formatQty(cat.itemsSold)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatLKR(cat.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Horizontal bar chart */}
                <ResponsiveContainer width="100%" height={Math.max(200, categorySales.length * 48)}>
                  <BarChart
                    layout="vertical"
                    data={categorySales}
                    margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v: number) =>
                        v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6' }}
                      formatter={(value) => [formatLKR(Number(value)), 'Revenue']}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Bar dataKey="totalRevenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
}
