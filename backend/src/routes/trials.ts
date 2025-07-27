import express from 'express';
import { authenticate } from '@/middleware/auth';
import { 
  requestTrialExtension, 
  processReferralExtension,
  getReferralStats 
} from '@/controllers/trialController';

const router = express.Router();

// Request one-time trial extension (+7 days)
router.post('/extend', authenticate, requestTrialExtension);

// Process referral extension when friend signs up
router.post('/referral-extension', authenticate, processReferralExtension);

// Get referral statistics
router.get('/referral-stats', authenticate, getReferralStats);

export default router;