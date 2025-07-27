import express from 'express';
import { authenticate, AuthRequest } from '@/middleware/auth';
import { getUserProfile, updateUserProfile } from '@/controllers/userController';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticate, getUserProfile);
router.get('/me', authenticate, getUserProfile);

// Update user profile
router.put('/profile', authenticate, updateUserProfile);

export default router;