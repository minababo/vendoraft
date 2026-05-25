'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

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
  value: string;
}

interface Valuation {
  totalValue: string;
  products: ValuationProduct[];
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const { token } = useAuth();

  const [date, setDate] = useState(todayISO());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [valLoading, setValLoading] = useState(true);
  const [valError, setValError] = useState('');

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

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

        {/* Daily Sales Report */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-gray-800">Daily Sales Report</h2>
            <input
              type="date"
              value={date}
              onChange={handleDateChange}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

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
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{report.date}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Total Sales
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {report.salesCount}
                  </p>
                </div>
                <div className="rounded-md bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Total Revenue
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    LKR {report.totalRevenue}
                  </p>
                </div>
              </div>

              {/* Sales table or empty state */}
              {report.salesCount === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  No sales recorded for this date.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Reference No', 'Items', 'Total Amount'].map((h) => (
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
                      {report.sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {sale.referenceNo}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {sale.saleItems.length}{' '}
                            {sale.saleItems.length === 1 ? 'item' : 'items'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            LKR {sale.totalAmount}
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
          <h2 className="mb-5 text-base font-semibold text-gray-800">Inventory Valuation</h2>

          {valLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

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
                  LKR {valuation.totalValue}
                </span>
              </div>

              {valuation.products.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  No products in inventory.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Product', 'Stock Qty', 'Cost Price (LKR)', 'Value (LKR)'].map((h) => (
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
                      {valuation.products.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-3 text-gray-700">{p.stockQty}</td>
                          <td className="px-4 py-3 text-gray-700">LKR {p.costPrice}</td>
                          <td className="px-4 py-3 text-gray-700">LKR {p.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
