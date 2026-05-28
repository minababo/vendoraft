'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { formatLKR } from '@/lib/utils/formatLKR';
import {
  Package,
  Tag,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  PackagePlus,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { KPISkeleton, TableSkeleton } from '@/components/ui/TableSkeleton';
import { formatDistanceToNow } from 'date-fns';

interface DashboardData {
  totalProducts: number;
  totalCategories: number;
  totalSalesToday: number;
  revenueToday: string;
  lowStockCount: number;
}

interface Product {
  id: string;
  name: string;
  stockQty: number;
  lowStock: boolean;
  lowStockThreshold: number;
}

interface Sale {
  id: string;
  referenceNo: string;
  totalAmount: string;
  createdAt: string;
  saleItems: unknown[];
}

function formatSaleDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  alert?: boolean;
}

function StatCard({ icon, iconBg, iconColor, label, value, alert }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-6 shadow-sm ${
        alert ? 'border-orange-200' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => { document.title = 'Dashboard | Vendoraft'; }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      try {
        const [dashRes, productsRes] = await Promise.all([
          api.get('/api/dashboard'),
          api.get('/api/products'),
        ]);
        setData(dashRes.data);
        setLowStockProducts(
          (productsRes.data as Product[]).filter((p) => p.lowStock),
        );
        setLastUpdated(new Date());
      } catch {
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }

      try {
        const salesRes = await api.get('/api/sales');
        setRecentSales((salesRes.data as Sale[]).slice(0, 5));
      } catch {
        // silently ignore
      } finally {
        setSalesLoading(false);
      }
    }

    fetchData();
  }, [token]);

  const isFirstRun =
    data !== null &&
    data.totalProducts === 0 &&
    data.totalCategories === 0 &&
    data.totalSalesToday === 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
        </div>

        {loading && <KPISkeleton />}

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && isFirstRun && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 rounded-full bg-rose-50 p-6">
              <BarChart2 className="h-12 w-12 text-rose-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Welcome to Vendoraft
            </h2>
            <p className="mb-8 max-w-sm text-sm text-gray-500">
              Get started by adding your first category and product.
              Your dashboard stats will appear here once you have data.
            </p>
            <div className="flex gap-3">
              <Link href="/categories">
                <Button variant="outline">Add a Category</Button>
              </Link>
              <Link href="/products">
                <Button>Add a Product</Button>
              </Link>
            </div>
          </div>
        )}

        {data && !isFirstRun && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <StatCard
                icon={<Package size={20} />}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
                label="Total Products"
                value={data.totalProducts}
              />
              <StatCard
                icon={<Tag size={20} />}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-500"
                label="Total Categories"
                value={data.totalCategories}
              />
              <StatCard
                icon={<ShoppingCart size={20} />}
                iconBg="bg-green-500/10"
                iconColor="text-green-500"
                label="Sales Today"
                value={data.totalSalesToday}
              />
              <StatCard
                icon={<TrendingUp size={20} />}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-500"
                label="Revenue Today"
                value={formatLKR(data.revenueToday)}
              />
              <StatCard
                icon={<AlertTriangle size={20} />}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                label="Low Stock Items"
                value={data.lowStockCount}
                alert={data.lowStockCount > 0}
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'New Sale',      href: '/sales',     Icon: ShoppingCart },
                  { label: 'Stock In',      href: '/stock',     Icon: PackagePlus  },
                  { label: 'View Reports',  href: '/reports',   Icon: BarChart2    },
                  { label: 'Add Product',   href: '/products',  Icon: Plus         },
                ].map(({ label, href, Icon }) => (
                  <Link key={href} href={href}>
                    <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-rose-200 hover:bg-rose-50 group">
                      <div className="rounded-lg bg-rose-50 p-2 transition-colors group-hover:bg-rose-100">
                        <Icon className="h-5 w-5 text-rose-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-rose-700">
                        {label}
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 text-gray-300 group-hover:text-rose-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Low stock alert */}
            {data.lowStockCount > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-orange-700">
                  <AlertTriangle size={18} />
                  <h2 className="font-semibold">Low Stock Alert</h2>
                </div>
                <ul className="space-y-2">
                  {lowStockProducts.map((p) => (
                    <li key={p.id} className="rounded-md bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-32 truncate text-sm text-gray-600">{p.name}</span>
                        <div className="flex-1 rounded-full bg-gray-100 h-2">
                          <div
                            className="bg-orange-400 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((p.stockQty / p.lowStockThreshold) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-sm font-medium text-orange-600">
                          {p.stockQty} / {p.lowStockThreshold}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Recent Sales */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Recent Sales
                </h2>
                <Link href="/sales" className="text-sm text-rose-600 hover:underline">
                  View all →
                </Link>
              </div>

              {salesLoading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Reference', 'Date', 'Items', 'Amount'].map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentSales.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                            No sales recorded yet.
                          </td>
                        </tr>
                      ) : (
                        recentSales.map((sale) => (
                          <tr key={sale.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm text-gray-500">
                              {sale.referenceNo}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatSaleDate(sale.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {sale.saleItems.length} item{sale.saleItems.length !== 1 ? 's' : ''}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {formatLKR(sale.totalAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
