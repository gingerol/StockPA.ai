import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/app';
import { sevenLayerAnalysisEngine, LayerAnalysisRequest, SevenLayerAnalysis } from '@/services/ai/SevenLayerAnalysisEngine';
import { aiEnsembleService } from '@/services/ai/AIEnsembleService';

export const analyzeStock = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { ticker, timeHorizon = '6M', riskTolerance = 'moderate' } = req.body;

    if (!ticker) {
      return res.status(400).json({
        success: false,
        message: 'Stock ticker is required'
      });
    }

    console.log(`🧠 Starting seven-layer analysis for ${ticker} (User: ${userId})`);

    // Prepare analysis request
    const analysisRequest: LayerAnalysisRequest = {
      ticker: ticker.toUpperCase(),
      timeHorizon,
      riskTolerance,
      userContext: userId ? { userId } : null
    };

    // Execute comprehensive seven-layer analysis
    const analysis: SevenLayerAnalysis = await sevenLayerAnalysisEngine.analyzeStock(analysisRequest);

    // Store analysis results in database for tracking and learning
    if (userId) {
      await storeAnalysisResults(userId, analysis);
    }

    // Return comprehensive analysis
    res.json({
      success: true,
      data: {
        ticker: analysis.ticker,
        recommendation: analysis.finalRecommendation,
        confidence: analysis.overallConfidence,
        score: analysis.overallScore,
        analysis: analysis.synthesis,
        riskAssessment: analysis.riskAssessment,
        layers: analysis.layers.map(layer => ({
          name: layer.layerName,
          type: layer.layerType,
          score: layer.score,
          confidence: layer.confidence,
          reasoning: layer.reasoning.substring(0, 200) + '...', // Truncate for API response
          modelUsed: layer.modelUsed
        })),
        processingTime: analysis.totalProcessingTime,
        timestamp: analysis.analysisTimestamp
      }
    });

  } catch (error) {
    console.error('❌ AI Analysis failed:', error);
    res.status(500).json({
      success: false,
      message: 'AI analysis temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const analyzePortfolio = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;
    const { portfolioId, timeHorizon = '6M', riskTolerance = 'moderate' } = req.body;

    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio ID is required'
      });
    }

    // Get portfolio data
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId,
        isActive: true
      }
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const stocks = portfolio.stocks as any[];
    console.log(`🧠 Starting portfolio analysis for ${stocks.length} stocks`);

    // Analyze each stock in the portfolio
    const stockAnalyses = await Promise.all(
      stocks.map(async (stock: any) => {
        try {
          const analysisRequest: LayerAnalysisRequest = {
            ticker: stock.ticker,
            timeHorizon,
            riskTolerance,
            userContext: { userId, portfolioId }
          };

          return await sevenLayerAnalysisEngine.analyzeStock(analysisRequest);
        } catch (error) {
          console.error(`❌ Failed to analyze ${stock.ticker}:`, error);
          return null;
        }
      })
    );

    // Filter out failed analyses
    const validAnalyses = stockAnalyses.filter(analysis => analysis !== null) as SevenLayerAnalysis[];

    // Calculate portfolio-level metrics
    const portfolioMetrics = calculatePortfolioMetrics(validAnalyses);

    // Store portfolio analysis results
    await storePortfolioAnalysisResults(userId, portfolioId, validAnalyses, portfolioMetrics);

    res.json({
      success: true,
      data: {
        portfolioId,
        overallScore: portfolioMetrics.overallScore,
        overallRisk: portfolioMetrics.overallRisk,
        diversificationScore: portfolioMetrics.diversificationScore,
        recommendations: portfolioMetrics.recommendations,
        stockAnalyses: validAnalyses.map(analysis => ({
          ticker: analysis.ticker,
          recommendation: analysis.finalRecommendation,
          score: analysis.overallScore,
          confidence: analysis.overallConfidence,
          riskLevel: analysis.riskAssessment
        })),
        processingTime: validAnalyses.reduce((sum, a) => sum + a.totalProcessingTime, 0),
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Portfolio Analysis failed:', error);
    res.status(500).json({
      success: false,
      message: 'Portfolio analysis temporarily unavailable'
    });
  }
};

export const getAIHealthStatus = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    // Check AI ensemble health
    const ensembleHealth = await aiEnsembleService.healthCheck();
    
    // Check seven-layer engine health
    const layerEngineHealth = await sevenLayerAnalysisEngine.healthCheck();

    res.json({
      success: true,
      data: {
        status: ensembleHealth.status === 'healthy' && layerEngineHealth.status === 'healthy' ? 'healthy' : 'degraded',
        aiModels: ensembleHealth.models,
        analysisLayers: layerEngineHealth.layers,
        lastChecked: new Date()
      }
    });

  } catch (error) {
    console.error('❌ AI Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      data: {
        status: 'error',
        lastChecked: new Date()
      }
    });
  }
};

export const getAnalysisHistory = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user!.id;
    const { ticker, limit = 10 } = req.query;

    let whereClause: any = { userId };
    if (ticker) {
      whereClause.ticker = ticker;
    }

    const analysisHistory = await prisma.analysisResult.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      select: {
        id: true,
        ticker: true,
        analysisLayer: true,
        layerScore: true,
        confidence: true,
        reasoning: true,
        modelName: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: analysisHistory
    });

  } catch (error) {
    console.error('❌ Failed to get analysis history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis history'
    });
  }
};

async function storeAnalysisResults(userId: string, analysis: SevenLayerAnalysis): Promise<void> {
  try {
    // Store each layer's results
    const analysisResults = analysis.layers.map(layer => ({
      ticker: analysis.ticker,
      userId,
      analysisLayer: layer.layerType,
      layerScore: layer.score / 100, // Convert to 0-1 scale
      confidence: layer.confidence,
      reasoning: layer.reasoning,
      supportingData: JSON.stringify(layer.indicators),
      modelName: layer.modelUsed,
      analysisRequest: JSON.stringify({
        timeHorizon: 'N/A', // Would be passed from request
        riskTolerance: 'N/A'
      })
    }));

    await prisma.analysisResult.createMany({
      data: analysisResults
    });

    console.log(`✅ Stored ${analysisResults.length} layer results for ${analysis.ticker}`);

  } catch (error) {
    console.error('❌ Failed to store analysis results:', error);
    // Don't throw - analysis succeeded even if storage failed
  }
}

async function storePortfolioAnalysisResults(
  userId: string, 
  portfolioId: string, 
  analyses: SevenLayerAnalysis[], 
  metrics: any
): Promise<void> {
  try {
    // Store portfolio snapshot
    const totalValue = 0; // Would calculate from current prices
    const totalCost = 0; // Would calculate from purchase prices
    
    await prisma.portfolioSnapshot.create({
      data: {
        userId,
        portfolioId,
        totalValue,
        totalCost,
        totalReturn: totalValue - totalCost,
        returnPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
        holdings: JSON.stringify(analyses.map(a => ({
          ticker: a.ticker,
          recommendation: a.finalRecommendation,
          score: a.overallScore,
          confidence: a.overallConfidence
        })))
      }
    });

    console.log(`✅ Stored portfolio analysis snapshot for portfolio ${portfolioId}`);

  } catch (error) {
    console.error('❌ Failed to store portfolio analysis:', error);
  }
}

function calculatePortfolioMetrics(analyses: SevenLayerAnalysis[]): any {
  if (analyses.length === 0) {
    return {
      overallScore: 0,
      overallRisk: 'HIGH',
      diversificationScore: 0,
      recommendations: []
    };
  }

  // Calculate weighted average score
  const overallScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length;

  // Determine overall risk level
  const riskLevels = analyses.map(a => a.riskAssessment);
  const highRiskCount = riskLevels.filter(r => r.includes('HIGH')).length;
  const overallRisk = highRiskCount > analyses.length / 2 ? 'HIGH' : 
                     highRiskCount > 0 ? 'MEDIUM' : 'LOW';

  // Calculate diversification score based on recommendation spread
  const recommendations = analyses.map(a => a.finalRecommendation);
  const uniqueRecs = new Set(recommendations);
  const diversificationScore = Math.min(100, (uniqueRecs.size / analyses.length) * 100);

  // Generate portfolio-level recommendations
  const buyCount = recommendations.filter(r => r.includes('BUY')).length;
  const sellCount = recommendations.filter(r => r.includes('SELL')).length;
  const holdCount = recommendations.filter(r => r === 'HOLD').length;

  const portfolioRecommendations = [];
  if (sellCount > analyses.length * 0.3) {
    portfolioRecommendations.push('Consider reducing portfolio risk by selling underperforming positions');
  }
  if (buyCount > analyses.length * 0.6) {
    portfolioRecommendations.push('Strong portfolio with multiple buy opportunities');
  }
  if (diversificationScore < 50) {
    portfolioRecommendations.push('Increase diversification across different sectors and risk levels');
  }

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    overallRisk,
    diversificationScore: Math.round(diversificationScore),
    recommendations: portfolioRecommendations
  };
}