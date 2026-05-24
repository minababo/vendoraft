'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { name: string };
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

const emptyForm = { productId: '', quantity: '', note: '' };

export default function StockPage() {
  const { token } = useAuth();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inForm, setInForm] = useState(emptyForm);
  const [outForm, setOutForm] = useState(emptyForm);
  const [inLoading, setInLoading] = useState(false);
  const [outLoading, setOutLoading] = useState(false);
  const [inError, setInError] = useState('');
  const [outError, setOutError] = useState('');
  const [inSuccess, setInSuccess] = useState('');
  const [outSuccess, setOutSuccess] = useState('');

  const fetchMovements = useCallback(
    async (pid: string) => {
      setLoading(true);
      setError('');
      try {
        const url =
          pid === 'all'
            ? '/api/stock/movements'
            : `/api/stock/movements?productId=${pid}`;
        const res = await api.get(url);
        setMovements(res.data);
      } catch {
        setError('Failed to load stock movements. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!token) return;

    async function init() {
      try {
        const [movRes, prodRes] = await Promise.all([
          api.get('/api/stock/movements'),
          api.get('/api/products'),
        ]);
        setMovements(movRes.data);
        setProducts(prodRes.data);
      } catch {
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [token]);

  function handleProductChange(value: string) {
    setProductId(value);
    fetchMovements(value);
  }

  async function submitMovement(
    type: 'in' | 'out',
    form: typeof emptyForm,
    setForm: (f: typeof emptyForm) => void,
    setSubmitLoading: (v: boolean) => void,
    setSubmitError: (v: string) => void,
    setSubmitSuccess: (v: string) => void,
  ) {
    const qty = parseInt(form.quantity);
    if (!qty || qty < 1) {
      setSubmitError('Quantity must be at least 1.');
      return;
    }
    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      await api.post(`/api/stock/${type}`, {
        productId: form.productId,
        quantity: qty,
        note: form.note || null,
      });
      setForm(emptyForm);
      setSubmitSuccess('Stock movement recorded.');
      setTimeout(() => setSubmitSuccess(''), 3000);
      fetchMovements(productId);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Something went wrong. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>

        {/* Stock In / Out forms */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Stock In */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-green-700">
              Stock In
            </h2>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitMovement('in', inForm, setInForm, setInLoading, setInError, setInSuccess);
              }}
            >
              <Select
                required
                value={inForm.productId}
                onValueChange={(v) => setInForm((prev) => ({ ...prev, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                required
                type="number"
                min="1"
                placeholder="Quantity"
                value={inForm.quantity}
                onChange={(e) => setInForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <Input
                placeholder="Note (optional)"
                value={inForm.note}
                onChange={(e) => setInForm((prev) => ({ ...prev, note: e.target.value }))}
              />
              {inError && (
                <p className="text-sm text-destructive">{inError}</p>
              )}
              {inSuccess && (
                <p className="text-sm text-green-600">{inSuccess}</p>
              )}
              <Button type="submit" disabled={inLoading} className="w-full">
                {inLoading ? 'Recording…' : 'Record Stock In'}
              </Button>
            </form>
          </div>

          {/* Stock Out */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-red-700">
              Stock Out
            </h2>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitMovement('out', outForm, setOutForm, setOutLoading, setOutError, setOutSuccess);
              }}
            >
              <Select
                required
                value={outForm.productId}
                onValueChange={(v) => setOutForm((prev) => ({ ...prev, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                required
                type="number"
                min="1"
                placeholder="Quantity"
                value={outForm.quantity}
                onChange={(e) => setOutForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <Input
                placeholder="Note (optional)"
                value={outForm.note}
                onChange={(e) => setOutForm((prev) => ({ ...prev, note: e.target.value }))}
              />
              {outError && (
                <p className="text-sm text-destructive">{outError}</p>
              )}
              {outSuccess && (
                <p className="text-sm text-green-600">{outSuccess}</p>
              )}
              <Button type="submit" disabled={outLoading} className="w-full bg-red-600 hover:bg-red-700">
                {outLoading ? 'Recording…' : 'Record Stock Out'}
              </Button>
            </form>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Filter by product:</span>
          <Select value={productId} onValueChange={handleProductChange}>
            <SelectTrigger className="w-56 bg-white">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  {['Type', 'Product', 'Quantity', 'Note', 'Date'].map((h) => (
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
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No stock movements found.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {m.type === 'IN' ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                            OUT
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.product.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{m.quantity}</td>
                      <td className="px-4 py-3 text-gray-500">{m.note ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
