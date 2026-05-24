'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import SaleModal from '@/components/sales/SaleModal';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  stockQty: number;
}

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product: { name: string };
}

interface Sale {
  id: string;
  referenceNo: string;
  totalAmount: string;
  createdAt: string;
  saleItems: SaleItem[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SalesPage() {
  const { token } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      const res = await api.get('/api/sales');
      setSales(res.data);
    } catch {
      setError('Failed to load sales. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    async function init() {
      try {
        const [salesRes, productsRes] = await Promise.all([
          api.get('/api/sales'),
          api.get('/api/products'),
        ]);
        setSales(salesRes.data);
        setProducts(productsRes.data);
      } catch {
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [token]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <Button onClick={() => setModalOpen(true)}>Record Sale</Button>
        </div>

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

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Reference No', 'Date', 'Items', 'Total Amount', 'Actions'].map((h) => (
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
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No sales found.
                    </td>
                  </tr>
                ) : (
                  sales.flatMap((sale) => {
                    const isOpen = expanded.has(sale.id);
                    const itemCount = sale.saleItems.length;
                    const rows = [
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {sale.referenceNo}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          LKR {sale.totalAmount}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(sale.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                          >
                            {isOpen ? (
                              <ChevronDown size={15} />
                            ) : (
                              <ChevronRight size={15} />
                            )}
                            {isOpen ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>,
                    ];

                    if (isOpen) {
                      rows.push(
                        <tr key={`${sale.id}-details`}>
                          <td
                            colSpan={5}
                            className="border-t border-gray-100 bg-gray-50 px-8 pb-4 pt-3"
                          >
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr>
                                  {['Product Name', 'Quantity', 'Unit Price', 'Subtotal'].map(
                                    (h) => (
                                      <th
                                        key={h}
                                        className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                                      >
                                        {h}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sale.saleItems.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-2 font-medium text-gray-800">
                                      {item.product.name}
                                    </td>
                                    <td className="py-2 text-gray-600">{item.quantity}</td>
                                    <td className="py-2 text-gray-600">
                                      LKR {item.unitPrice}
                                    </td>
                                    <td className="py-2 text-gray-600">
                                      LKR {item.subtotal}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>,
                      );
                    }

                    return rows;
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchSales}
        products={products}
      />
    </AppLayout>
  );
}
