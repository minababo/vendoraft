import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [
    totalProducts,
    totalCategories,
    totalSalesToday,
    revenueAgg,
    lowStockRaw,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.sale.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: startOfDay } },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM "Product"
      WHERE "stockQty" < "lowStockThreshold"
    `,
  ]);

  const lowStockCount = Number(lowStockRaw[0].count);

  res.status(200).json({
    totalProducts,
    totalCategories,
    totalSalesToday,
    revenueToday: (Number(revenueAgg._sum.totalAmount) || 0).toFixed(2),
    lowStockCount,
  });
});

export default router;
