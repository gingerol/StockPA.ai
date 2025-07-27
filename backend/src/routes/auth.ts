import express from 'express';
import passport from 'passport';
import { googleAuth, googleCallback, refreshToken, logout } from '@/controllers/authController';
import { authenticate } from '@/middleware/auth';

const router = express.Router();

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Token refresh
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', authenticate, logout);

// Get current user (protected route)
router.get('/me', authenticate, (req: any, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

export default router;