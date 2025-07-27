import { Router } from 'express';
import { auth } from '@/middleware/auth';
import {
  trackRecommendation,
  recordUserAction,
  getUserPerformance,
  getPeerComparison,
  createPortfolioSnapshot,
  getPortfolioHealthScore,
} from '@/controllers/dashboardController';
import { cronService } from '@/services/cronService';

const router = Router();

// All dashboard routes require authentication
router.use(auth);

// Recommendation tracking endpoints
router.post('/track-recommendation', trackRecommendation);
router.post('/record-action', recordUserAction);

// Performance analytics endpoints
router.get('/performance', getUserPerformance);
router.get('/peer-comparison', getPeerComparison);

// Portfolio analytics endpoints
router.post('/portfolio-snapshot', createPortfolioSnapshot);
router.get('/portfolio-health/:portfolioId', getPortfolioHealthScore);

// System health endpoints (admin only)
router.get('/system/cron-status', (req, res) => {
  try {
    const status = cronService.healthCheck();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get cron status',
    });
  }
});

router.post('/system/run-job/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    await cronService.runManually(jobName);
    res.json({
      success: true,
      message: `Job ${jobName} executed successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to run job: ${error}`,
    });
  }
});

export default router;