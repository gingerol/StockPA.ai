import { nigerianStockDataAggregator } from './NigerianStockDataAggregator';
import cron from 'node-cron';

interface MarketSchedule {
  openTime: string;
  closeTime: string;
  timezone: string;
  isMarketDay: (date: Date) => boolean;
}

interface UpdateConfig {
  tradingHoursInterval: number; // milliseconds
  afterHoursInterval: number; // milliseconds
  maxRetries: number;
  symbols: string[];
}

export class RealTimeUpdateManager {
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private config: UpdateConfig;
  private lastUpdateTime = new Date();
  private marketSchedule: MarketSchedule;
  
  constructor() {
    this.config = {
      tradingHoursInterval: 30 * 1000, // 30 seconds during trading
      afterHoursInterval: 5 * 60 * 1000, // 5 minutes after hours
      maxRetries: 3,
      symbols: ['MTNN', 'DANGCEM', 'NESTLE', 'UBA', 'ZENITHBANK', 'DANGSUGAR', 'ACCESSCORP']
    };

    // Nigerian Stock Exchange (NGX) schedule
    this.marketSchedule = {
      openTime: '10:00',
      closeTime: '14:30',
      timezone: 'Africa/Lagos',
      isMarketDay: (date: Date) => {
        const day = date.getDay();
        return day >= 1 && day <= 5; // Monday to Friday
      }
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Real-time update manager already running');
      return;
    }

    console.log('🚀 Starting Real-Time Update Manager for Nigerian Stock Data');
    
    // Immediate initial fetch
    await this.performUpdate();
    
    // Schedule regular updates based on market hours
    this.scheduleUpdates();
    
    this.isRunning = true;
    console.log('✅ Real-Time Update Manager started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Real-time update manager not running');
      return;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isRunning = false;
    console.log('🛑 Real-Time Update Manager stopped');
  }

  private scheduleUpdates(): void {
    // Schedule different update frequencies based on market status
    const checkAndUpdate = () => {
      const now = new Date();
      const isMarketOpen = this.isMarketOpen(now);
      
      if (isMarketOpen) {
        // During trading hours: update every 30 seconds
        this.scheduleNextUpdate(this.config.tradingHoursInterval);
        console.log('📈 Market open - using high-frequency updates (30s)');
      } else {
        // After hours: update every 5 minutes to catch late news
        this.scheduleNextUpdate(this.config.afterHoursInterval);
        console.log('🌙 Market closed - using low-frequency updates (5m)');
      }
    };

    // Initial scheduling
    checkAndUpdate();
    
    // Re-evaluate schedule every hour to adjust for market open/close
    setInterval(checkAndUpdate, 60 * 60 * 1000); // 1 hour
  }

  private scheduleNextUpdate(interval: number): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.performUpdate();
    }, interval);
  }

  private async performUpdate(): Promise<void> {
    console.log(`🔄 Performing scheduled data update at ${new Date().toISOString()}`);
    
    try {
      // Clear cache to force fresh data
      this.config.symbols.forEach(symbol => {
        nigerianStockDataAggregator.clearCache(symbol);
      });

      // Fetch fresh data for all portfolio symbols
      const updatePromises = this.config.symbols.map(async (symbol) => {
        try {
          const quote = await nigerianStockDataAggregator.getAggregatedQuote(symbol);
          console.log(`✅ Updated ${symbol}: ₦${quote.consensusPrice} (confidence: ${quote.confidence})`);
          return { symbol, success: true, quote };
        } catch (error) {
          console.error(`❌ Failed to update ${symbol}:`, error.message);
          return { symbol, success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      console.log(`📊 Update completed: ${successful}/${this.config.symbols.length} symbols updated`);
      
      this.lastUpdateTime = new Date();
      
      // Health check on data sources after update
      await this.performHealthCheck();

    } catch (error) {
      console.error('❌ Update cycle failed:', error);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await nigerianStockDataAggregator.checkSourceHealth();
      const healthyCount = Object.values(health).filter(h => h).length;
      const totalSources = Object.keys(health).length;
      
      if (healthyCount < totalSources * 0.6) { // Less than 60% healthy
        console.warn(`⚠️ Data source health degraded: ${healthyCount}/${totalSources} sources healthy`);
        console.warn('🏥 Health status:', health);
      } else {
        console.log(`🏥 Data sources healthy: ${healthyCount}/${totalSources}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  private isMarketOpen(date: Date): boolean {
    // Check if it's a market day
    if (!this.marketSchedule.isMarketDay(date)) {
      return false;
    }

    // Convert to Nigerian time (WAT)
    const nigTime = new Date(date.toLocaleString("en-US", {timeZone: this.marketSchedule.timezone}));
    const hours = nigTime.getHours();
    const minutes = nigTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // NGX trading hours: 10:00 - 14:30 WAT
    const openTimeMinutes = 10 * 60; // 10:00
    const closeTimeMinutes = 14 * 60 + 30; // 14:30

    return timeInMinutes >= openTimeMinutes && timeInMinutes <= closeTimeMinutes;
  }

  // Manual trigger for immediate update
  async triggerUpdate(symbols?: string[]): Promise<void> {
    const updateSymbols = symbols || this.config.symbols;
    console.log(`🔄 Manual update triggered for: ${updateSymbols.join(', ')}`);
    
    try {
      const results = await nigerianStockDataAggregator.getPortfolioQuotes(updateSymbols);
      console.log(`✅ Manual update completed: ${results.size} quotes fetched`);
    } catch (error) {
      console.error('❌ Manual update failed:', error);
    }
  }

  // Get manager status
  getStatus(): {
    isRunning: boolean;
    lastUpdate: Date;
    marketOpen: boolean;
    nextUpdateIn: number;
    config: UpdateConfig;
  } {
    const now = new Date();
    const marketOpen = this.isMarketOpen(now);
    const nextInterval = marketOpen ? 
      this.config.tradingHoursInterval : 
      this.config.afterHoursInterval;

    return {
      isRunning: this.isRunning,
      lastUpdate: this.lastUpdateTime,
      marketOpen,
      nextUpdateIn: nextInterval,
      config: this.config
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<UpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Update manager configuration updated:', this.config);
    
    // Restart if running to apply new config
    if (this.isRunning) {
      console.log('🔄 Restarting with new configuration...');
      this.stop();
      this.start();
    }
  }

  // Event-driven update trigger for specific events
  async onMarketEvent(event: 'market_open' | 'market_close' | 'major_news' | 'price_alert', data?: any): Promise<void> {
    console.log(`📢 Market event triggered: ${event}`, data);
    
    switch (event) {
      case 'market_open':
        console.log('🔔 Market opened - switching to high-frequency updates');
        this.scheduleNextUpdate(this.config.tradingHoursInterval);
        await this.triggerUpdate();
        break;
        
      case 'market_close':
        console.log('🔔 Market closed - switching to low-frequency updates');
        this.scheduleNextUpdate(this.config.afterHoursInterval);
        break;
        
      case 'major_news':
        console.log('📰 Major news detected - triggering immediate update');
        await this.triggerUpdate(data?.symbols);
        break;
        
      case 'price_alert':
        console.log('💰 Price alert triggered - updating specific symbol');
        if (data?.symbol) {
          await this.triggerUpdate([data.symbol]);
        }
        break;
    }
  }

  // Setup cron jobs for market open/close events
  setupMarketEventCrons(): void {
    // Market open at 10:00 WAT (Monday-Friday)
    cron.schedule('0 10 * * 1-5', () => {
      this.onMarketEvent('market_open');
    }, {
      timezone: this.marketSchedule.timezone
    });

    // Market close at 14:30 WAT (Monday-Friday)
    cron.schedule('30 14 * * 1-5', () => {
      this.onMarketEvent('market_close');
    }, {
      timezone: this.marketSchedule.timezone
    });

    console.log('⏰ Market event cron jobs scheduled for NGX hours');
  }
}

// Singleton instance
export const realTimeUpdateManager = new RealTimeUpdateManager();