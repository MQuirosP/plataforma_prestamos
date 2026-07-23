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

// 3. MIDDLEWARE DE CORS NATIVO CON PREFLIGHT INTEGRADO
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por seguridad industrial CORS - Cat-Loan'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200 // Fuerza a que la respuesta de preflight devuelva un 200 limpio para navegadores viejos/móviles
}));

// 4. PARSEO DE JSON (Debe ir ANTES de las rutas y del rate limit por si validas payloads)
app.use(express.json());

// 5. RATE LIMITERS Y RUTAS (Van abajo del escudo de CORS)
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
  
  const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🚀 CAT-LOAN-SAAS Server running on port ${PORT}`);
    console.log(`👉 API Health Check: ${host}/health`);
    console.log(`===================================================`);
  });
}

startServer().catch(err => {
  console.error('Server boot failed:', err);
});
