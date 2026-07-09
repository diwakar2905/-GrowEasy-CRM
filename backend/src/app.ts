import express from 'express';
import cors from 'cors';
import importRouter from './routes/import.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { env } from './config/env';

const app = express();

// Enable CORS with support for multiple origins and Vercel dynamic urls
const allowedOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or matches vercel deployment
    const isAllowed = allowedOrigins.includes(origin) || 
                      allowedOrigins.includes('*') ||
                      origin.endsWith('.vercel.app');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register import routes
app.use('/api/import', importRouter);

// Global error handler (should be registered after all routes)
app.use(errorMiddleware);

export default app;
