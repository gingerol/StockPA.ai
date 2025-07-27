import { Request, Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';
import { SevenLayerAnalysisEngine } from '@/services/ai/SevenLayerAnalysisEngine';

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

// Analyze portfolio with our 3-model AI system
export const analyzePortfolio = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { portfolioId, analysisType = 'full' } = req.body;
    const userId = req.user!.id;

    console.log(`🤖 Starting AI analysis for portfolio ${portfolioId}, user ${userId}`);

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
    
    // Initialize AI analysis engine
    const analysisEngine = new SevenLayerAnalysisEngine();

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

    // Run analysis for each stock
    const analysisResults = [];
    
    for (const stock of stocks) {
      console.log(`🔍 Analyzing ${stock.ticker}...`);
      
      try {
        // Prepare analysis request
        const analysisRequest = {
          ticker: stock.ticker,
          timeHorizon: 'medium-term' as const,
          riskTolerance: 'moderate' as const,
          context: {
            currentHolding: {
              quantity: stock.quantity,
              purchasePrice: stock.purchasePrice,
              marketValue: stock.marketValue
            },
            portfolio: {
              totalValue: Number(portfolio.totalValue),
              stockCount: stocks.length,
              concentration: stock.marketValue ? (stock.marketValue / Number(portfolio.totalValue)) * 100 : 0
            }
          }
        };

        // Run 3-model analysis
        const stockAnalysis = await analysisEngine.analyzeStock(analysisRequest);
        
        // Save analysis results
        const recommendation = await prisma.recommendation.create({
          data: {
            userId,
            portfolioId,
            ticker: stock.ticker,
            action: stockAnalysis.recommendation.action,
            confidence: stockAnalysis.recommendation.confidence,
            currentPrice: stockAnalysis.marketData?.currentPrice || stock.purchasePrice || 0,
            targetPrice: stockAnalysis.recommendation.targetPrice,
            potentialReturn: stockAnalysis.recommendation.expectedReturn,
            riskLevel: stockAnalysis.riskAssessment.overallRisk,
            timeHorizon: stockAnalysis.recommendation.timeHorizon,
            reasoning: stockAnalysis.recommendation.reasoning
          }
        });

        // Track recommendation
        await prisma.recommendationTracker.create({
          data: {
            recommendationId: recommendation.id,
            userId,
            ticker: stock.ticker,
            action: stockAnalysis.recommendation.action,
            confidence: stockAnalysis.recommendation.confidence,
            recommendedPrice: stockAnalysis.marketData?.currentPrice || stock.purchasePrice || 0,
            targetPrice: stockAnalysis.recommendation.targetPrice || 0,
            recommendedAt: new Date()
          }
        });

        analysisResults.push({
          ticker: stock.ticker,
          recommendation: stockAnalysis.recommendation,
          analysis: stockAnalysis.layerResults,
          confidence: stockAnalysis.confidence,
          recommendationId: recommendation.id
        });

        console.log(`✅ ${stock.ticker} analysis complete: ${stockAnalysis.recommendation.action}`);

      } catch (stockError) {
        console.error(`❌ Analysis failed for ${stock.ticker}:`, stockError);
        
        analysisResults.push({
          ticker: stock.ticker,
          error: `Analysis failed: ${stockError.message}`,
          recommendation: {
            action: 'HOLD',
            confidence: 'LOW',
            reasoning: 'Analysis could not be completed due to technical issues'
          }
        });
      }
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
          successfulAnalyses: analysisResults.filter(r => !r.error).length,
          failedAnalyses: analysisResults.filter(r => r.error).length,
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
          analyzed: analysisResults.filter(r => !r.error).length,
          failed: analysisResults.filter(r => r.error).length,
          avgConfidence: analysisResults
            .filter(r => !r.error)
            .reduce((sum, r) => sum + r.confidence, 0) / analysisResults.filter(r => !r.error).length
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing portfolio:', error);
    return res.status(500).json({
      success: false,
      message: 'Portfolio analysis failed',
      error: error.message
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
        eventName: 'analysis_completed',
        eventData: {
          path: '$.portfolioId',
          equals: portfolioId
        }
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