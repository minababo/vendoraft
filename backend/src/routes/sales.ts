import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

const saleInclude = {
  saleItems: {
    include: { product: { select: { name: true } } },
  },
} as const;

const VALID_PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer'] as const;

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { items, paymentMethod, customerName } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items must be a non-empty array' });
    return;
  }

  if (paymentMethod !== undefined && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    res.status(400).json({ error: `paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` });
    return;
  }

  for (const item of items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      res.status(400).json({ error: 'Each item must have a productId and quantity > 0' });
      return;
    }
  }

  const resolvedItems: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });

    if (!product) {
      res.status(404).json({ error: `Product not found: ${item.productId}` });
      return;
    }

    if (product.stockQty < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      return;
    }

    const unitPrice = Number(product.price);
    const subtotal = unitPrice * item.quantity;

    resolvedItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal,
    });
  }

  const referenceNo = `VR-${Date.now()}`;
  const totalAmount = resolvedItems.reduce((sum, i) => sum + i.subtotal, 0);

  try {
  const sale = await prisma.$transaction(async (tx) => {
    // Re-validate stock under serializable isolation — prevents race conditions
    for (const item of resolvedItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stockQty < item.quantity) {
        throw Object.assign(
          new Error(`Insufficient stock for ${item.productName}`),
          { code: 'INSUFFICIENT_STOCK' },
        );
      }
    }

    // Explicit field whitelist — prevents mass assignment
    const createdSale = await tx.sale.create({
      data: {
        referenceNo,
        totalAmount,
        paymentMethod: paymentMethod ?? 'Cash',
        customerName: (customerName as string | undefined)?.trim() || 'Walk-in',
        saleItems: {
          create: resolvedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
        },
      },
      include: saleInclude,
    });

    for (const item of resolvedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: 'OUT',
          note: `Sale ${referenceNo}`,
        },
      });
    }

    return createdSale;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  res.status(201).json(sale);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'INSUFFICIENT_STOCK') { res.status(400).json({ error: err.message }); return; }
    if (err.code === 'P2034') { res.status(409).json({ error: 'Conflict with concurrent request, please retry.' }); return; }
    throw e;
  }
});

router.post('/:id/void', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { saleItems: true },
  });

  if (!sale) {
    res.status(404).json({ error: 'Sale not found' });
    return;
  }

  if (sale.voided) {
    res.status(400).json({ error: 'Sale is already voided' });
    return;
  }

  const updatedSale = await prisma.$transaction(async (tx) => {
    const voided = await tx.sale.update({
      where: { id },
      data: { voided: true, voidedAt: new Date() },
      include: saleInclude,
    });


    for (const item of sale.saleItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: 'VOID',
          note: `Void: ${sale.referenceNo}`,
        },
      });
    }

    return voided;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  res.status(200).json(updatedSale);
});

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const sales = await prisma.sale.findMany({
    include: saleInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json(sales);
});

export default router;
