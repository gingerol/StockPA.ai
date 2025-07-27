import { Router } from 'express';
import { auth, optionalAuth } from '@/middleware/auth';
import { 
  analyzeStock, 
  analyzePortfolio, 
  getAIHealthStatus, 
  getAnalysisHistory 
} from '@/controllers/aiAnalysisController';

const router = Router();

// Stock Analysis Routes
router.post('/analyze/stock', optionalAuth, analyzeStock);
router.post('/analyze/portfolio', auth, analyzePortfolio);

// Analysis History and Health
router.get('/health', getAIHealthStatus);
router.get('/history', auth, getAnalysisHistory);

export default router;