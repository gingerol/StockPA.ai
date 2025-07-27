import { Request, Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';

interface StockEntry {
  ticker: string;
  quantity: number;
  purchasePrice?: number;
  marketValue?: number;
}

// Save user's portfolio
export const savePortfolio = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { stocks, portfolioName = 'My Portfolio' } = req.body;
    const userId = req.user!.id;

    console.log(`💾 Saving portfolio for user ${userId}: ${stocks.length} stocks`);

    // Validate stocks data
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stocks data provided'
      });
    }

    // Calculate total value
    const totalValue = stocks.reduce((sum: number, stock: StockEntry) => {
      return sum + (stock.marketValue || (stock.quantity * (stock.purchasePrice || 0)));
    }, 0);

    // Deactivate existing portfolios
    await prisma.portfolio.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    // Create new portfolio
    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name: portfolioName,
        stocks: stocks,
        totalValue: totalValue,
        isActive: true
      }
    });

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: 'portfolio_uploaded',
        eventData: {
          portfolioId: portfolio.id,
          stockCount: stocks.length,
          totalValue: totalValue,
          uploadMethod: 'dashboard'
        }
      }
    });

    console.log(`✅ Portfolio saved with ID: ${portfolio.id}`);

    res.json({
      success: true,
      data: {
        portfolioId: portfolio.id,
        stockCount: stocks.length,
        totalValue: totalValue,
        message: 'Portfolio saved successfully'
      }
    });

  } catch (error) {
    console.error('Error saving portfolio:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save portfolio'
    });
  }
};

// Get user's portfolios
export const getUserPortfolios = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;

    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        recommendations: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    res.json({
      success: true,
      data: portfolios
    });

  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolios'
    });
  }
};

// Simplified analysis - mock for now until AI engine types are fixed
export const analyzePortfolio = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { portfolioId, analysisType = 'full' } = req.body;
    const userId = req.user!.id;

    console.log(`🤖 Starting analysis for portfolio ${portfolioId}, user ${userId}`);

    // Get portfolio
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId }
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const stocks = portfolio.stocks as any as StockEntry[];
    
    // Track analysis start
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: 'analysis_started',
        eventData: {
          portfolioId,
          stockCount: stocks.length,
          analysisType
        }
      }
    });

    // Mock analysis results for now
    const analysisResults = [];
    
    for (const stock of stocks) {
      console.log(`🔍 Analyzing ${stock.ticker}...`);
      
      // Mock recommendation
      const mockRecommendation = {
        action: 'HOLD',
        confidence: 'MEDIUM',
        targetPrice: (stock.purchasePrice || 100) * 1.1,
        expectedReturn: 10,
        reasoning: `Mock analysis for ${stock.ticker} - systematic analysis pending AI engine integration`
      };

      // Save recommendation
      const recommendation = await prisma.recommendation.create({
        data: {
          userId,
          portfolioId,
          ticker: stock.ticker,
          action: mockRecommendation.action,
          confidence: mockRecommendation.confidence,
          currentPrice: stock.purchasePrice || 100,
          targetPrice: mockRecommendation.targetPrice,
          potentialReturn: mockRecommendation.expectedReturn,
          riskLevel: 'MEDIUM',
          timeHorizon: 'medium-term',
          reasoning: mockRecommendation.reasoning
        }
      });

      // Track recommendation
      await prisma.recommendationTracker.create({
        data: {
          recommendationId: recommendation.id,
          userId,
          ticker: stock.ticker,
          action: mockRecommendation.action,
          confidence: mockRecommendation.confidence,
          recommendedPrice: stock.purchasePrice || 100,
          targetPrice: mockRecommendation.targetPrice || 0,
          recommendedAt: new Date()
        }
      });

      analysisResults.push({
        ticker: stock.ticker,
        recommendation: mockRecommendation,
        confidence: 75,
        recommendationId: recommendation.id
      });

      console.log(`✅ ${stock.ticker} analysis complete: ${mockRecommendation.action}`);
    }

    // Update portfolio with analysis timestamp
    await prisma.portfolio.update({
      where: { id: portfolioId },
      data: { updatedAt: new Date() }
    });

    // Track analysis completion
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: 'analysis_completed',
        eventData: {
          portfolioId,
          stockCount: stocks.length,
          successfulAnalyses: analysisResults.length,
          failedAnalyses: 0,
          analysisResults: analysisResults.map(r => ({
            ticker: r.ticker,
            action: r.recommendation.action,
            confidence: r.recommendation.confidence
          }))
        }
      }
    });

    console.log(`🎯 Portfolio analysis complete: ${analysisResults.length} stocks analyzed`);

    res.json({
      success: true,
      data: {
        portfolioId,
        analysisResults,
        summary: {
          totalStocks: stocks.length,
          analyzed: analysisResults.length,
          failed: 0,
          avgConfidence: 75
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing portfolio:', error);
    return res.status(500).json({
      success: false,
      message: 'Portfolio analysis failed',
      error: (error as Error).message
    });
  }
};

// Get analysis results for a portfolio
export const getAnalysisResults = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user!.id;

    // Get portfolio with recommendations
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: {
        recommendations: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            tracker: true
          }
        }
      }
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    // Get analysis history
    const analysisHistory = await prisma.analyticsEvent.findMany({
      where: {
        userId,
        eventName: 'analysis_completed'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      data: {
        portfolio,
        recommendations: portfolio.recommendations,
        analysisHistory: analysisHistory.map(event => ({
          date: event.createdAt,
          summary: event.eventData
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching analysis results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis results'
    });
  }
};

// Get user's analysis history
export const getAnalysisHistory = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;
    const { limit = 20 } = req.query;

    const analysisEvents = await prisma.analyticsEvent.findMany({
      where: {
        userId,
        eventName: {
          in: ['analysis_started', 'analysis_completed', 'portfolio_uploaded']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        totalValue: true,
        stocks: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        analysisHistory: analysisEvents,
        portfolios,
        summary: {
          totalAnalyses: analysisEvents.filter(e => e.eventName === 'analysis_completed').length,
          totalPortfolios: portfolios.length,
          lastAnalysis: analysisEvents.find(e => e.eventName === 'analysis_completed')?.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis history'
    });
  }
};