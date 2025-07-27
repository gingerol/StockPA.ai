import { Router } from 'express';
import { auth } from '@/middleware/auth';
import {
  getAdminDashboard,
  getUserAnalytics,
  getRecommendationAnalytics,
  getFinancialAnalytics,
  getSystemHealth,
} from '@/controllers/adminController';

const router = Router();

// All admin routes require authentication
router.use(auth);

// Admin dashboard overview
router.get('/dashboard', getAdminDashboard);

// User analytics
router.get('/users', getUserAnalytics);

// Recommendation analytics
router.get('/recommendations', getRecommendationAnalytics);

// Financial analytics
router.get('/financial', getFinancialAnalytics);

// System health
router.get('/health', getSystemHealth);

export default router;