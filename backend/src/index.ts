import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/api';
import { checkDatabaseConnection } from './services/db';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:4200',
  'https://loans-cat.mquirosp78.workers.dev',
  'https://loans-cat.pages.dev',
  'https://plataforma-prestamos.pages.dev'
];

app.use(cors({
  origin: (origin, callback) => {
    // Validar coincidencia exacta o subdominios dinámicos de Cloudflare
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por seguridad industrial CORS - Cat-Loan'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept']
}));

// Responder inmediatamente a las peticiones OPTIONS globales sin pasar por otros middlewares
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Requested-With,Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  return res.sendStatus(200);
});

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas peticiones desde esta IP. Bloqueo de seguridad industrial activado. Reintente más tarde."
  },
  statusCode: 429
});

const strictAuthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas peticiones desde esta IP. Bloqueo de seguridad industrial activado. Reintente más tarde."
  },
  statusCode: 429
});

// Apply rate limiting
app.use('/api/auth', strictAuthLimiter);
app.use('/api', generalLimiter);

app.use(express.json());

// Main status route
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    service: 'loan-saas-backend'
  });
});

// Register API routes
app.use('/api', apiRouter);

// Start Server after checking DB
async function startServer() {
  await checkDatabaseConnection();
  
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🚀 CAT-LOAN-SAAS Server running on port ${PORT}`);
    console.log(`👉 API Health Check: http://localhost:${PORT}/health`);
    console.log(`===================================================`);
  });
}

startServer().catch(err => {
  console.error('Server boot failed:', err);
});
