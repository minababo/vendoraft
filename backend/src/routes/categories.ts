import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { protect } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(protect);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(400).json({ error: 'Category name already exists' });
      return;
    }
    throw e;
  }
});

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
  res.status(200).json(categories);
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.status(200).json(category);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      if (e.code === 'P2002') {
        res.status(400).json({ error: 'Category name already exists' });
        return;
      }
    }
    throw e;
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Category deleted' });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    throw e;
  }
});

export default router;
