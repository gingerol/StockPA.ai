import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';

// Track key metrics that drive $25M valuation
export const getValuationMetrics = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Key metrics for $25M valuation
    const metrics = await calculateValuationMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting valuation metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get valuation metrics',
    });
  }
};

async function calculateValuationMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. User Growth Metrics
  const totalUsers = await prisma.user.count();
  const activeUsers = await prisma.user.count({
    where: {
      lastLogin: {
        gte: thirtyDaysAgo,
      },
    },
  });
  const weeklyActiveUsers = await prisma.user.count({
    where: {
      lastLogin: {
        gte: sevenDaysAgo,
      },
    },
  });

  // 2. Engagement Metrics
  const totalRecommendations = await prisma.recommendation.count();
  const followedRecommendations = await prisma.recommendationTracker.count({
    where: {
      wasFollowed: true,
    },
  });

  // 3. Data Value Metrics
  const uniqueStocksAnalyzed = await prisma.recommendation.groupBy({
    by: ['ticker'],
    _count: true,
  });

  const totalPortfolioValue = await prisma.portfolio.aggregate({
    _sum: {
      totalValue: true,
    },
  });

  // 4. AI Performance Metrics
  const correctPredictions = await prisma.recommendationTracker.count({
    where: {
      accuracy: 'CORRECT',
    },
  });
  const totalPredictions = await prisma.recommendationTracker.count({
    where: {
      accuracy: {
        in: ['CORRECT', 'INCORRECT'],
      },
    },
  });

  // 5. Market Intelligence Value
  const dailyActiveStocks = await prisma.analyticsEvent.groupBy({
    by: ['metadata'],
    where: {
      eventName: 'stock_viewed',
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    _count: true,
  });

  // 6. Virality Metrics
  const referralSignups = await prisma.user.count({
    where: {
      referredBy: {
        not: null,
      },
    },
  });

  // Calculate valuation indicators
  const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const weeklyRetention = totalUsers > 0 ? (weeklyActiveUsers / totalUsers) * 100 : 0;
  const followRate = totalRecommendations > 0 ? (followedRecommendations / totalRecommendations) * 100 : 0;
  const aiAccuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
  const viralCoefficient = totalUsers > 0 ? referralSignups / totalUsers : 0;

  // Revenue potential calculations
  const potentialB2BRevenue = calculateB2BRevenue(totalUsers, uniqueStocksAnalyzed.length);
  const dataAssetValue = calculateDataValue(totalRecommendations, uniqueStocksAnalyzed.length);

  return {
    userMetrics: {
      totalUsers,
      monthlyActiveUsers: activeUsers,
      weeklyActiveUsers,
      engagementRate: Math.round(engagementRate * 10) / 10,
      weeklyRetention: Math.round(weeklyRetention * 10) / 10,
    },
    growthMetrics: {
      userGrowthRate: await calculateGrowthRate('users'),
      revenueGrowthPotential: await calculateGrowthRate('revenue'),
      viralCoefficient: Math.round(viralCoefficient * 100) / 100,
    },
    dataAsset: {
      totalRecommendations,
      uniqueStocksAnalyzed: uniqueStocksAnalyzed.length,
      followedRecommendations,
      followRate: Math.round(followRate * 10) / 10,
      totalPortfolioValue: totalPortfolioValue._sum.totalValue || 0,
    },
    aiPerformance: {
      accuracy: Math.round(aiAccuracy * 10) / 10,
      correctPredictions,
      totalPredictions,
    },
    valuationIndicators: {
      estimatedValuation: calculateValuation(totalUsers, engagementRate, aiAccuracy),
      potentialB2BRevenue,
      dataAssetValue,
      marketMultiple: 15, // SaaS multiples for fintech
      targetValuation: 25000000, // $25M
      progressToTarget: calculateProgressToTarget(totalUsers, engagementRate),
    },
    keyMilestones: {
      usersFor25M: 100000, // 100K users
      currentProgress: Math.round((totalUsers / 100000) * 100),
      engagementTarget: 70, // 70% engagement
      currentEngagement: Math.round(engagementRate),
    },
  };
}

function calculateB2BRevenue(users: number, stocks: number): number {
  // Institutional data licensing: $50K/month per enterprise client
  // Assume 10 enterprise clients at scale
  const enterpriseRevenue = 50000 * 12 * 10;
  
  // API access: $500/month per fintech partner
  // Assume 50 API partners
  const apiRevenue = 500 * 12 * 50;
  
  // White-label solutions: $100K/year per bank
  // Assume 5 banks
  const whiteLabelRevenue = 100000 * 5;
  
  return enterpriseRevenue + apiRevenue + whiteLabelRevenue;
}

function calculateDataValue(recommendations: number, stocks: number): number {
  // Value = (Unique insights * Average value per insight * Market demand multiplier)
  const insightValue = 10; // $10 per unique market insight
  const marketDemand = 5; // Nigeria market premium
  return recommendations * insightValue * marketDemand;
}

function calculateValuation(users: number, engagement: number, accuracy: number): number {
  // Base multiple: 5x revenue for SaaS
  // Premium for high engagement: +2x per 10% above 50%
  // Premium for AI accuracy: +3x per 10% above 70%
  
  const baseMultiple = 5;
  const engagementBonus = Math.max(0, (engagement - 50) / 10) * 2;
  const accuracyBonus = Math.max(0, (accuracy - 70) / 10) * 3;
  
  const totalMultiple = baseMultiple + engagementBonus + accuracyBonus;
  const impliedRevenue = users * 20 * 12; // $20/user/year potential
  
  return Math.round(impliedRevenue * totalMultiple);
}

function calculateProgressToTarget(users: number, engagement: number): number {
  // 40% weight on user count (target: 100K)
  // 30% weight on engagement (target: 70%)
  // 30% weight on data asset value
  
  const userProgress = Math.min(100, (users / 100000) * 100) * 0.4;
  const engagementProgress = Math.min(100, (engagement / 70) * 100) * 0.3;
  const dataProgress = 30; // Placeholder - would calculate based on data quality
  
  return Math.round(userProgress + engagementProgress + dataProgress);
}

async function calculateGrowthRate(metric: string): Promise<number> {
  // Simplified - would implement actual month-over-month calculations
  return metric === 'users' ? 25 : 40; // 25% user growth, 40% revenue growth potential
}

// Track user engagement for valuation
export const trackEngagement = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;
    const { action, metadata } = req.body;

    // Record engagement event
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: action,
        metadata: JSON.stringify(metadata),
        createdAt: new Date(),
      },
    });

    // Update user's last active timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });

    res.json({
      success: true,
      message: 'Engagement tracked',
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track engagement',
    });
  }
};