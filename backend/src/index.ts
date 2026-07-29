import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import apiRouter from './routes/api';
import { checkDatabaseConnection } from './services/db';
import { logger } from './services/logger';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // CSP managed by frontend / Cloudflare edge
}));

const rawOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
const allowedOrigins = Array.from(new Set([
  'http://localhost:4200',
  'https://loans-cat.pages.dev',
  'https://loans-cat.mquirosp78.workers.dev',
  'https://plataforma-prestamos.pages.dev',
  ...rawOrigins
].filter(Boolean)));

// HTTP request logger — one compact line per request
app.use(pinoHttp({
  logger,
  // Suppress automatic per-field logging — we build the whole message ourselves
  customSuccessMessage: (req: any, res: any, responseTime: number) =>
    `${req.method} ${req.url} → ${res.statusCode} (${responseTime}ms)`,
  customErrorMessage: (req: any, res: any, err: Error) =>
    `${req.method} ${req.url} → ${res.statusCode} [${err.message}]`,
  // Skip health-check noise
  autoLogging: {
    ignore: (req) => req.url === '/health'
  },
  customLogLevel: (_req: any, res: any, err: any) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Don't emit req/res as separate fields — the message already contains everything
  serializers: {
    req: () => undefined as any,
    res: () => undefined as any
  }
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'CORS blocked request from disallowed origin');
      callback(new Error('Bloqueado por seguridad industrial CORS - Cat-Loan'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

// JSON parsing
app.use(express.json());

// Rate limiters (enabled in production only to avoid blocking local dev/testing)
if (process.env.NODE_ENV === 'production') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas peticiones desde esta IP. Bloqueo de seguridad industrial activado. Reintente más tarde." },
    statusCode: 429
  });

  const strictAuthLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas peticiones desde esta IP. Bloqueo de seguridad industrial activado. Reintente más tarde." },
    statusCode: 429
  });

  app.use('/api/auth', strictAuthLimiter);
  app.use('/api', generalLimiter);
}


// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'online', timestamp: new Date(), service: 'loan-saas-backend' });
});

// API routes
app.use('/api', apiRouter);

// ─── Centralized Error Handler ────────────────────────────────────────────────
// All controllers call next(err) in catch blocks — this catches them all,
// logs the error with full context, and returns a consistent 500 response.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      err: { message: err.message, stack: err.stack, code: err.code },
      method: req.method,
      url: req.url,
      userId: (req as any).user?.id ?? null
    },
    'Unhandled server error'
  );
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function startServer() {
  await checkDatabaseConnection();

  const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`===================================================`);
    logger.info(`🚀 CAT-LOAN-SAAS Server running on port ${PORT}`);
    logger.info(`👉 API Health Check: ${host}/health`);
    logger.info(`===================================================`);
  });
}

startServer().catch(err => {
  logger.fatal({ err }, 'Server boot failed — shutting down');
  process.exit(1);
});
