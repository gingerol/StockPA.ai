import express from 'express';
import { authenticate, requirePro } from '@/middleware/auth';
import { aiEnsembleService } from '@/services/ai/AIEnsembleService';
import { prisma } from '@/app';
import { Decimal } from '@prisma/client/runtime/library';

const router = express.Router();

// Generate recommendations for portfolio
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { portfolioId, riskTolerance = 'moderate', timeHorizon = '1-3 months' } = req.body;
    const userId = req.user.id;

    // Get portfolio data
    const portfolio = await prisma.portfolio.findFirst({
      where: { 
        id: portfolioId || undefined,
        userId 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const stocks = portfolio.stocks as any[];
    const recommendations = [];

    console.log(`🤖 Generating AI recommendations for ${stocks.length} stocks`);

    // Generate recommendation for each stock using AI ensemble
    for (const stock of stocks) {
      try {
        const analysisRequest = {
          type: 'stock_analysis' as const,
          ticker: stock.ticker,
          riskTolerance,
          timeHorizon,
          context: `Stock held in portfolio with quantity: ${stock.quantity}, purchase price: ${stock.purchasePrice || 'unknown'}`
        };

        // Get AI ensemble analysis
        const aiResult = await aiEnsembleService.analyzeStock(analysisRequest);
        
        // Map AI result to our recommendation format
        const recommendation = await prisma.recommendation.create({
          data: {
            userId,
            portfolioId: portfolio.id,
            ticker: stock.ticker,
            action: aiResult.finalRecommendation,
            confidence: mapConfidenceLevel(aiResult.confidence),
            currentPrice: new Decimal(stock.currentPrice || 0),
            targetPrice: null, // Will be extracted from AI reasoning
            potentialReturn: null, // Will be calculated
            riskLevel: mapRiskLevel(aiResult.riskAssessment),
            timeHorizon,
            reasoning: aiResult.reasoning,
            isActive: true
          }
        });

        // Create recommendation tracker for performance monitoring
        await prisma.recommendationTracker.create({
          data: {
            recommendationId: recommendation.id,
            userId,
            ticker: stock.ticker,
            action: aiResult.finalRecommendation,
            confidence: mapConfidenceLevel(aiResult.confidence),
            recommendedPrice: new Decimal(stock.currentPrice || 0),
            recommendedAt: new Date()
          }
        });

        recommendations.push({
          ...recommendation,
          aiAnalysis: {
            consensusLevel: aiResult.consensusLevel,
            modelResponses: aiResult.modelResponses.length,
            processingTime: aiResult.timeToProcess
          }
        });

      } catch (stockError) {
        console.error(`❌ Error analyzing ${stock.ticker}:`, stockError);
        
        // Create fallback recommendation
        const fallbackRecommendation = await prisma.recommendation.create({
          data: {
            userId,
            portfolioId: portfolio.id,
            ticker: stock.ticker,
            action: 'HOLD',
            confidence: 'LOW',
            currentPrice: new Decimal(stock.currentPrice || 0),
            riskLevel: 'MEDIUM',
            timeHorizon,
            reasoning: 'AI analysis temporarily unavailable. Conservative HOLD recommendation.',
            isActive: true
          }
        });

        recommendations.push(fallbackRecommendation);
      }
    }

    console.log(`✅ Generated ${recommendations.length} AI-powered recommendations`);

    res.json({
      success: true,
      message: `Generated ${recommendations.length} AI-powered recommendations`,
      data: {
        recommendations,
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          stockCount: stocks.length
        },
        aiMetrics: {
          totalAnalysisTime: recommendations.reduce((sum, r) => sum + (r.aiAnalysis?.processingTime || 0), 0),
          modelsUsed: 'Multi-model AI ensemble (Llama2, Mistral, FinGPT)',
          analysisLayers: 7
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
});

// Get recommendations for user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { portfolioId, isActive = true } = req.query;

    const where: any = { userId };
    if (portfolioId) where.portfolioId = portfolioId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const recommendations = await prisma.recommendation.findMany({
      where,
      include: {
        portfolio: {
          select: { id: true, name: true }
        },
        tracker: {
          select: {
            wasFollowed: true,
            actualReturn: true,
            missedReturn: true,
            accuracy: true,
            targetReached: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('❌ Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    });
  }
});

// Get specific recommendation
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const recommendationId = req.params.id;

    const recommendation = await prisma.recommendation.findFirst({
      where: { 
        id: recommendationId,
        userId 
      },
      include: {
        portfolio: {
          select: { id: true, name: true }
        },
        tracker: true
      }
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }

    res.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    console.error('❌ Error fetching recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendation',
      error: error.message
    });
  }
});

// Get full explanation (now free for all users)
router.get('/:id/explanation', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const recommendationId = req.params.id;

    const recommendation = await prisma.recommendation.findFirst({
      where: { 
        id: recommendationId,
        userId 
      },
      include: {
        tracker: true
      }
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }

    // Generate enhanced explanation using AI if needed
    try {
      const enhancedAnalysis = await aiEnsembleService.analyzeStock({
        type: 'stock_analysis',
        ticker: recommendation.ticker,
        context: `Detailed explanation request for existing recommendation: ${recommendation.action}`
      });

      res.json({
        success: true,
        data: {
          originalReasoning: recommendation.reasoning,
          enhancedAnalysis: enhancedAnalysis.reasoning,
          aiConsensus: enhancedAnalysis.consensusLevel,
          riskFactors: enhancedAnalysis.riskAssessment,
          modelInsights: enhancedAnalysis.modelResponses.map(r => ({
            model: r.modelName,
            confidence: r.confidence,
            recommendation: r.recommendation,
            keyPoints: r.reasoning
          })),
          performance: recommendation.tracker ? {
            wasFollowed: recommendation.tracker.wasFollowed,
            accuracy: recommendation.tracker.accuracy,
            actualReturn: recommendation.tracker.actualReturn?.toString(),
            missedReturn: recommendation.tracker.missedReturn?.toString()
          } : null
        }
      });

    } catch (aiError) {
      console.error('❌ Error getting enhanced explanation:', aiError);
      
      // Fallback to original reasoning
      res.json({
        success: true,
        data: {
          originalReasoning: recommendation.reasoning,
          enhancedAnalysis: 'Enhanced AI analysis temporarily unavailable',
          performance: recommendation.tracker ? {
            wasFollowed: recommendation.tracker.wasFollowed,
            accuracy: recommendation.tracker.accuracy,
            actualReturn: recommendation.tracker.actualReturn?.toString(),
            missedReturn: recommendation.tracker.missedReturn?.toString()
          } : null
        }
      });
    }

  } catch (error) {
    console.error('❌ Error fetching recommendation explanation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendation explanation',
      error: error.message
    });
  }
});

// Health check for AI system
router.get('/system/health', authenticate, async (req, res) => {
  try {
    const healthStatus = await aiEnsembleService.healthCheck();
    
    res.json({
      success: true,
      data: {
        aiSystem: healthStatus,
        timestamp: new Date(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('❌ Error checking AI system health:', error);
    res.status(503).json({
      success: false,
      message: 'AI system health check failed',
      error: error.message
    });
  }
});

// Helper functions
function mapConfidenceLevel(confidence: number): string {
  if (confidence >= 0.8) return 'HIGH';
  if (confidence >= 0.6) return 'MEDIUM';
  return 'LOW';
}

function mapRiskLevel(riskAssessment: string): string {
  if (riskAssessment.includes('LOW')) return 'LOW';
  if (riskAssessment.includes('HIGH')) return 'HIGH';
  return 'MEDIUM';
}

export default router;