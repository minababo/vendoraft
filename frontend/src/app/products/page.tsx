'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import ProductModal from '@/components/products/ProductModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatLKR, formatQty } from '@/lib/utils/formatLKR';
import { showSuccess } from '@/lib/utils/toast';
import { Package, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useSort } from '@/lib/hooks/useSort';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  costPrice: string;
  stockQty: number;
  lowStockThreshold: number;
  lowStock: boolean;
  category: { name: string };
  categoryId: string;
}

import { MarginBadge } from '@/components/ui/MarginBadge';

const PRODUCT_HEADERS: Array<{ label: string; key?: string; mobileHidden?: boolean }> = [
  { label: 'Name',      key: 'name' },
  { label: 'SKU',       key: 'sku',      mobileHidden: true },
  { label: 'Category',                   mobileHidden: true },
  { label: 'Price',     key: 'price',    mobileHidden: true },
  { label: 'Margin',                     mobileHidden: true },
  { label: 'Stock Qty', key: 'stockQty' },
  { label: 'Status',                     mobileHidden: true },
  { label: 'Actions' },
];

export default function ProductsPage() {
  const { token } = useAuth();

  useEffect(() => { document.title = 'Products | Vendoraft'; }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Product | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/api/products');
      setProducts(res.data);
    } catch {
      setError('Failed to load products. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    async function fetchAll() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/api/products'),
          api.get('/api/categories'),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      } catch {
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [token]);

  const isFiltered = search !== '' || categoryId !== 'all';

  function clearFilters() {
    setSearch('');
    setCategoryId('all');
  }

  const { sorted: sortedProducts, sortState, handleSort } = useSort(products);

  const filtered = useMemo(() => {
    return sortedProducts.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryId === 'all' || p.categoryId === categoryId;
      return matchesSearch && matchesCategory;
    });
  }, [sortedProducts, search, categoryId]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
      showSuccess('Product deleted');
      setDeleteTarget(undefined);
      await fetchProducts();
    } catch {
      setDeleteError('Failed to delete product. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }

  function openAdd() {
    setEditingProduct(undefined);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your product catalog</p>
          </div>
          <Button onClick={openAdd}>Add Product</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-white"
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="gap-1.5 text-gray-500 hover:text-gray-800"
            >
              <X size={14} />
              Clear filters
            </Button>
          )}
        </div>

        {loading && <TableSkeleton rows={5} cols={7} />}

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                <tr>
                  {PRODUCT_HEADERS.map(({ label, key, mobileHidden }) => (
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="font-medium text-gray-500">
                        {isFiltered ? 'No products match your filters' : 'No products found'}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        {isFiltered
                          ? 'Try adjusting or clearing the filters'
                          : 'Add your first product to get started'}
                      </p>
                      {isFiltered && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                          Clear Filters
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-500">{p.sku}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-500">{p.category.name}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-700">{formatLKR(p.price)}</td>
                      <td className="hidden md:table-cell px-4 py-3 font-medium">
                        <MarginBadge price={p.price} costPrice={p.costPrice} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={p.lowStock ? 'font-semibold text-red-600' : 'text-gray-900'}>
                          {formatQty(p.stockQty)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        {p.lowStock ? (
                          <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setDeleteError(''); setDeleteTarget(p); }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchProducts}
        categories={categories}
        product={editingProduct}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(undefined); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteTarget?.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
