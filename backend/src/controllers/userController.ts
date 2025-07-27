import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
});

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        riskTolerance: true,
        status: true,
        trialStartDate: true,
        trialEndDate: true,
        totalTrialDays: true,
        hasUsedTrial: true,
        requestExtensionUsed: true,
        referralExtensions: true,
        extensionsUsed: true,
        referralCode: true,
        referredBy: true,
        referralCount: true,
        freeMonthsEarned: true,
        createdAt: true,
        lastLogin: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...validatedData,
        lastLogin: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        riskTolerance: true,
        status: true,
        trialStartDate: true,
        trialEndDate: true,
        totalTrialDays: true,
        hasUsedTrial: true,
        requestExtensionUsed: true,
        referralExtensions: true,
        extensionsUsed: true,
        referralCode: true,
        referredBy: true,
        referralCount: true,
        freeMonthsEarned: true,
        createdAt: true,
        lastLogin: true,
      }
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};