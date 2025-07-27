import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';
import { nanoid } from 'nanoid';

export const requestTrialExtension = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        trialEndDate: true,
        totalTrialDays: true,
        requestExtensionUsed: true,
        extensionsUsed: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validation checks
    if (user.requestExtensionUsed) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your one-time trial extension'
      });
    }

    if (user.totalTrialDays >= 28) {
      return res.status(400).json({
        success: false,
        message: 'Maximum trial period reached (28 days)'
      });
    }

    if (user.status !== 'TRIAL') {
      return res.status(400).json({
        success: false,
        message: 'Trial extension only available for trial users'
      });
    }

    // Extend trial by 7 days
    const newTrialEndDate = new Date(user.trialEndDate);
    newTrialEndDate.setDate(newTrialEndDate.getDate() + 7);

    // Update user and create extension record
    const [updatedUser, extension] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          trialEndDate: newTrialEndDate,
          totalTrialDays: user.totalTrialDays + 7,
          requestExtensionUsed: true,
          extensionsUsed: user.extensionsUsed + 1,
        }
      }),
      prisma.trialExtension.create({
        data: {
          userId,
          extensionType: 'REQUEST',
          daysExtended: 7,
          reason: 'User requested trial extension'
        }
      })
    ]);

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: 'trial_extension_requested',
        eventData: {
          extensionType: 'REQUEST',
          daysExtended: 7,
          newTrialEndDate: newTrialEndDate.toISOString(),
          totalTrialDays: user.totalTrialDays + 7
        }
      }
    });

    res.json({
      success: true,
      message: 'Trial extended by 7 days successfully',
      data: {
        newTrialEndDate,
        totalTrialDays: user.totalTrialDays + 7,
        extensionId: extension.id
      }
    });
  } catch (error) {
    console.error('Error extending trial:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const processReferralExtension = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    // Find the referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: {
        id: true,
        referralCount: true,
        totalTrialDays: true,
        trialEndDate: true,
        status: true
      }
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    if (referrer.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refer yourself'
      });
    }

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalTrialDays: true,
        trialEndDate: true,
        status: true,
        referralExtensions: true,
        extensionsUsed: true,
        referredBy: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already referred by someone
    if (user.referredBy) {
      return res.status(400).json({
        success: false,
        message: 'You have already been referred by someone'
      });
    }

    // Check maximum trial days
    if (user.totalTrialDays >= 28) {
      return res.status(400).json({
        success: false,
        message: 'Maximum trial period reached (28 days)'
      });
    }

    // Extend both users' trials
    const newUserTrialEndDate = new Date(user.trialEndDate);
    newUserTrialEndDate.setDate(newUserTrialEndDate.getDate() + 7);

    const newReferrerTrialEndDate = new Date(referrer.trialEndDate);
    newReferrerTrialEndDate.setDate(newReferrerTrialEndDate.getDate() + 7);

    // Transaction to update both users and create extension records
    await prisma.$transaction([
      // Update referred user
      prisma.user.update({
        where: { id: userId },
        data: {
          trialEndDate: newUserTrialEndDate,
          totalTrialDays: user.totalTrialDays + 7,
          referralExtensions: user.referralExtensions + 1,
          extensionsUsed: user.extensionsUsed + 1,
          referredBy: referralCode
        }
      }),
      // Update referrer
      prisma.user.update({
        where: { id: referrer.id },
        data: {
          trialEndDate: newReferrerTrialEndDate,
          totalTrialDays: referrer.totalTrialDays + 7,
          referralCount: referrer.referralCount + 1,
          extensionsUsed: referrer.totalTrialDays + 7 - 7 // Calculate existing extensions
        }
      }),
      // Create extension record for referred user
      prisma.trialExtension.create({
        data: {
          userId,
          extensionType: 'REFERRED',
          daysExtended: 7,
          referralCode,
          reason: `Referred by user with code ${referralCode}`
        }
      }),
      // Create extension record for referrer
      prisma.trialExtension.create({
        data: {
          userId: referrer.id,
          extensionType: 'REFERRAL',
          daysExtended: 7,
          referralCode,
          reason: `Referred user ${userId}`
        }
      }),
      // Analytics events
      prisma.analyticsEvent.create({
        data: {
          userId,
          eventName: 'referral_extension_granted',
          eventData: {
            extensionType: 'REFERRED',
            referralCode,
            referrerId: referrer.id,
            daysExtended: 7
          }
        }
      }),
      prisma.analyticsEvent.create({
        data: {
          userId: referrer.id,
          eventName: 'successful_referral',
          eventData: {
            extensionType: 'REFERRAL',
            referralCode,
            referredUserId: userId,
            daysExtended: 7
          }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Referral processed successfully! Both you and your referrer got 7 extra days.',
      data: {
        newTrialEndDate: newUserTrialEndDate,
        totalTrialDays: user.totalTrialDays + 7,
        referrerCode: referralCode
      }
    });
  } catch (error) {
    console.error('Error processing referral extension:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getReferralStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCount: true,
        referralExtensions: true,
        extensionsUsed: true,
        freeMonthsEarned: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get referral link
    const referralLink = `${process.env.FRONTEND_URL}/signup?ref=${user.referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink,
        totalReferrals: user.referralCount,
        extensionsEarned: user.referralExtensions,
        totalExtensions: user.extensionsUsed,
        freeMonthsEarned: user.freeMonthsEarned
      }
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};