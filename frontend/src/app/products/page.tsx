'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import ProductModal from '@/components/products/ProductModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function ProductsPage() {
  const { token } = useAuth();

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
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

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryId === 'all' || p.categoryId === categoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <Button onClick={openAdd}>Add Product</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
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
                  {['Name', 'SKU', 'Category', 'Price', 'Stock Qty', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                      <td className="px-4 py-3 text-gray-700">LKR {p.price}</td>
                      <td className="px-4 py-3 text-gray-700">{p.stockQty}</td>
                      <td className="px-4 py-3">
                        {p.lowStock ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
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
