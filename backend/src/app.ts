// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import portfolioRoutes from '@/routes/portfolios';
import recommendationRoutes from '@/routes/recommendations';
import trialRoutes from '@/routes/trials';
import subscriptionRoutes from '@/routes/subscriptions';
import dashboardRoutes from '@/routes/dashboard';
import adminRoutes from '@/routes/admin';
import valuationRoutes from '@/routes/valuation';
import aiAnalysisRoutes from '@/routes/aiAnalysis';

// Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/logger';
import { initializeGoogleAuth } from '@/controllers/authController';

// Import services
import { cronService } from '@/services/cronService';


// Initialize Prisma
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const app = express();
const PORT = parseInt(process.env.PORT || '8001', 10);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8002',
  credentials: true,
}));

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Initialize passport
app.use(passport.initialize());

// Initialize Google OAuth after middleware
initializeGoogleAuth();

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'StockPA.ai Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/valuation', valuationRoutes);
app.use('/api/ai', aiAnalysisRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  cronService.stopAll();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  cronService.stopAll();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 StockPA.ai Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8002'}`);
  
  // Start cron jobs after server starts
  cronService.startAll();
});

export default app;