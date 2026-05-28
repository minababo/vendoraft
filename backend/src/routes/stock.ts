import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const movement = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: { increment: quantity } },
    });

    return tx.stockMovement.create({
      data: { productId, quantity, type: 'IN', note: note ?? null },
    });
  });

  res.status(201).json(movement);
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

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (product.stockQty < quantity) {
    res.status(400).json({ error: 'Insufficient stock' });
    return;
  }

  const movement = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: { decrement: quantity } },
    });

    return tx.stockMovement.create({
      data: { productId, quantity, type: 'OUT', note: note ?? null },
    });
  });

  res.status(201).json(movement);
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

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const delta = newQuantity - product.stockQty;

  const movement = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: newQuantity },
    });

    return tx.stockMovement.create({
      data: {
        productId,
        quantity: Math.abs(delta),
        type: 'ADJUSTMENT',
        note: note ?? 'Stock adjustment',
      },
    });
  });

  res.status(201).json(movement);
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
