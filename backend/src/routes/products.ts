import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

const categoryInclude = { category: { select: { name: true } } } as const;

const SORTABLE_FIELDS = ['name', 'price', 'stockQty', 'createdAt'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, sku, categoryId, price, costPrice, stockQty, lowStockThreshold } = req.body;

  if (!name || !sku || !categoryId || price == null || costPrice == null) {
    res.status(400).json({ error: 'name, sku, categoryId, price, and costPrice are required' });
    return;
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        categoryId,
        price,
        costPrice,
        stockQty: stockQty ?? 0,
        lowStockThreshold: lowStockThreshold ?? 10,
      },
      include: categoryInclude,
    });
    res.status(201).json(product);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        res.status(400).json({ error: 'A product with this SKU already exists' });
        return;
      }
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
    }
    throw e;
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { search, categoryId, sortBy, order } = req.query;

  const where: Prisma.ProductWhereInput = {};

  if (typeof search === 'string' && search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (typeof categoryId === 'string' && categoryId) {
    where.categoryId = categoryId;
  }

  const orderField: SortableField =
    typeof sortBy === 'string' && (SORTABLE_FIELDS as readonly string[]).includes(sortBy)
      ? (sortBy as SortableField)
      : 'createdAt';

  const orderDir: Prisma.SortOrder =
    order === 'desc' ? 'desc' : 'asc';

  const products = await prisma.product.findMany({
    where,
    include: categoryInclude,
    orderBy: { [orderField]: orderDir },
  });

  res.status(200).json(products);
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: categoryInclude,
  });

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.status(200).json(product);
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, sku, categoryId, price, costPrice, stockQty, lowStockThreshold } = req.body;

  const data: Prisma.ProductUpdateInput = {};
  if (name !== undefined) data.name = name;
  if (sku !== undefined) data.sku = sku;
  if (categoryId !== undefined) data.category = { connect: { id: categoryId } };
  if (price !== undefined) data.price = price;
  if (costPrice !== undefined) data.costPrice = costPrice;
  if (stockQty !== undefined) data.stockQty = stockQty;
  if (lowStockThreshold !== undefined) data.lowStockThreshold = lowStockThreshold;

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: categoryInclude,
    });
    res.status(200).json(product);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      if (e.code === 'P2002') {
        res.status(400).json({ error: 'A product with this SKU already exists' });
        return;
      }
    }
    throw e;
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Product deleted' });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    throw e;
  }
});

export default router;
