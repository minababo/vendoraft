'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import {
  Package,
  Tag,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

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
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  alert?: boolean;
}

function StatCard({ icon, label, value, alert }: StatCardProps) {
  return (
    <div className={`rounded-lg border bg-white p-6 shadow-sm ${alert ? 'border-orange-300' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${alert ? 'text-orange-600' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        <div className={`rounded-full p-3 ${alert ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } catch {
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                icon={<Package size={20} />}
                label="Total Products"
                value={data.totalProducts}
              />
              <StatCard
                icon={<Tag size={20} />}
                label="Total Categories"
                value={data.totalCategories}
              />
              <StatCard
                icon={<ShoppingCart size={20} />}
                label="Sales Today"
                value={data.totalSalesToday}
              />
              <StatCard
                icon={<DollarSign size={20} />}
                label="Revenue Today"
                value={`LKR ${data.revenueToday}`}
              />
              <StatCard
                icon={<AlertTriangle size={20} />}
                label="Low Stock Items"
                value={data.lowStockCount}
                alert={data.lowStockCount > 0}
              />
            </div>

            {/* Low stock alert */}
            {data.lowStockCount > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-orange-700">
                  <AlertTriangle size={18} />
                  <h2 className="font-semibold">Low Stock Alert</h2>
                </div>
                <ul className="space-y-1">
                  {lowStockProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md bg-white px-4 py-2 text-sm shadow-sm"
                    >
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="text-orange-600 font-semibold">
                        {p.stockQty} in stock
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
