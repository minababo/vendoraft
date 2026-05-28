'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeftRight, ChevronUp, ChevronDown, ChevronsUpDown, X, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { showSuccess } from '@/lib/utils/toast';
import { formatQty } from '@/lib/utils/formatLKR';
import { useSort } from '@/lib/hooks/useSort';
import { usePagination } from '@/lib/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
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
  stockQty: number;
  lowStock: boolean;
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

const MOVEMENT_HEADERS: Array<{ label: string; key?: string; mobileHidden?: boolean }> = [
  { label: 'Type',     key: 'type' },
  { label: 'Product',  key: 'product.name' },
  { label: 'Quantity', key: 'quantity' },
  { label: 'Note',                        mobileHidden: true },
  { label: 'Date',     key: 'createdAt',  mobileHidden: true },
];

export default function StockPage() {
  const { token } = useAuth();

  useEffect(() => { document.title = 'Stock | Vendoraft'; }, []);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inForm, setInForm] = useState(emptyForm);
  const [outForm, setOutForm] = useState(emptyForm);
  const [inLoading, setInLoading] = useState(false);
  const [outLoading, setOutLoading] = useState(false);
  const [inError, setInError] = useState('');
  const [outError, setOutError] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/api/products');
      const all = res.data as Product[];
      setProducts(all);
      setLowStockProducts(all.filter((p) => p.lowStock));
    } catch {
      // silently ignore — products already loaded on init
    }
  }, []);

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

  const { sorted: sortedMovements, sortState, handleSort } = useSort(movements);

  const displayed = useMemo(() => {

    if (!search) return sortedMovements;
    const q = search.toLowerCase();
    return sortedMovements.filter(
      (m) =>
        m.product.name.toLowerCase().includes(q) ||
        (m.note ?? '').toLowerCase().includes(q),
    );
  }, [sortedMovements, search]);

  const { paginated, page, totalPages, goNext, goPrev, goTo, hasNext, hasPrev } =
    usePagination(displayed, 20);

  useEffect(() => {
    if (!token) return;

    async function init() {
      try {
        const [movRes, prodRes] = await Promise.all([
          api.get('/api/stock/movements'),
          api.get('/api/products'),
        ]);
        const all = prodRes.data as Product[];
        setMovements(movRes.data);
        setProducts(all);
        setLowStockProducts(all.filter((p) => p.lowStock));
      } catch {
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [token]);

  const isFiltered = search !== '' || productId !== 'all';

  function handleProductChange(value: string) {
    setProductId(value);
    fetchMovements(value);
  }

  function clearFilters() {
    setSearch('');
    handleProductChange('all');
  }

  async function submitMovement(
    type: 'in' | 'out',
    form: typeof emptyForm,
    setForm: (f: typeof emptyForm) => void,
    setSubmitLoading: (v: boolean) => void,
    setSubmitError: (v: string) => void,
  ) {
    const qty = parseInt(form.quantity);
    if (!qty || qty < 1) {
      setSubmitError('Quantity must be at least 1.');
      return;
    }
    setSubmitLoading(true);
    setSubmitError('');
    try {
      await api.post(`/api/stock/${type}`, {
        productId: form.productId,
        quantity: qty,
        note: form.note || null,
      });
      setForm(emptyForm);
      showSuccess('Stock movement recorded');
      fetchMovements(productId);
      fetchProducts();
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="mt-1 text-sm text-gray-500">Record stock movements and view history</p>
        </div>

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
                submitMovement('in', inForm, setInForm, setInLoading, setInError);
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
              {inError && <p className="text-sm text-destructive">{inError}</p>}
              <Button type="submit" disabled={inLoading} className="w-full bg-green-600 hover:bg-green-700">
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
                submitMovement('out', outForm, setOutForm, setOutLoading, setOutError);
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
              {outError && <p className="text-sm text-destructive">{outError}</p>}
              <Button type="submit" disabled={outLoading} className="w-full bg-red-600 hover:bg-red-700">
                {outLoading ? 'Recording…' : 'Record Stock Out'}
              </Button>
            </form>
          </div>
        </div>

        {/* Low stock alert */}
        {lowStockProducts.length > 0 && (
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
                  <span className="font-semibold text-orange-600">
                    {p.stockQty} in stock
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Input
              placeholder="Search by product name or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
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

        {loading && <TableSkeleton rows={5} cols={5} />}

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                  <tr>
                    {MOVEMENT_HEADERS.map(({ label, key, mobileHidden }) => (
                      <th
                        key={label}
                        onClick={key ? () => handleSort(key) : undefined}
                        className={`px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold ${
                          mobileHidden ? 'hidden md:table-cell' : ''
                        } ${key ? 'cursor-pointer select-none' : ''} ${
                          key && sortState.column === key && sortState.direction
                            ? 'text-rose-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {key ? (
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortState.column === key && sortState.direction ? (
                              sortState.direction === 'asc'
                                ? <ChevronUp size={13} />
                                : <ChevronDown size={13} />
                            ) : (
                              <ChevronsUpDown size={13} className="text-gray-300" />
                            )}
                          </span>
                        ) : (
                          label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                        <p className="font-medium text-gray-500">
                          {isFiltered ? 'No movements match your filters' : 'No stock movements found'}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {isFiltered
                            ? 'Try adjusting or clearing the filters'
                            : 'Record a stock in or out movement above'}
                        </p>
                        {isFiltered && (
                          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                            Clear Filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((m) => (
                      <tr key={m.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {m.type === 'IN' ? (
                            <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                              IN
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              OUT
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{m.product.name}</td>
                        <td className="px-4 py-3 text-gray-700">{formatQty(m.quantity)}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-500">{m.note ?? '—'}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-500">{formatDate(m.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
            {displayed.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onNext={goNext}
                onPrev={goPrev}
                onPageChange={goTo}
                totalItems={displayed.length}
                pageSize={20}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
