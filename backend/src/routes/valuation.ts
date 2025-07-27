import express from 'express';
import { authenticate } from '@/middleware/auth';
import { getValuationMetrics, trackEngagement } from '@/controllers/valuationController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Valuation metrics (admin only)
router.get('/metrics', getValuationMetrics);

// User engagement tracking
router.post('/track', trackEngagement);

export default router;