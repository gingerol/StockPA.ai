import express from 'express';
import { authenticate, requirePro } from '@/middleware/auth';
import { 
  savePortfolio, 
  getUserPortfolios, 
  analyzePortfolio, 
  getAnalysisResults,
  getAnalysisHistory 
} from '@/controllers/portfolioController';

const router = express.Router();

// Save/upload portfolio
router.post('/', authenticate, savePortfolio);

// Get user portfolios
router.get('/', authenticate, getUserPortfolios);

// Analyze portfolio with AI
router.post('/analyze', authenticate, analyzePortfolio);

// Get analysis results for portfolio
router.get('/:portfolioId/analysis', authenticate, getAnalysisResults);

// Get user's analysis history
router.get('/history/analysis', authenticate, getAnalysisHistory);

// Get specific portfolio
router.get('/:id', authenticate, async (req, res) => {
  // This is handled by getUserPortfolios for now
  res.json({
    success: true,
    message: 'Use GET /api/portfolios for all portfolios'
  });
});

// Update portfolio
router.put('/:id', authenticate, async (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio updates coming soon'
  });
});

// Delete portfolio
router.delete('/:id', authenticate, async (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio deletion coming soon'
  });
});

export default router;