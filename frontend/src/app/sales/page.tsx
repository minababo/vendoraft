'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import SaleModal from '@/components/sales/SaleModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { formatLKR, formatQty } from '@/lib/utils/formatLKR';
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, ShoppingCart, CalendarIcon, X, Printer } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useSort } from '@/lib/hooks/useSort';
import { usePagination } from '@/lib/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { format, parseISO } from 'date-fns';

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

const CALENDAR_CLASSES = {
  weekday: 'flex-1 py-2 text-center text-xs font-medium text-gray-400',
  week: 'flex w-full',
  day: 'flex-1 aspect-square',
};

const SALE_HEADERS: Array<{ label: string; key?: string; mobileHidden?: boolean }> = [
  { label: 'Reference No', key: 'referenceNo' },
  { label: 'Date',         key: 'createdAt',   mobileHidden: true },
  { label: 'Items',                             mobileHidden: true },
  { label: 'Total Amount', key: 'totalAmount' },
  { label: 'Actions' },
];

export default function SalesPage() {
  const { token } = useAuth();

  useEffect(() => { document.title = 'Sales | Vendoraft'; }, []);

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const fromPickerRef = useRef<HTMLDivElement>(null);
  const toPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fromPickerRef.current && !fromPickerRef.current.contains(e.target as Node)) {
        setFromOpen(false);
      }
      if (toPickerRef.current && !toPickerRef.current.contains(e.target as Node)) {
        setToOpen(false);
      }
    }
    if (fromOpen || toOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fromOpen, toOpen]);

  const isFiltered = search !== '' || fromDate !== '' || toDate !== '';

  const { sorted, sortState, handleSort } = useSort(sales);

  const filtered = useMemo(() => {
    return sorted.filter((sale) => {
      if (search && !sale.referenceNo.toLowerCase().includes(search.toLowerCase())) return false;
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (new Date(sale.createdAt) < start) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(sale.createdAt) > end) return false;
      }
      return true;
    });
  }, [sorted, search, fromDate, toDate]);

  const { paginated, page, totalPages, goNext, goPrev, goTo, hasNext, hasPrev } =
    usePagination(filtered, 15);

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
  }

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

  function printReceipt(sale: Sale) {
    function esc(s: string) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const receiptDate = new Date(sale.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const total = `LKR ${parseFloat(sale.totalAmount).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
    })}`;

    const itemRows = sale.saleItems
      .map(
        (item) =>
          `<tr>
            <td>${esc(item.product.name)}</td>
            <td>${formatQty(item.quantity)}</td>
            <td>${parseFloat(item.unitPrice).toFixed(2)}</td>
            <td>${parseFloat(item.subtotal).toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${esc(sale.referenceNo)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; display: flex; justify-content: center; padding: 32px 16px; }
    .receipt { width: 100%; max-width: 400px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 22px; font-weight: bold; letter-spacing: 2px; }
    .header p { font-size: 12px; color: #666; margin-top: 4px; }
    .meta { font-size: 13px; margin-bottom: 4px; }
    .divider { border: none; border-top: 1px dashed #aaa; margin: 14px 0; }
    table { font-family: monospace; font-size: 12px; width: 100%; border-collapse: collapse; }
    th { text-align: left; padding-bottom: 6px; font-weight: bold; }
    th:not(:first-child), td:not(:first-child) { text-align: right; }
    td { padding: 3px 0; }
    .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 4px; }
    .footer { text-align: center; font-size: 12px; color: #555; margin-top: 24px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>VENDORAFT</h1>
      <p>Inventory + POS Lite</p>
    </div>
    <p class="meta">Receipt: ${esc(sale.referenceNo)}</p>
    <p class="meta">Date: ${receiptDate}</p>
    <hr class="divider" />
    <table>
      <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Sub</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <hr class="divider" />
    <p class="total">TOTAL: ${total}</p>
    <div class="footer"><p>Thank you for your business!</p></div>
  </div>
  <script>setTimeout(function(){ window.print(); }, 300);</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="mt-1 text-sm text-gray-500">Record sales and view transaction history</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>Record Sale</Button>
        </div>

        {loading && <TableSkeleton rows={5} cols={5} />}

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex flex-wrap items-end gap-3">
              <Input
                placeholder="Search by reference no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 bg-white"
              />

              {/* From date */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">From</span>
                <div ref={fromPickerRef} className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-[160px] justify-start text-left font-normal"
                    onClick={() => { setToOpen(false); setFromOpen((v) => !v); }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {fromDate
                      ? format(parseISO(fromDate), 'dd MMM yyyy')
                      : <span className="text-gray-400">Start date</span>}
                  </Button>
                  {fromOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                      <Calendar
                        mode="single"
                        selected={fromDate ? parseISO(fromDate) : undefined}
                        onSelect={(day) => {
                          if (!day) return;
                          setFromDate(format(day, 'yyyy-MM-dd'));
                          setFromOpen(false);
                        }}
                        className="w-full"
                        classNames={CALENDAR_CLASSES}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* To date */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">To</span>
                <div ref={toPickerRef} className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-[160px] justify-start text-left font-normal"
                    onClick={() => { setFromOpen(false); setToOpen((v) => !v); }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {toDate
                      ? format(parseISO(toDate), 'dd MMM yyyy')
                      : <span className="text-gray-400">End date</span>}
                  </Button>
                  {toOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                      <Calendar
                        mode="single"
                        selected={toDate ? parseISO(toDate) : undefined}
                        onSelect={(day) => {
                          if (!day) return;
                          setToDate(format(day, 'yyyy-MM-dd'));
                          setToOpen(false);
                        }}
                        className="w-full"
                        classNames={CALENDAR_CLASSES}
                      />
                    </div>
                  )}
                </div>
              </div>

              {isFiltered && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="self-end gap-1.5 text-gray-500 hover:text-gray-800"
                >
                  <X size={14} />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                  <tr>
                    {SALE_HEADERS.map(({ label, key, mobileHidden }) => (
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
                        <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                        <p className="font-medium text-gray-500">
                          {isFiltered ? 'No sales match your filters' : 'No sales found'}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {isFiltered
                            ? 'Try adjusting or clearing the filters'
                            : 'Record your first sale to get started'}
                        </p>
                        {isFiltered && (
                          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                            Clear Filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginated.flatMap((sale) => {
                      const isOpen = expanded.has(sale.id);
                      const itemCount = sale.saleItems.length;
                      const rows = [
                        <tr key={sale.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-500">
                            {sale.referenceNo}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-gray-500">
                            {formatDate(sale.createdAt)}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-gray-700">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatLKR(sale.totalAmount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleExpand(sale.id)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                              >
                                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                {isOpen ? 'Hide' : 'Details'}
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => printReceipt(sale)}
                                className="h-auto gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800"
                              >
                                <Printer size={13} />
                                Print
                              </Button>
                            </div>
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
                                      <td className="py-3 font-medium text-gray-800">
                                        {item.product.name}
                                      </td>
                                      <td className="py-3 text-gray-600">{formatQty(item.quantity)}</td>
                                      <td className="py-3 text-gray-600">
                                        {formatLKR(item.unitPrice)}
                                      </td>
                                      <td className="py-3 text-gray-600">
                                        {formatLKR(item.subtotal)}
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
            </div>
            {filtered.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onNext={goNext}
                onPrev={goPrev}
                onPageChange={goTo}
                totalItems={filtered.length}
                pageSize={15}
              />
            )}
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
