import { prisma } from '@/app';
import { User, Portfolio, Recommendation, AnalyticsEvent } from '@prisma/client';

interface UserDashboardData {
  user: User;
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  recommendations: Recommendation[];
  analytics: {
    totalValue: number;
    totalReturn: number;
    returnPercentage: number;
    bestPerformingStock: string;
    worstPerformingStock: string;
    riskScore: number;
    diversificationScore: number;
  };
  insights: {
    personalizedInsights: string[];
    actionableRecommendations: string[];
    riskWarnings: string[];
    opportunityAlerts: string[];
  };
  usage: {
    analysisCount: number;
    lastAnalysisDate: Date | null;
    engagementScore: number;
    featureUsage: Record<string, number>;
  };
}

interface PersonalizedAnalytics {
  portfolioComposition: {
    byStock: { symbol: string; value: number; percentage: number }[];
    bySector: { sector: string; value: number; percentage: number }[];
    concentrationRisk: number;
  };
  performance: {
    totalReturn: number;
    returnPercentage: number;
    vsMarketIndex: number;
    timeWeightedReturn: number;
    volatility: number;
  };
  recommendations: {
    followed: number;
    ignored: number;
    accuracy: number;
    avgReturn: number;
  };
  riskProfile: {
    overallRisk: 'Conservative' | 'Moderate' | 'Aggressive';
    concentrationRisk: number;
    sectorRisk: number;
    volatilityRisk: number;
  };
}

export class PersonalizedDashboardService {
  
  /**
   * Get comprehensive dashboard data for a user
   */
  async getUserDashboard(userId: string): Promise<UserDashboardData> {
    console.log(`🎯 Loading personalized dashboard for user: ${userId}`);
    
    // Load user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        portfolios: {
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' }
        },
        recommendations: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        analyticsEvents: {
          orderBy: { createdAt: 'desc' },
          take: 100
        },
        userPerformance: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const activePortfolio = user.portfolios[0] || null;
    const analytics = await this.calculatePersonalizedAnalytics(userId, activePortfolio);
    const insights = await this.generatePersonalizedInsights(userId, user, activePortfolio, analytics);
    const usage = await this.calculateUsageMetrics(userId, user.analyticsEvents);

    return {
      user,
      portfolios: user.portfolios,
      activePortfolio,
      recommendations: user.recommendations,
      analytics: {
        totalValue: analytics.performance.totalReturn,
        totalReturn: analytics.performance.totalReturn,
        returnPercentage: analytics.performance.returnPercentage,
        bestPerformingStock: analytics.portfolioComposition.byStock[0]?.symbol || '',
        worstPerformingStock: analytics.portfolioComposition.byStock.slice(-1)[0]?.symbol || '',
        riskScore: analytics.portfolioComposition.concentrationRisk,
        diversificationScore: 100 - analytics.portfolioComposition.concentrationRisk
      },
      insights,
      usage
    };
  }

  /**
   * Calculate personalized analytics for user's portfolio
   */
  private async calculatePersonalizedAnalytics(
    userId: string, 
    portfolio: Portfolio | null
  ): Promise<PersonalizedAnalytics> {
    
    if (!portfolio) {
      return this.getDefaultAnalytics();
    }

    const stocks = portfolio.stocks as any[];
    const totalValue = stocks.reduce((sum, stock) => sum + (stock.marketValue || 0), 0);

    // Portfolio composition analysis
    const byStock = stocks.map(stock => ({
      symbol: stock.ticker || stock.symbol,
      value: stock.marketValue || 0,
      percentage: ((stock.marketValue || 0) / totalValue) * 100
    })).sort((a, b) => b.value - a.value);

    // Sector analysis (simplified)
    const sectorMapping = this.getSectorMapping();
    const bySector = this.groupBySector(byStock, sectorMapping);

    // Risk calculations
    const concentrationRisk = this.calculateConcentrationRisk(byStock);
    const sectorRisk = this.calculateSectorRisk(bySector);

    // Performance calculations (mock for now - would use real historical data)
    const performance = await this.calculatePortfolioPerformance(userId, portfolio);

    // Recommendations analysis
    const recommendationsAnalysis = await this.analyzeRecommendationsPerformance(userId);

    return {
      portfolioComposition: {
        byStock,
        bySector,
        concentrationRisk
      },
      performance,
      recommendations: recommendationsAnalysis,
      riskProfile: {
        overallRisk: this.determineRiskProfile(concentrationRisk, sectorRisk),
        concentrationRisk,
        sectorRisk,
        volatilityRisk: performance.volatility
      }
    };
  }

  /**
   * Generate personalized insights based on user's data
   */
  private async generatePersonalizedInsights(
    userId: string,
    user: User,
    portfolio: Portfolio | null,
    analytics: PersonalizedAnalytics
  ) {
    const insights = {
      personalizedInsights: [] as string[],
      actionableRecommendations: [] as string[],
      riskWarnings: [] as string[],
      opportunityAlerts: [] as string[]
    };

    if (!portfolio) {
      insights.personalizedInsights.push(
        "Welcome! Upload your portfolio to get personalized AI-powered investment analysis."
      );
      return insights;
    }

    // Concentration risk insights
    if (analytics.portfolioComposition.concentrationRisk > 50) {
      insights.riskWarnings.push(
        `High concentration risk: ${analytics.portfolioComposition.concentrationRisk.toFixed(1)}% of portfolio in top holdings`
      );
      insights.actionableRecommendations.push(
        "Consider diversifying your portfolio across more stocks to reduce concentration risk"
      );
    }

    // Performance insights
    if (analytics.performance.returnPercentage > 10) {
      insights.personalizedInsights.push(
        `Excellent performance! Your portfolio is up ${analytics.performance.returnPercentage.toFixed(1)}%`
      );
    } else if (analytics.performance.returnPercentage < -5) {
      insights.personalizedInsights.push(
        `Portfolio down ${Math.abs(analytics.performance.returnPercentage).toFixed(1)}%. Review your holdings for rebalancing opportunities.`
      );
    }

    // Sector diversification
    const topSector = analytics.portfolioComposition.bySector[0];
    if (topSector && topSector.percentage > 40) {
      insights.riskWarnings.push(
        `High sector concentration: ${topSector.percentage.toFixed(1)}% in ${topSector.sector}`
      );
    }

    // Recommendations follow-through
    if (analytics.recommendations.followed < 50) {
      insights.actionableRecommendations.push(
        "You've followed less than 50% of our recommendations. Consider implementing more suggestions to optimize returns."
      );
    }

    // Nigerian market specific insights
    insights.personalizedInsights.push(
      "Nigerian market focus: CBN rate at 27.50% supports banking sector margins"
    );

    // User engagement insights
    const daysSinceLastLogin = Math.floor((Date.now() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastLogin > 7) {
      insights.opportunityAlerts.push(
        "You've been away for a while. Market conditions have changed - check for new opportunities!"
      );
    }

    return insights;
  }

  /**
   * Calculate usage metrics and engagement score
   */
  private async calculateUsageMetrics(userId: string, events: AnalyticsEvent[]) {
    const analysisEvents = events.filter(e => e.eventName.includes('analysis'));
    const lastAnalysisEvent = analysisEvents[0];

    // Feature usage tracking
    const featureUsage: Record<string, number> = {};
    events.forEach(event => {
      const feature = event.eventName.split('_')[0];
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;
    });

    // Engagement score calculation (0-100)
    const engagementScore = this.calculateEngagementScore(events);

    return {
      analysisCount: analysisEvents.length,
      lastAnalysisDate: lastAnalysisEvent?.createdAt || null,
      engagementScore,
      featureUsage
    };
  }

  /**
   * Save user interaction for personalization
   */
  async trackUserInteraction(userId: string, eventName: string, eventData: any) {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName,
        eventData
      }
    });

    console.log(`📊 Tracked interaction: ${eventName} for user ${userId}`);
  }

  /**
   * Save portfolio analysis results
   */
  async savePortfolioAnalysis(
    userId: string, 
    portfolioId: string, 
    analysisResults: any
  ) {
    // Update portfolio with latest analysis
    await prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        updatedAt: new Date()
      }
    });

    // Track analysis event
    await this.trackUserInteraction(userId, 'portfolio_analyzed', {
      portfolioId,
      analysisDate: new Date(),
      resultsSummary: {
        totalStocks: analysisResults.stocks?.length || 0,
        avgConfidence: analysisResults.avgConfidence || 0,
        recommendations: analysisResults.recommendations?.length || 0
      }
    });

    console.log(`💾 Saved portfolio analysis for user ${userId}, portfolio ${portfolioId}`);
  }

  /**
   * Get user's analysis history
   */
  async getAnalysisHistory(userId: string, limit: number = 10) {
    const analysisEvents = await prisma.analyticsEvent.findMany({
      where: {
        userId,
        eventName: 'portfolio_analyzed'
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return analysisEvents.map(event => ({
      date: event.createdAt,
      data: event.eventData
    }));
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: {
    riskTolerance?: string;
    timeHorizon?: string;
    investmentGoals?: string[];
    notificationSettings?: any;
  }) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        riskTolerance: preferences.riskTolerance || undefined
      }
    });

    // Track preference update
    await this.trackUserInteraction(userId, 'preferences_updated', preferences);

    console.log(`⚙️ Updated preferences for user ${userId}`);
  }

  // Helper methods
  private getDefaultAnalytics(): PersonalizedAnalytics {
    return {
      portfolioComposition: {
        byStock: [],
        bySector: [],
        concentrationRisk: 0
      },
      performance: {
        totalReturn: 0,
        returnPercentage: 0,
        vsMarketIndex: 0,
        timeWeightedReturn: 0,
        volatility: 0
      },
      recommendations: {
        followed: 0,
        ignored: 0,
        accuracy: 0,
        avgReturn: 0
      },
      riskProfile: {
        overallRisk: 'Moderate',
        concentrationRisk: 0,
        sectorRisk: 0,
        volatilityRisk: 0
      }
    };
  }

  private getSectorMapping(): Record<string, string> {
    return {
      'MTNN': 'Telecommunications',
      'DANGSUGAR': 'Consumer Goods',
      'NESTLE': 'Consumer Goods', 
      'UBA': 'Banking',
      'WEMABANK': 'Banking',
      'ZENITHBANK': 'Banking',
      'ACCESSCORP': 'Banking',
      'BUACEMENT': 'Industrial',
      'CADBURY': 'Consumer Goods',
      'OANDO': 'Oil & Gas',
      'DANGCEM': 'Industrial'
    };
  }

  private groupBySector(byStock: any[], sectorMapping: Record<string, string>) {
    const sectorTotals: Record<string, number> = {};
    let totalValue = 0;

    byStock.forEach(stock => {
      const sector = sectorMapping[stock.symbol] || 'Other';
      sectorTotals[sector] = (sectorTotals[sector] || 0) + stock.value;
      totalValue += stock.value;
    });

    return Object.entries(sectorTotals)
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: (value / totalValue) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }

  private calculateConcentrationRisk(byStock: any[]): number {
    if (byStock.length === 0) return 0;
    
    // Calculate percentage of top 3 holdings
    const top3Percentage = byStock
      .slice(0, 3)
      .reduce((sum, stock) => sum + stock.percentage, 0);
    
    return top3Percentage;
  }

  private calculateSectorRisk(bySector: any[]): number {
    if (bySector.length === 0) return 0;
    return bySector[0]?.percentage || 0;
  }

  private determineRiskProfile(concentrationRisk: number, sectorRisk: number): 'Conservative' | 'Moderate' | 'Aggressive' {
    if (concentrationRisk > 60 || sectorRisk > 50) return 'Aggressive';
    if (concentrationRisk > 40 || sectorRisk > 30) return 'Moderate';
    return 'Conservative';
  }

  private async calculatePortfolioPerformance(userId: string, portfolio: Portfolio) {
    // Mock performance calculation - would use real market data
    return {
      totalReturn: 150000,
      returnPercentage: 12.5,
      vsMarketIndex: 3.2,
      timeWeightedReturn: 11.8,
      volatility: 18.5
    };
  }

  private async analyzeRecommendationsPerformance(userId: string) {
    const trackers = await prisma.recommendationTracker.findMany({
      where: { userId }
    });

    const followed = trackers.filter(t => t.wasFollowed).length;
    const total = trackers.length;
    const ignored = total - followed;
    const accurate = trackers.filter(t => t.accuracy === 'CORRECT').length;
    const avgReturn = trackers.reduce((sum, t) => sum + (Number(t.actualReturn) || 0), 0) / (followed || 1);

    return {
      followed,
      ignored,
      accuracy: followed > 0 ? (accurate / followed) * 100 : 0,
      avgReturn
    };
  }

  private calculateEngagementScore(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;

    const weights = {
      'portfolio_uploaded': 20,
      'portfolio_analyzed': 15,
      'recommendation_viewed': 5,
      'dashboard_visited': 3,
      'preferences_updated': 10
    };

    const score = events.reduce((sum, event) => {
      const weight = weights[event.eventName as keyof typeof weights] || 1;
      return sum + weight;
    }, 0);

    return Math.min(100, score);
  }
}