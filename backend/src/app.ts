import express from 'express';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use(errorHandler);

export default app;
