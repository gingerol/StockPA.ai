import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';
import { Decimal } from '@prisma/client/runtime/library';

// Admin-only analytics endpoints
export const getAdminDashboard = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;

    // Check if user is admin (you may want to add an isAdmin field to User model)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== 'admin@stockpa.ai') { // Replace with proper admin check
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Get platform-wide statistics
    const stats = await getPlatformStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin dashboard',
    });
  }
};

export const getUserAnalytics = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // User growth and engagement analytics
    const userStats = await getUserGrowthStats(timeframe as string);
    
    res.json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user analytics',
    });
  }
};

export const getRecommendationAnalytics = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Recommendation performance and usage analytics
    const recStats = await getRecommendationStats(timeframe as string);
    
    res.json({
      success: true,
      data: recStats,
    });
  } catch (error) {
    console.error('Error getting recommendation analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendation analytics',
    });
  }
};

export const getFinancialAnalytics = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Revenue and conversion analytics
    const financialStats = await getFinancialStats(timeframe as string);
    
    res.json({
      success: true,
      data: financialStats,
    });
  } catch (error) {
    console.error('Error getting financial analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial analytics',
    });
  }
};

export const getSystemHealth = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    // System performance and health metrics
    const healthStats = await getSystemHealthStats();
    
    res.json({
      success: true,
      data: healthStats,
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
    });
  }
};

// Helper functions for analytics calculations
async function getPlatformStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // User statistics
  const totalUsers = await prisma.user.count();
  const activeUsers = await prisma.user.count({
    where: {
      lastLogin: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const newUsers = await prisma.user.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Subscription statistics
  const paidUsers = await prisma.user.count({
    where: {
      status: {
        in: ['PRO_MONTHLY', 'PRO_ANNUAL'],
      },
    },
  });

  const trialUsers = await prisma.user.count({
    where: {
      status: 'TRIAL',
    },
  });

  // Recommendation statistics
  const totalRecommendations = await prisma.recommendation.count();
  const recentRecommendations = await prisma.recommendation.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Performance statistics
  const avgAccuracy = await prisma.recommendationTracker.aggregate({
    _avg: {
      accuracy: true,
    },
    where: {
      accuracy: {
        in: ['CORRECT', 'INCORRECT'],
      },
    },
  });

  // Portfolio statistics
  const totalPortfolios = await prisma.portfolio.count();
  const activePortfolios = await prisma.portfolio.count({
    where: {
      isActive: true,
    },
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      new: newUsers,
      paid: paidUsers,
      trial: trialUsers,
      conversionRate: totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0,
    },
    recommendations: {
      total: totalRecommendations,
      recent: recentRecommendations,
      avgAccuracy: avgAccuracy._avg.accuracy || 0,
    },
    portfolios: {
      total: totalPortfolios,
      active: activePortfolios,
    },
    engagement: {
      activeUserRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      portfolioUploadRate: totalUsers > 0 ? (totalPortfolios / totalUsers) * 100 : 0,
    },
  };
}

async function getUserGrowthStats(timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Daily user registrations
  const userGrowth = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM users 
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date;
  `;

  // User status distribution
  const statusDistribution = await prisma.user.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  // Trial conversion tracking
  const trialConversions = await prisma.trialExtension.findMany({
    where: {
      convertedToPaid: true,
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      user: {
        select: {
          status: true,
        },
      },
    },
  });

  return {
    growth: userGrowth,
    statusDistribution,
    trialConversions: {
      count: trialConversions.length,
      avgDaysToConvert: trialConversions.length > 0 
        ? trialConversions.reduce((sum, t) => sum + (t.daysToConvert || 0), 0) / trialConversions.length
        : 0,
    },
  };
}

async function getRecommendationStats(timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Recommendation creation over time
  const recCreation = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM recommendations 
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date;
  `;

  // Action distribution (BUY/SELL/HOLD)
  const actionDistribution = await prisma.recommendation.groupBy({
    by: ['action'],
    _count: {
      id: true,
    },
    where: {
      createdAt: {
        gte: startDate,
      },
    },
  });

  // Follow rate statistics
  const followStats = await prisma.recommendationTracker.aggregate({
    _count: {
      id: true,
    },
    where: {
      recommendedAt: {
        gte: startDate,
      },
    },
  });

  const followedCount = await prisma.recommendationTracker.count({
    where: {
      wasFollowed: true,
      recommendedAt: {
        gte: startDate,
      },
    },
  });

  // Accuracy by action type
  const accuracyByAction = await prisma.$queryRaw`
    SELECT 
      action,
      COUNT(CASE WHEN accuracy = 'CORRECT' THEN 1 END) as correct,
      COUNT(CASE WHEN accuracy = 'INCORRECT' THEN 1 END) as incorrect,
      COUNT(*) as total
    FROM recommendation_trackers 
    WHERE accuracy IN ('CORRECT', 'INCORRECT')
      AND recommended_at >= ${startDate}
    GROUP BY action;
  `;

  return {
    creation: recCreation,
    actionDistribution,
    followRate: followStats._count.id > 0 ? (followedCount / followStats._count.id) * 100 : 0,
    accuracyByAction,
  };
}

async function getFinancialStats(timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Revenue statistics (placeholder - implement with actual payment data)
  const monthlyRevenue = await prisma.subscription.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: 'ACTIVE',
      plan: 'PRO_MONTHLY',
    },
  });

  const annualRevenue = await prisma.subscription.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: 'ACTIVE',
      plan: 'PRO_ANNUAL',
    },
  });

  // Conversion funnel
  const totalTrialUsers = await prisma.user.count({
    where: {
      hasUsedTrial: true,
    },
  });

  const convertedUsers = await prisma.user.count({
    where: {
      hasUsedTrial: true,
      status: {
        in: ['PRO_MONTHLY', 'PRO_ANNUAL'],
      },
    },
  });

  return {
    revenue: {
      monthly: (monthlyRevenue._sum.amount || 0) / 100, // Convert from kobo to naira
      annual: (annualRevenue._sum.amount || 0) / 100,
      total: ((monthlyRevenue._sum.amount || 0) + (annualRevenue._sum.amount || 0)) / 100,
    },
    conversion: {
      trialToPaid: totalTrialUsers > 0 ? (convertedUsers / totalTrialUsers) * 100 : 0,
      totalTrials: totalTrialUsers,
      totalConversions: convertedUsers,
    },
  };
}

async function getSystemHealthStats() {
  // Database connection health
  const dbHealth = await prisma.$queryRaw`SELECT 1 as healthy`;
  
  // Recent error logs (if you implement error logging)
  const recentErrors = await prisma.analyticsEvent.count({
    where: {
      eventName: 'error',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });

  // Performance metrics
  const avgResponseTime = 150; // Placeholder - implement actual monitoring
  const uptime = 99.9; // Placeholder - implement actual monitoring

  return {
    database: {
      healthy: Array.isArray(dbHealth) && dbHealth.length > 0,
      connections: 'active', // Placeholder
    },
    performance: {
      avgResponseTime,
      uptime,
      recentErrors,
    },
    services: {
      api: 'healthy',
      cron: 'healthy',
      database: 'healthy',
    },
  };
}