import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

router.get('/daily', async (req: Request, res: Response): Promise<void> => {
  const dateParam =
    typeof req.query.date === 'string' && req.query.date
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

  const start = new Date(`${dateParam}T00:00:00.000Z`);
  const end = new Date(`${dateParam}T23:59:59.999Z`);

  if (isNaN(start.getTime())) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: {
      saleItems: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = sales
    .reduce((sum, s) => sum + Number(s.totalAmount), 0)
    .toFixed(2);

  res.status(200).json({
    date: dateParam,
    salesCount: sales.length,
    totalRevenue,
    sales,
  });
});

router.get('/valuation', async (_req: Request, res: Response): Promise<void> => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, stockQty: true, costPrice: true, price: true },
    orderBy: { name: 'asc' },
  });

  const valued = products.map((p) => {
    const value = (p.stockQty * Number(p.costPrice)).toFixed(2);
    return { id: p.id, name: p.name, stockQty: p.stockQty, costPrice: p.costPrice, price: p.price, value };
  });

  const totalValue = valued
    .reduce((sum, p) => sum + Number(p.value), 0)
    .toFixed(2);

  res.status(200).json({ totalValue, products: valued });
});

export default router;
