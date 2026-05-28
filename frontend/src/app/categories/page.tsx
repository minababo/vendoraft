'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import CategoryModal from '@/components/categories/CategoryModal';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/lib/utils/toast';
import { Tag, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useSort } from '@/lib/hooks/useSort';
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
  createdAt: string;
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

const CATEGORY_HEADERS: Array<{ label: string; key?: string; mobileHidden?: boolean }> = [
  { label: 'Name',       key: 'name' },
  { label: 'Created At', key: 'createdAt', mobileHidden: true },
  { label: 'Actions' },
];

export default function CategoriesPage() {
  const { token } = useAuth();

  useEffect(() => { document.title = 'Categories | Vendoraft'; }, []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Category | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/api/categories');
      setCategories(res.data);
    } catch {
      setError('Failed to load categories. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    async function init() {
      try {
        const res = await api.get('/api/categories');
        setCategories(res.data);
      } catch {
        setError('Failed to load categories. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [token]);

  const { sorted: sortedCategories, sortState, handleSort } = useSort(categories);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/api/categories/${deleteTarget.id}`);
      showSuccess('Category deleted');
      setDeleteTarget(undefined);
      await fetchCategories();
    } catch {
      setDeleteError('Failed to delete category. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }

  function openAdd() {
    setEditingCategory(undefined);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setModalOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-500">Organise products into categories</p>
          </div>
          <Button onClick={openAdd}>Add Category</Button>
        </div>

        {loading && <TableSkeleton rows={5} cols={3} />}

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
                  {CATEGORY_HEADERS.map(({ label, key, mobileHidden }) => (
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
                {sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <Tag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="font-medium text-gray-500">No categories found</p>
                      <p className="mt-1 text-sm text-gray-400">
                        Create a category to organise your products
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedCategories.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setDeleteError(''); setDeleteTarget(c); }}
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

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchCategories}
        category={editingCategory}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(undefined); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
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
