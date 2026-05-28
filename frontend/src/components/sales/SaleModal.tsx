'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { showSuccess } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown } from 'lucide-react';
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
  sku: string;
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
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const comboboxRef = useRef<HTMLDivElement>(null);
  const commandContainerRef = useRef<HTMLDivElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef('');

  useEffect(() => {
    if (open) {
      setItems([]);
      setStagingProductId('');
      setStagingQty('1');
      setStagingError('');
      setSubmitError('');
      setCustomerName('');
      setPaymentMethod('Cash');
      setComboboxOpen(false);
    }
  }, [open]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!comboboxOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboboxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [comboboxOpen]);

  // Focus CommandInput when dropdown opens
  useEffect(() => {
    if (comboboxOpen) {
      requestAnimationFrame(() => {
        const input = commandContainerRef.current?.querySelector<HTMLInputElement>('[cmdk-input]');
        input?.focus();
      });
    }
  }, [comboboxOpen]);

  const runningTotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  function selectProduct(id: string) {
    setStagingProductId(id);
    setStagingError('');
    setComboboxOpen(false);
    requestAnimationFrame(() => qtyRef.current?.focus());
  }

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
    setComboboxOpen(true);
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
        customerName: customerName.trim() || 'Walk-in',
        paymentMethod,
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

  const selectedProduct = products.find((p) => p.id === stagingProductId);

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

          {/* Customer name + payment method */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Customer Name</label>
              <Input
                placeholder="Walk-in"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="w-40 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
              {/* Inline combobox — rendered inside Dialog DOM to avoid focus-trap conflicts */}
              <div ref={comboboxRef} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setComboboxOpen((prev) => !prev)}
                  className={cn(
                    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background',
                    'hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring',
                    !selectedProduct && 'text-muted-foreground',
                  )}
                  aria-expanded={comboboxOpen}
                >
                  <span className="truncate">
                    {selectedProduct ? selectedProduct.name : 'Select product...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {comboboxOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
                    <div ref={commandContainerRef}>
                      <Command>
                        <CommandInput
                          placeholder="Search product or scan barcode..."
                          onValueChange={(v) => { searchRef.current = v; }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const match = products.find(
                                (p) =>
                                  p.sku.toLowerCase() === searchRef.current.toLowerCase() &&
                                  p.stockQty > 0,
                              );
                              if (match) {
                                e.preventDefault();
                                selectProduct(match.id);
                              }
                            }
                          }}
                        />
                        <CommandList className="max-h-52">
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.name} ${p.sku}`}
                                disabled={p.stockQty === 0}
                                onSelect={() => {
                                  if (p.stockQty === 0) return;
                                  selectProduct(p.id);
                                }}
                                className={cn(p.stockQty === 0 && 'opacity-40 cursor-not-allowed')}
                              >
                                <span className="flex-1 truncate">{p.name}</span>
                                <span className="ml-2 shrink-0 text-xs text-gray-400">{p.sku}</span>
                                <span
                                  className={cn(
                                    'ml-2 shrink-0 text-xs',
                                    p.stockQty === 0 ? 'text-red-400' : 'text-gray-400',
                                  )}
                                >
                                  {p.stockQty === 0 ? 'Out of stock' : `${p.stockQty} in stock`}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  </div>
                )}
              </div>

              <Input
                ref={qtyRef}
                type="number"
                min="1"
                placeholder="Qty"
                value={stagingQty}
                onChange={(e) => { setStagingQty(e.target.value); setStagingError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
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
