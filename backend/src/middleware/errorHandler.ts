import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Not allowed by CORS' });
    return;
  }

  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload too large. Maximum request size is 10kb.' });
    return;
  }

  const isDev = process.env.NODE_ENV !== 'production';

  console.error(`[${new Date().toISOString()}] ${err.message}`);
  if (isDev) console.error(err.stack);

  res.status(500).json({
    error: isDev ? err.message : 'An internal server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
}
