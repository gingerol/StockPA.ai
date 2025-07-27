import { EventEmitter } from 'events';
import { nigerianStockDataAggregator } from './NigerianStockDataAggregator';
import { realTimeUpdateManager } from './RealTimeUpdateManager';
import { stockDataCache } from './IntelligentCacheManager';
import { eventDrivenUpdateService } from './EventDrivenUpdateService';
import { dataFreshnessMonitor } from './DataFreshnessMonitor';
import { dataValidationService } from './DataValidationService';

interface IntegrationConfig {
  autoStart: boolean;
  enableValidation: boolean;
  enableMonitoring: boolean;
  enableEventDriven: boolean;
  portfolioSymbols: string[];
  healthCheckInterval: number;
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  components: {
    dataAggregator: 'online' | 'offline' | 'error';
    updateManager: 'running' | 'stopped' | 'error';
    cache: 'healthy' | 'degraded' | 'error';
    eventService: 'active' | 'inactive' | 'error';
    freshnessMonitor: 'monitoring' | 'stopped' | 'error';
    validation: 'active' | 'inactive' | 'error';
  };
  metrics: {
    uptime: number;
    dataFreshness: number;
    cacheHitRate: number;
    validationScore: number;
    alertCount: number;
  };
  lastUpdated: Date;
}

interface PortfolioQuoteRequest {
  symbols: string[];
  includeValidation?: boolean;
  includeFreshness?: boolean;
  forceRefresh?: boolean;
}

interface PortfolioQuoteResponse {
  quotes: Map<string, any>;
  metadata: {
    timestamp: Date;
    totalSymbols: number;
    successfulFetches: number;
    averageConfidence: number;
    averageFreshness: number;
    validationSummary?: any;
  };
}

export class DataIntegrationService extends EventEmitter {
  private config: IntegrationConfig;
  private isInitialized = false;
  private startTime = Date.now();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<IntegrationConfig>) {
    super();

    this.config = {
      autoStart: true,
      enableValidation: true,
      enableMonitoring: true,
      enableEventDriven: true,
      portfolioSymbols: ['MTNN', 'DANGCEM', 'NESTLE', 'UBA', 'ZENITHBANK', 'DANGSUGAR', 'ACCESSCORP'],
      healthCheckInterval: 60 * 1000, // 1 minute
      ...config
    };

    console.log('🔧 Data integration service initialized');
  }

  // Initialize all data services
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Data integration service already initialized');
      return;
    }

    console.log('🚀 Initializing data integration services...');

    try {
      // Step 1: Initialize monitoring services first
      if (this.config.enableMonitoring) {
        console.log('📊 Starting data freshness monitor...');
        await dataFreshnessMonitor.start();
      }

      // Step 2: Initialize event-driven services
      if (this.config.enableEventDriven) {
        console.log('⚡ Starting event-driven update service...');
        eventDrivenUpdateService.setupMarketEventCrons();
        
        // Set up portfolio price monitoring
        this.setupPortfolioMonitoring();
      }

      // Step 3: Initialize update manager
      console.log('🔄 Starting real-time update manager...');
      await realTimeUpdateManager.start();

      // Step 4: Pre-warm cache with portfolio data
      console.log('🔥 Pre-warming cache with portfolio data...');
      await this.preWarmPortfolioCache();

      // Step 5: Start health monitoring
      this.startHealthMonitoring();

      // Step 6: Setup integration event handlers
      this.setupIntegrationEvents();

      this.isInitialized = true;
      console.log('✅ Data integration services started successfully');

      // Emit initialization complete event
      this.emit('initialized', {
        timestamp: new Date(),
        config: this.config
      });

    } catch (error) {
      console.error('❌ Failed to initialize data integration services:', error);
      throw error;
    }
  }

  // Pre-warm cache with portfolio data
  private async preWarmPortfolioCache(): Promise<void> {
    try {
      const quotes = await nigerianStockDataAggregator.getPortfolioQuotes(this.config.portfolioSymbols);
      
      // Cache all quotes
      for (const [symbol, quote] of quotes) {
        stockDataCache.cacheQuote(symbol, quote);
      }

      console.log(`🔥 Pre-warmed cache with ${quotes.size} portfolio quotes`);
    } catch (error) {
      console.error('❌ Failed to pre-warm cache:', error);
    }
  }

  // Setup portfolio monitoring for price changes
  private setupPortfolioMonitoring(): void {
    // Monitor price changes for each symbol
    const checkPriceChanges = async () => {
      for (const symbol of this.config.portfolioSymbols) {
        try {
          const quote = await nigerianStockDataAggregator.getAggregatedQuote(symbol);
          
          // Monitor for price changes
          await eventDrivenUpdateService.monitorPriceChanges(symbol, quote.consensusPrice);
          
          // Monitor for volume spikes (if volume data available)
          const volumeData = quote.prices?.find((p: any) => p.volume);
          if (volumeData) {
            // Use simple heuristic for average volume (would be better with historical data)
            const estimatedAvgVolume = volumeData.volume * 0.7; // Assume current volume is above average
            await eventDrivenUpdateService.monitorVolumeSpike(symbol, volumeData.volume, estimatedAvgVolume);
          }
          
        } catch (error) {
          console.error(`❌ Failed to monitor ${symbol}:`, error.message);
        }
      }
    };

    // Run monitoring every 2 minutes
    setInterval(checkPriceChanges, 2 * 60 * 1000);
    console.log('📊 Portfolio monitoring setup complete');
  }

  // Setup integration event handlers
  private setupIntegrationEvents(): void {
    // Listen for data freshness alerts
    dataFreshnessMonitor.on('alert', (alert) => {
      console.log(`🚨 Freshness alert: ${alert.message}`);
      
      // Trigger immediate update for critical alerts
      if (alert.severity === 'critical' && alert.symbol) {
        realTimeUpdateManager.triggerUpdate([alert.symbol]);
      }
    });

    // Listen for event-driven updates
    eventDrivenUpdateService.on('price_change', async (event) => {
      const symbol = event.symbol;
      if (symbol && this.config.portfolioSymbols.includes(symbol)) {
        console.log(`📈 Portfolio symbol ${symbol} price change detected`);
        
        // Validate the new data if validation is enabled
        if (this.config.enableValidation) {
          const quote = stockDataCache.getQuote(symbol);
          if (quote.data) {
            await dataValidationService.validateStockData(symbol, quote.data);
          }
        }
      }
    });

    console.log('🔌 Integration event handlers setup complete');
  }

  // Start health monitoring
  private startHealthMonitoring(): void {
    const performHealthCheck = async () => {
      try {
        const healthMetrics = await dataValidationService.performSystemHealthCheck();
        
        // Emit health status
        this.emit('health_check', healthMetrics);
        
        // Take action on critical issues
        if (healthMetrics.systemHealth < 50) {
          console.warn(`⚠️ System health degraded: ${healthMetrics.systemHealth}%`);
          
          // Try to restart failed components
          await this.handleHealthIssues(healthMetrics);
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    };

    // Initial health check
    performHealthCheck();
    
    // Schedule periodic health checks
    this.healthCheckTimer = setInterval(performHealthCheck, this.config.healthCheckInterval);
    
    console.log('🏥 Health monitoring started');
  }

  // Handle health issues automatically
  private async handleHealthIssues(healthMetrics: any): Promise<void> {
    for (const issue of healthMetrics.issues) {
      if (issue.severity === 'critical') {
        console.log(`🔧 Attempting to fix critical issue: ${issue.component}`);
        
        switch (issue.component) {
          case 'update_manager':
            try {
              await realTimeUpdateManager.start();
              console.log('✅ Update manager restarted');
            } catch (error) {
              console.error('❌ Failed to restart update manager:', error);
            }
            break;
            
          case 'cache':
            try {
              stockDataCache.clear();
              await this.preWarmPortfolioCache();
              console.log('✅ Cache cleared and re-warmed');
            } catch (error) {
              console.error('❌ Failed to fix cache:', error);
            }
            break;
        }
      }
    }
  }

  // Get comprehensive portfolio quotes
  async getPortfolioQuotes(request: PortfolioQuoteRequest): Promise<PortfolioQuoteResponse> {
    console.log(`📊 Fetching portfolio quotes for ${request.symbols.length} symbols...`);
    
    const startTime = Date.now();
    const quotes = new Map<string, any>();
    let totalConfidence = 0;
    let totalFreshness = 0;
    let successfulFetches = 0;

    // Fetch quotes for each symbol
    for (const symbol of request.symbols) {
      try {
        let quote: any;
        
        if (request.forceRefresh) {
          // Force fresh data
          nigerianStockDataAggregator.clearCache(symbol);
          quote = await nigerianStockDataAggregator.getAggregatedQuote(symbol);
        } else {
          // Use cached data if available and fresh
          const cached = stockDataCache.getQuote(symbol);
          if (cached.data && cached.metadata.age < 5 * 60 * 1000) { // Less than 5 minutes
            quote = cached.data;
          } else {
            quote = await nigerianStockDataAggregator.getAggregatedQuote(symbol);
          }
        }

        // Add validation if requested
        if (request.includeValidation && this.config.enableValidation) {
          const validation = await dataValidationService.validateStockData(symbol, quote);
          quote.validation = validation;
        }

        // Add freshness data if requested
        if (request.includeFreshness && this.config.enableMonitoring) {
          const freshness = dataFreshnessMonitor.getSymbolFreshness(symbol);
          quote.freshness = freshness;
          
          if (freshness) {
            totalFreshness += freshness.freshnessScore;
          }
        }

        quotes.set(symbol, quote);
        totalConfidence += quote.confidence || 0;
        successfulFetches++;
        
      } catch (error) {
        console.error(`❌ Failed to fetch quote for ${symbol}:`, error.message);
        
        // Try to get cached data as fallback
        const cached = stockDataCache.getQuote(symbol);
        if (cached.data) {
          console.log(`📦 Using cached fallback for ${symbol}`);
          quotes.set(symbol, { ...cached.data, isStale: true });
          totalConfidence += (cached.data.confidence || 0) * 0.5; // Reduce confidence for stale data
        }
      }
    }

    const processingTime = Date.now() - startTime;
    
    const response: PortfolioQuoteResponse = {
      quotes,
      metadata: {
        timestamp: new Date(),
        totalSymbols: request.symbols.length,
        successfulFetches,
        averageConfidence: successfulFetches > 0 ? totalConfidence / successfulFetches : 0,
        averageFreshness: request.includeFreshness && successfulFetches > 0 ? 
          totalFreshness / successfulFetches : 0
      }
    };

    console.log(`✅ Portfolio quotes completed: ${successfulFetches}/${request.symbols.length} successful in ${processingTime}ms`);
    
    // Emit portfolio update event
    this.emit('portfolio_update', response);
    
    return response;
  }

  // Get system status
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const healthMetrics = await dataValidationService.performSystemHealthCheck();
      const updateStatus = realTimeUpdateManager.getStatus();
      const cacheStats = stockDataCache.getCacheStats();
      const eventStatus = eventDrivenUpdateService.getStatus();
      const monitorStatus = dataFreshnessMonitor.getStatus();

      return {
        status: this.determineOverallStatus(healthMetrics.systemHealth),
        components: {
          dataAggregator: 'online', // Assume online if no errors
          updateManager: updateStatus.isRunning ? 'running' : 'stopped',
          cache: cacheStats.hitRate > 50 ? 'healthy' : 'degraded',
          eventService: eventStatus.isProcessing ? 'active' : 'inactive',
          freshnessMonitor: monitorStatus.isRunning ? 'monitoring' : 'stopped',
          validation: 'active'
        },
        metrics: {
          uptime: Date.now() - this.startTime,
          dataFreshness: monitorStatus.freshSymbols / Math.max(1, monitorStatus.totalSymbols) * 100,
          cacheHitRate: cacheStats.hitRate,
          validationScore: healthMetrics.systemHealth,
          alertCount: monitorStatus.activeAlerts
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get system status:', error);
      
      return {
        status: 'critical',
        components: {
          dataAggregator: 'error',
          updateManager: 'error',
          cache: 'error',
          eventService: 'error',
          freshnessMonitor: 'error',
          validation: 'error'
        },
        metrics: {
          uptime: Date.now() - this.startTime,
          dataFreshness: 0,
          cacheHitRate: 0,
          validationScore: 0,
          alertCount: 0
        },
        lastUpdated: new Date()
      };
    }
  }

  private determineOverallStatus(systemHealth: number): SystemStatus['status'] {
    if (systemHealth >= 80) return 'healthy';
    if (systemHealth >= 60) return 'degraded';
    if (systemHealth >= 30) return 'critical';
    return 'offline';
  }

  // Trigger manual refresh
  async triggerManualRefresh(symbols?: string[]): Promise<void> {
    const targetSymbols = symbols || this.config.portfolioSymbols;
    console.log(`🔄 Manual refresh triggered for: ${targetSymbols.join(', ')}`);
    
    // Clear cache for target symbols
    targetSymbols.forEach(symbol => {
      stockDataCache.invalidateSymbol(symbol);
    });
    
    // Trigger update manager
    await realTimeUpdateManager.triggerUpdate(targetSymbols);
    
    // Emit refresh event
    this.emit('manual_refresh', {
      symbols: targetSymbols,
      timestamp: new Date()
    });
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down data integration services...');
    
    try {
      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // Stop all services
      realTimeUpdateManager.stop();
      dataFreshnessMonitor.stop();
      eventDrivenUpdateService.shutdown();
      
      // Clear event listeners
      this.removeAllListeners();
      
      this.isInitialized = false;
      console.log('✅ Data integration services shut down successfully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Integration service configuration updated');
    
    // Apply config changes if service is running
    if (this.isInitialized) {
      if (newConfig.portfolioSymbols) {
        this.preWarmPortfolioCache();
      }
    }
  }

  // Check if service is initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Get current configuration
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const dataIntegrationService = new DataIntegrationService();