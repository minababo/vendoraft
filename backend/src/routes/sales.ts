import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

const saleInclude = {
  saleItems: {
    include: { product: { select: { name: true } } },
  },
} as const;

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items must be a non-empty array' });
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

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        referenceNo,
        totalAmount,
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
  });

  res.status(201).json(sale);
});

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const sales = await prisma.sale.findMany({
    include: saleInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json(sales);
});

export default router;
