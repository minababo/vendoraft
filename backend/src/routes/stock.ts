import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

router.post('/in', async (req: Request, res: Response): Promise<void> => {
  const { productId, quantity, note } = req.body;

  if (!productId || quantity == null) {
    res.status(400).json({ error: 'productId and quantity are required' });
    return;
  }

  if (typeof quantity !== 'number' || quantity <= 0) {
    res.status(400).json({ error: 'quantity must be a number greater than 0' });
    return;
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' });

      await tx.product.update({
        where: { id: productId },
        data: { stockQty: { increment: quantity } },
      });

      // Explicit field whitelist — prevents mass assignment
      return tx.stockMovement.create({
        data: { productId, quantity, type: 'IN', note: note ?? null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json(movement);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: err.message }); return; }
    if (err.code === 'P2034') { res.status(409).json({ error: 'Conflict with concurrent request, please retry.' }); return; }
    throw e;
  }
});

router.post('/out', async (req: Request, res: Response): Promise<void> => {
  const { productId, quantity, note } = req.body;

  if (!productId || quantity == null) {
    res.status(400).json({ error: 'productId and quantity are required' });
    return;
  }

  if (typeof quantity !== 'number' || quantity <= 0) {
    res.status(400).json({ error: 'quantity must be a number greater than 0' });
    return;
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' });
      if (product.stockQty < quantity) throw Object.assign(new Error('Insufficient stock'), { code: 'INSUFFICIENT_STOCK' });

      await tx.product.update({
        where: { id: productId },
        data: { stockQty: { decrement: quantity } },
      });

      // Explicit field whitelist — prevents mass assignment
      return tx.stockMovement.create({
        data: { productId, quantity, type: 'OUT', note: note ?? null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json(movement);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: err.message }); return; }
    if (err.code === 'INSUFFICIENT_STOCK') { res.status(400).json({ error: err.message }); return; }
    if (err.code === 'P2034') { res.status(409).json({ error: 'Conflict with concurrent request, please retry.' }); return; }
    throw e;
  }
});

router.post('/adjust', async (req: Request, res: Response): Promise<void> => {
  const { productId, newQuantity, note } = req.body;

  if (!productId) {
    res.status(400).json({ error: 'productId is required' });
    return;
  }

  if (newQuantity == null || typeof newQuantity !== 'number' || !Number.isInteger(newQuantity) || newQuantity < 0) {
    res.status(400).json({ error: 'newQuantity must be an integer >= 0' });
    return;
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' });

      const delta = newQuantity - product.stockQty;

      await tx.product.update({
        where: { id: productId },
        data: { stockQty: newQuantity },
      });

      // Explicit field whitelist — prevents mass assignment
      return tx.stockMovement.create({
        data: {
          productId,
          quantity: Math.abs(delta),
          type: 'ADJUSTMENT',
          note: note ?? 'Stock adjustment',
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json(movement);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: err.message }); return; }
    if (err.code === 'P2034') { res.status(409).json({ error: 'Conflict with concurrent request, please retry.' }); return; }
    throw e;
  }
});

router.get('/movements', async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.query;

  const movements = await prisma.stockMovement.findMany({
    where: typeof productId === 'string' && productId ? { productId } : undefined,
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json(movements);
});

export default router;
