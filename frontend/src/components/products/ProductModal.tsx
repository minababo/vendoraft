'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  categoryId: string;
  category: { name: string };
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  product?: Product;
}

const empty = {
  name: '',
  sku: '',
  categoryId: '',
  price: '',
  costPrice: '',
  lowStockThreshold: '10',
};

export default function ProductModal({
  open,
  onClose,
  onSuccess,
  categories,
  product,
}: ProductModalProps) {
  const isEdit = !!product;

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        product
          ? {
              name: product.name,
              sku: product.sku,
              categoryId: product.categoryId,
              price: product.price,
              costPrice: product.costPrice,
              lowStockThreshold: String(product.lowStockThreshold),
            }
          : empty,
      );
    }
  }, [open, product]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      name: form.name,
      sku: form.sku,
      categoryId: form.categoryId,
      price: parseFloat(form.price),
      costPrice: parseFloat(form.costPrice),
      lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
    };

    try {
      if (isEdit) {
        await api.put(`/api/products/${product.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Product name"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">SKU</label>
            <Input
              required
              value={form.sku}
              onChange={(e) => set('sku', e.target.value)}
              placeholder="e.g. USB-001"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <Select
              required
              value={form.categoryId}
              onValueChange={(v) => set('categoryId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Price (LKR)</label>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Cost Price (LKR)</label>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Low Stock Threshold</label>
            <Input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(e) => set('lowStockThreshold', e.target.value)}
              placeholder="10"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
