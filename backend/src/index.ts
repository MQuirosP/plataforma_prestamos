import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/api';
import { checkDatabaseConnection } from './services/db';

const app = express();
const PORT = process.env.PORT || 3000;

// Environment-based origins
const envOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or dev testing)
    if (!origin) return callback(null, true);
    
    // Localhost is allowed for development, and any origin in the ALLOWED_ORIGINS env variable
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
    
    if (isLocalhost || envOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
