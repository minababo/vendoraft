'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { showSuccess } from '@/lib/utils/toast';
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

interface Product {
  id: string;
  name: string;
  price: string;
  stockQty: number;
}

interface AddedItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

interface SaleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
}

export default function SaleModal({ open, onClose, onSuccess, products }: SaleModalProps) {
  const [items, setItems] = useState<AddedItem[]>([]);
  const [stagingProductId, setStagingProductId] = useState('');
  const [stagingQty, setStagingQty] = useState('1');
  const [stagingError, setStagingError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setItems([]);
      setStagingProductId('');
      setStagingQty('1');
      setStagingError('');
      setSubmitError('');
    }
  }, [open]);

  const runningTotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  function handleAddItem() {
    setStagingError('');
    const qty = parseInt(stagingQty);

    if (!stagingProductId) {
      setStagingError('Select a product.');
      return;
    }
    if (!qty || qty < 1) {
      setStagingError('Quantity must be at least 1.');
      return;
    }

    const product = products.find((p) => p.id === stagingProductId);
    if (!product) return;

    const existing = items.findIndex((i) => i.productId === stagingProductId);
    if (existing !== -1) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existing ? { ...item, quantity: item.quantity + qty } : item,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: parseFloat(product.price),
          quantity: qty,
        },
      ]);
    }

    setStagingProductId('');
    setStagingQty('1');
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (items.length === 0) {
      setSubmitError('Add at least one item before submitting.');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post('/api/sales', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      showSuccess('Sale recorded successfully');
      onSuccess();
      onClose();
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Added items list */}
          {items.length > 0 ? (
            <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{item.productName}</span>
                    <span className="ml-2 text-gray-500">
                      × {item.quantity} @ LKR {item.unitPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-700">
                      LKR {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-lg leading-none text-gray-400 hover:text-destructive"
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              No items added yet.
            </p>
          )}

          {/* Running total */}
          {items.length > 0 && (
            <div className="flex justify-end text-sm">
              <span className="text-gray-500">Total:</span>
              <span className="ml-2 font-semibold text-gray-900">
                LKR {runningTotal.toFixed(2)}
              </span>
            </div>
          )}

          {/* Staging row */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select
                value={stagingProductId}
                onValueChange={(v) => { setStagingProductId(v); setStagingError(''); }}
              >
                <SelectTrigger className="flex-1">
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
                type="number"
                min="1"
                placeholder="Qty"
                value={stagingQty}
                onChange={(e) => { setStagingQty(e.target.value); setStagingError(''); }}
                className="w-20"
              />

              <Button type="button" variant="outline" onClick={handleAddItem}>
                Add Item
              </Button>
            </div>

            {stagingError && (
              <p className="text-sm text-destructive">{stagingError}</p>
            )}
          </div>

          {submitError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitLoading}>
              {submitLoading ? 'Recording…' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
