import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import { checkDatabaseConnection } from './services/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // Allow all origins for local B2B development setup
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 CAT-LOAN-SAAS Server running on port ${PORT}`);
    console.log(`👉 API Health Check: http://localhost:${PORT}/health`);
    console.log(`===================================================`);
  });
}

startServer().catch(err => {
  console.error('Server boot failed:', err);
});
