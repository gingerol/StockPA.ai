import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';
import { Decimal } from '@prisma/client/runtime/library';

// Track when a recommendation is created
export const trackRecommendation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { recommendationId } = req.body;
    const userId = req.user!.id;

    // Get the recommendation details
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation || recommendation.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found',
      });
    }

    // Create tracker if it doesn't exist
    const tracker = await prisma.recommendationTracker.create({
      data: {
        recommendationId: recommendation.id,
        userId: userId,
        ticker: recommendation.ticker,
        action: recommendation.action,
        confidence: recommendation.confidence,
        recommendedPrice: recommendation.currentPrice || new Decimal(0),
        targetPrice: recommendation.targetPrice || new Decimal(0),
        recommendedAt: recommendation.createdAt,
      },
    });

    // Update user performance stats
    await updateUserPerformanceStats(userId);

    res.json({
      success: true,
      data: tracker,
    });
  } catch (error) {
    console.error('Error tracking recommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track recommendation',
    });
  }
};

// Record user action on recommendation
export const recordUserAction = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { recommendationId, followed, actionPrice } = req.body;
    const userId = req.user!.id;

    const tracker = await prisma.recommendationTracker.findFirst({
      where: {
        recommendationId,
        userId,
      },
    });

    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation tracker not found',
      });
    }

    // Update tracker with user action
    const updatedTracker = await prisma.recommendationTracker.update({
      where: { id: tracker.id },
      data: {
        wasFollowed: followed,
        followedAt: followed ? new Date() : null,
        actualActionPrice: actionPrice ? new Decimal(actionPrice) : null,
      },
    });

    // Update user performance stats
    await updateUserPerformanceStats(userId);

    res.json({
      success: true,
      data: updatedTracker,
    });
  } catch (error) {
    console.error('Error recording user action:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record user action',
    });
  }
};

// Get user performance metrics
export const getUserPerformance = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;

    let performance = await prisma.userPerformance.findUnique({
      where: { userId },
    });

    if (!performance) {
      // Create initial performance record
      performance = await prisma.userPerformance.create({
        data: { userId },
      });
    }

    // Get recent recommendations with tracking data
    const recentRecommendations = await prisma.recommendationTracker.findMany({
      where: { userId },
      include: {
        recommendation: true,
      },
      orderBy: { recommendedAt: 'desc' },
      take: 10,
    });

    // Calculate money left on table
    const missedOpportunities = await calculateMissedOpportunities(userId);

    res.json({
      success: true,
      data: {
        performance,
        recentRecommendations,
        missedOpportunities,
      },
    });
  } catch (error) {
    console.error('Error getting user performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user performance',
    });
  }
};

// Get peer comparison data
export const getPeerComparison = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;

    // Get all user performances
    const allPerformances = await prisma.userPerformance.findMany({
      orderBy: { averageReturn: 'desc' },
    });

    // Find user's rank
    const userIndex = allPerformances.findIndex(p => p.userId === userId);
    const totalUsers = allPerformances.length;
    const percentileRank = totalUsers > 0 
      ? Math.round(((totalUsers - userIndex) / totalUsers) * 100)
      : 50;

    // Get average metrics
    const avgReturn = allPerformances.reduce((sum, p) => 
      sum + (p.averageReturn?.toNumber() || 0), 0) / totalUsers;
    
    const avgAccuracy = allPerformances.reduce((sum, p) => 
      sum + (p.accuracyRate?.toNumber() || 0), 0) / totalUsers;

    // Get top performer stats (anonymized)
    const topPerformers = allPerformances.slice(0, Math.ceil(totalUsers * 0.1));
    const topAvgReturn = topPerformers.reduce((sum, p) => 
      sum + (p.averageReturn?.toNumber() || 0), 0) / topPerformers.length;

    res.json({
      success: true,
      data: {
        userRank: userIndex + 1,
        totalUsers,
        percentileRank,
        averageReturn: avgReturn,
        averageAccuracy: avgAccuracy,
        topPerformerReturn: topAvgReturn,
        userPerformance: allPerformances[userIndex],
      },
    });
  } catch (error) {
    console.error('Error getting peer comparison:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get peer comparison',
    });
  }
};

// Create portfolio snapshot
export const createPortfolioSnapshot = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { portfolioId } = req.body;
    const userId = req.user!.id;

    // Get portfolio
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found',
      });
    }

    // Calculate portfolio metrics
    const { totalValue, totalCost, totalReturn, returnPercent, holdings } = 
      await calculatePortfolioMetrics(portfolio);

    // Create snapshot
    const snapshot = await prisma.portfolioSnapshot.create({
      data: {
        userId,
        portfolioId,
        totalValue,
        totalCost,
        totalReturn,
        returnPercent,
        holdings,
      },
    });

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Error creating portfolio snapshot:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create portfolio snapshot',
    });
  }
};

// Get portfolio health score
export const getPortfolioHealthScore = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user!.id;

    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found',
      });
    }

    // Calculate health metrics
    const healthScore = await calculatePortfolioHealthScore(portfolio);

    res.json({
      success: true,
      data: healthScore,
    });
  } catch (error) {
    console.error('Error getting portfolio health score:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get portfolio health score',
    });
  }
};

// Helper functions
async function updateUserPerformanceStats(userId: string) {
  const trackers = await prisma.recommendationTracker.findMany({
    where: { userId },
  });

  const totalRecommendations = trackers.length;
  const followedCount = trackers.filter(t => t.wasFollowed).length;
  const correctPredictions = trackers.filter(t => t.accuracy === 'CORRECT').length;
  const incorrectPredictions = trackers.filter(t => t.accuracy === 'INCORRECT').length;
  const pendingPredictions = trackers.filter(t => t.accuracy === 'PENDING').length;

  // Calculate average return on followed recommendations
  const followedReturns = trackers
    .filter(t => t.wasFollowed && t.actualReturn)
    .map(t => t.actualReturn!.toNumber());
  
  const averageReturn = followedReturns.length > 0
    ? followedReturns.reduce((sum, r) => sum + r, 0) / followedReturns.length
    : 0;

  // Calculate accuracy rate
  const completedPredictions = correctPredictions + incorrectPredictions;
  const accuracyRate = completedPredictions > 0
    ? (correctPredictions / completedPredictions) * 100
    : 0;

  await prisma.userPerformance.upsert({
    where: { userId },
    create: {
      userId,
      totalRecommendations,
      followedCount,
      correctPredictions,
      incorrectPredictions,
      pendingPredictions,
      averageReturn: new Decimal(averageReturn),
      accuracyRate: new Decimal(accuracyRate),
    },
    update: {
      totalRecommendations,
      followedCount,
      correctPredictions,
      incorrectPredictions,
      pendingPredictions,
      averageReturn: new Decimal(averageReturn),
      accuracyRate: new Decimal(accuracyRate),
    },
  });
}

async function calculateMissedOpportunities(userId: string) {
  const unfollowedTrackers = await prisma.recommendationTracker.findMany({
    where: {
      userId,
      wasFollowed: false,
      missedReturn: { not: null },
    },
  });

  const totalMissed = unfollowedTrackers.reduce((sum, t) => 
    sum + (t.missedReturn?.toNumber() || 0), 0);

  return {
    count: unfollowedTrackers.length,
    totalValue: totalMissed,
    recommendations: unfollowedTrackers.slice(0, 5), // Top 5 missed opportunities
  };
}

async function calculatePortfolioMetrics(portfolio: any) {
  const stocks = portfolio.stocks as any[];
  let totalValue = 0;
  let totalCost = 0;
  const holdings = [];

  for (const stock of stocks) {
    // Get current price from market data
    const marketData = await prisma.marketData.findFirst({
      where: { ticker: stock.ticker },
      orderBy: { dataDate: 'desc' },
    });

    const currentPrice = marketData?.currentPrice.toNumber() || stock.purchasePrice || 0;
    const value = currentPrice * stock.quantity;
    const cost = (stock.purchasePrice || currentPrice) * stock.quantity;
    const returnAmount = value - cost;
    const returnPercent = cost > 0 ? (returnAmount / cost) * 100 : 0;

    holdings.push({
      ticker: stock.ticker,
      quantity: stock.quantity,
      currentPrice,
      value,
      cost,
      return: returnAmount,
      returnPercent,
    });

    totalValue += value;
    totalCost += cost;
  }

  const totalReturn = totalValue - totalCost;
  const returnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  return {
    totalValue: new Decimal(totalValue),
    totalCost: new Decimal(totalCost),
    totalReturn: new Decimal(totalReturn),
    returnPercent: new Decimal(returnPercent),
    holdings,
  };
}

async function calculatePortfolioHealthScore(portfolio: any) {
  const stocks = portfolio.stocks as any[];
  const totalStocks = stocks.length;

  // Concentration risk (how much is in top holdings)
  const sortedByValue = [...stocks].sort((a, b) => 
    (b.quantity * (b.purchasePrice || 1)) - (a.quantity * (a.purchasePrice || 1))
  );
  
  const top3Value = sortedByValue.slice(0, 3).reduce((sum, s) => 
    sum + (s.quantity * (s.purchasePrice || 1)), 0
  );
  
  const totalValue = stocks.reduce((sum, s) => 
    sum + (s.quantity * (s.purchasePrice || 1)), 0
  );
  
  const concentrationRisk = totalValue > 0 ? (top3Value / totalValue) * 100 : 0;

  // Sector diversity (assuming we can categorize stocks by sector)
  const sectors = new Set(stocks.map(s => getSector(s.ticker)));
  const sectorDiversity = (sectors.size / totalStocks) * 100;

  // Liquidity score (based on average daily volume - placeholder)
  const liquidityScore = 85; // Placeholder - would calculate based on market data

  // Overall health score
  const healthScore = Math.round(
    (100 - concentrationRisk) * 0.4 +
    sectorDiversity * 0.3 +
    liquidityScore * 0.3
  );

  return {
    healthScore,
    metrics: {
      concentrationRisk,
      sectorDiversity,
      liquidityScore,
      totalStocks,
      topHoldings: sortedByValue.slice(0, 3).map(s => ({
        ticker: s.ticker,
        percentage: totalValue > 0 ? ((s.quantity * (s.purchasePrice || 1)) / totalValue) * 100 : 0,
      })),
    },
    recommendations: generateHealthRecommendations(healthScore, concentrationRisk, sectorDiversity),
  };
}

function getSector(ticker: string): string {
  // Placeholder - would have proper sector mapping
  const sectorMap: Record<string, string> = {
    'GTCO': 'Banking',
    'ZENITHBANK': 'Banking',
    'ACCESSCORP': 'Banking',
    'MTNN': 'Telecom',
    'AIRTELAFRI': 'Telecom',
    'DANGCEM': 'Industrial',
    'NESTLE': 'Consumer Goods',
    'FLOURMILL': 'Consumer Goods',
  };
  
  return sectorMap[ticker] || 'Other';
}

function generateHealthRecommendations(score: number, concentration: number, diversity: number): string[] {
  const recommendations = [];
  
  if (concentration > 60) {
    recommendations.push('Consider reducing concentration in top holdings');
  }
  
  if (diversity < 30) {
    recommendations.push('Diversify across more sectors to reduce risk');
  }
  
  if (score < 70) {
    recommendations.push('Portfolio health needs attention - review allocation');
  }
  
  return recommendations;
}