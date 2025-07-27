import { prisma } from '@/app';
import { Decimal } from '@prisma/client/runtime/library';

export class ReturnCalculationService {
  
  /**
   * Update returns for all tracked recommendations
   * This function is called by a cron job to update market prices and calculate returns
   */
  async updateAllRecommendationReturns(): Promise<void> {
    try {
      console.log('🔄 Starting return calculation update...');
      
      // Get all active recommendation trackers that need price updates
      const trackers = await prisma.recommendationTracker.findMany({
        where: {
          accuracy: 'PENDING', // Still pending or need updates
        },
        include: {
          recommendation: true,
        },
      });

      console.log(`📊 Found ${trackers.length} trackers to update`);

      for (const tracker of trackers) {
        await this.updateTrackerReturns(tracker.id);
      }

      console.log('✅ Return calculation update completed');
    } catch (error) {
      console.error('❌ Error updating recommendation returns:', error);
      throw error;
    }
  }

  /**
   * Update returns for a specific recommendation tracker
   */
  async updateTrackerReturns(trackerId: string): Promise<void> {
    try {
      const tracker = await prisma.recommendationTracker.findUnique({
        where: { id: trackerId },
        include: { recommendation: true },
      });

      if (!tracker) {
        throw new Error(`Tracker ${trackerId} not found`);
      }

      // Get current market price
      const currentPrice = await this.getCurrentPrice(tracker.ticker);
      if (!currentPrice) {
        console.warn(`⚠️ No price data found for ${tracker.ticker}`);
        return;
      }

      // Calculate returns based on action type
      const { actualReturn, missedReturn, accuracy, targetReached } = 
        await this.calculateReturns(tracker, currentPrice);

      // Update the tracker
      await prisma.recommendationTracker.update({
        where: { id: trackerId },
        data: {
          currentPrice: new Decimal(currentPrice),
          priceUpdatedAt: new Date(),
          actualReturn: actualReturn ? new Decimal(actualReturn) : null,
          missedReturn: missedReturn ? new Decimal(missedReturn) : null,
          accuracy: accuracy,
          targetReached: targetReached,
          updatedAt: new Date(),
        },
      });

      // Update user performance stats
      await this.updateUserPerformanceStats(tracker.userId);

    } catch (error) {
      console.error(`❌ Error updating tracker ${trackerId}:`, error);
    }
  }

  /**
   * Calculate returns for a recommendation based on current price
   */
  private async calculateReturns(tracker: any, currentPrice: number) {
    const recommendedPrice = tracker.recommendedPrice.toNumber();
    const targetPrice = tracker.targetPrice?.toNumber();
    const action = tracker.action;
    
    let actualReturn: number | null = null;
    let missedReturn: number | null = null;
    let accuracy: 'CORRECT' | 'INCORRECT' | 'PENDING' = 'PENDING';
    let targetReached = false;

    // Calculate time elapsed since recommendation
    const daysSince = Math.floor(
      (Date.now() - tracker.recommendedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (action) {
      case 'BUY':
        if (tracker.wasFollowed && tracker.actualActionPrice) {
          // User bought the stock - calculate actual return
          const buyPrice = tracker.actualActionPrice.toNumber();
          actualReturn = ((currentPrice - buyPrice) / buyPrice) * 100;
        }
        
        // Calculate what return would be if recommendation was followed
        const potentialBuyReturn = ((currentPrice - recommendedPrice) / recommendedPrice) * 100;
        if (!tracker.wasFollowed) {
          missedReturn = potentialBuyReturn;
        }

        // Check if target was reached
        if (targetPrice && currentPrice >= targetPrice) {
          targetReached = true;
          accuracy = 'CORRECT';
        } else if (daysSince >= 90 && potentialBuyReturn < -10) {
          // After 90 days, if down >10%, consider incorrect
          accuracy = 'INCORRECT';
        }
        break;

      case 'SELL':
        if (tracker.wasFollowed && tracker.actualActionPrice) {
          // User sold the stock - calculate avoided loss/locked gain
          const sellPrice = tracker.actualActionPrice.toNumber();
          actualReturn = ((sellPrice - currentPrice) / currentPrice) * 100;
        }
        
        // Calculate how much loss was avoided by selling
        const avoidedLoss = ((recommendedPrice - currentPrice) / recommendedPrice) * 100;
        if (!tracker.wasFollowed) {
          missedReturn = avoidedLoss;
        }

        // Check accuracy for SELL recommendations
        if (currentPrice < recommendedPrice * 0.9) {
          // Price dropped >10% after sell recommendation
          accuracy = 'CORRECT';
          targetReached = true;
        } else if (daysSince >= 90 && currentPrice > recommendedPrice * 1.1) {
          // After 90 days, if price up >10%, sell was wrong
          accuracy = 'INCORRECT';
        }
        break;

      case 'HOLD':
        // For HOLD, we just track if the position remained stable
        const priceChange = ((currentPrice - recommendedPrice) / recommendedPrice) * 100;
        
        if (Math.abs(priceChange) <= 5) {
          // Price stayed within 5% - good HOLD recommendation
          accuracy = 'CORRECT';
        } else if (daysSince >= 90) {
          // After 90 days, evaluate based on stability
          accuracy = Math.abs(priceChange) <= 15 ? 'CORRECT' : 'INCORRECT';
        }
        break;
    }

    return { actualReturn, missedReturn, accuracy, targetReached };
  }

  /**
   * Get current price for a ticker from market data
   */
  private async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      // First try to get from our market data table
      const marketData = await prisma.marketData.findFirst({
        where: { ticker },
        orderBy: { dataDate: 'desc' },
      });

      if (marketData && this.isRecentPrice(marketData.dataDate)) {
        return marketData.currentPrice.toNumber();
      }

      // If no recent data, try to fetch from external API
      // This would integrate with NGX API or other data sources
      return await this.fetchExternalPrice(ticker);
      
    } catch (error) {
      console.error(`Error getting price for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Check if price data is recent (within last 24 hours)
   */
  private isRecentPrice(dataDate: Date): boolean {
    const hoursSinceUpdate = (Date.now() - dataDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate <= 24;
  }

  /**
   * Fetch price from external API (placeholder)
   */
  private async fetchExternalPrice(ticker: string): Promise<number | null> {
    try {
      // TODO: Implement actual NGX API or Yahoo Finance integration
      // For now, return a simulated price with some randomness
      console.warn(`⚠️ Using simulated price for ${ticker} - implement real API`);
      
      // Get last known price and add some realistic variation
      const lastKnown = await prisma.marketData.findFirst({
        where: { ticker },
        orderBy: { dataDate: 'desc' },
      });

      if (lastKnown) {
        const basePrice = lastKnown.currentPrice.toNumber();
        // Add ±5% random variation
        const variation = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05
        return Math.round(basePrice * (1 + variation) * 100) / 100;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching external price for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Update user performance statistics
   */
  private async updateUserPerformanceStats(userId: string): Promise<void> {
    try {
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

      // Calculate total return
      const totalReturn = followedReturns.reduce((sum, r) => sum + r, 0);

      // Calculate best and worst returns
      const bestReturn = followedReturns.length > 0 ? Math.max(...followedReturns) : null;
      const worstReturn = followedReturns.length > 0 ? Math.min(...followedReturns) : null;

      // Calculate accuracy rate
      const completedPredictions = correctPredictions + incorrectPredictions;
      const accuracyRate = completedPredictions > 0
        ? (correctPredictions / completedPredictions) * 100
        : 0;

      // Calculate action-specific accuracy
      const buyRecommendations = trackers.filter(t => t.action === 'BUY');
      const sellRecommendations = trackers.filter(t => t.action === 'SELL');
      const holdRecommendations = trackers.filter(t => t.action === 'HOLD');

      const buyAccuracy = this.calculateActionAccuracy(buyRecommendations);
      const sellAccuracy = this.calculateActionAccuracy(sellRecommendations);
      const holdAccuracy = this.calculateActionAccuracy(holdRecommendations);

      // Calculate missed opportunities
      const missedOpportunities = trackers
        .filter(t => !t.wasFollowed && t.missedReturn)
        .reduce((sum, t) => sum + t.missedReturn!.toNumber(), 0);

      // Update or create user performance record
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
          totalReturn: new Decimal(totalReturn),
          bestReturn: bestReturn ? new Decimal(bestReturn) : null,
          worstReturn: worstReturn ? new Decimal(worstReturn) : null,
          accuracyRate: new Decimal(accuracyRate),
          buyAccuracy: buyAccuracy ? new Decimal(buyAccuracy) : null,
          sellAccuracy: sellAccuracy ? new Decimal(sellAccuracy) : null,
          holdAccuracy: holdAccuracy ? new Decimal(holdAccuracy) : null,
          missedOpportunities: new Decimal(missedOpportunities),
        },
        update: {
          totalRecommendations,
          followedCount,
          correctPredictions,
          incorrectPredictions,
          pendingPredictions,
          averageReturn: new Decimal(averageReturn),
          totalReturn: new Decimal(totalReturn),
          bestReturn: bestReturn ? new Decimal(bestReturn) : null,
          worstReturn: worstReturn ? new Decimal(worstReturn) : null,
          accuracyRate: new Decimal(accuracyRate),
          buyAccuracy: buyAccuracy ? new Decimal(buyAccuracy) : null,
          sellAccuracy: sellAccuracy ? new Decimal(sellAccuracy) : null,
          holdAccuracy: holdAccuracy ? new Decimal(holdAccuracy) : null,
          missedOpportunities: new Decimal(missedOpportunities),
        },
      });

      console.log(`✅ Updated performance stats for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user performance for ${userId}:`, error);
    }
  }

  /**
   * Calculate accuracy rate for specific action type
   */
  private calculateActionAccuracy(recommendations: any[]): number | null {
    const completed = recommendations.filter(r => 
      r.accuracy === 'CORRECT' || r.accuracy === 'INCORRECT'
    );
    
    if (completed.length === 0) return null;
    
    const correct = completed.filter(r => r.accuracy === 'CORRECT').length;
    return (correct / completed.length) * 100;
  }

  /**
   * Create daily portfolio snapshots for all users
   */
  async createDailyPortfolioSnapshots(): Promise<void> {
    try {
      console.log('📸 Creating daily portfolio snapshots...');
      
      // Get all active portfolios
      const portfolios = await prisma.portfolio.findMany({
        where: { isActive: true },
        include: { user: true },
      });

      for (const portfolio of portfolios) {
        await this.createPortfolioSnapshot(portfolio.userId, portfolio.id);
      }

      console.log(`✅ Created snapshots for ${portfolios.length} portfolios`);
    } catch (error) {
      console.error('❌ Error creating daily snapshots:', error);
    }
  }

  /**
   * Create a snapshot for a specific portfolio
   */
  private async createPortfolioSnapshot(userId: string, portfolioId: string): Promise<void> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
      });

      if (!portfolio) return;

      // Calculate portfolio metrics
      const stocks = portfolio.stocks as any[];
      let totalValue = 0;
      let totalCost = 0;
      const holdings = [];

      for (const stock of stocks) {
        const currentPrice = await this.getCurrentPrice(stock.ticker);
        if (!currentPrice) continue;

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

      // Get market index value (placeholder)
      const marketIndex = new Decimal(50000); // NGX ASI placeholder

      // Create snapshot
      await prisma.portfolioSnapshot.create({
        data: {
          userId,
          portfolioId,
          totalValue: new Decimal(totalValue),
          totalCost: new Decimal(totalCost),
          totalReturn: new Decimal(totalReturn),
          returnPercent: new Decimal(returnPercent),
          holdings: holdings,
          marketIndex,
        },
      });

    } catch (error) {
      console.error(`Error creating snapshot for portfolio ${portfolioId}:`, error);
    }
  }
}

export const returnCalculationService = new ReturnCalculationService();