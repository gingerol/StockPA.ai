import { EventEmitter } from 'events';
import { realTimeUpdateManager } from './RealTimeUpdateManager';
import { nigerianStockDataAggregator } from './NigerianStockDataAggregator';
import { stockDataCache } from './IntelligentCacheManager';

// Event types for the system
interface MarketEvent {
  type: 'price_change' | 'volume_spike' | 'market_open' | 'market_close' | 'news_alert' | 'system_alert';
  symbol?: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
}

interface PriceChangeEvent {
  symbol: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  volume?: number;
  trigger: 'threshold' | 'volatility' | 'time_based';
}

interface VolumeSpikeEvent {
  symbol: string;
  currentVolume: number;
  avgVolume: number;
  volumeMultiplier: number;
  timestamp: Date;
}

interface NewsEvent {
  symbol?: string;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
  source: string;
  impact: 'low' | 'medium' | 'high';
}

// Event handler configuration
interface EventHandlerConfig {
  priceChangeThreshold: number; // Percentage
  volumeSpikeMultiplier: number;
  newsRelevanceThreshold: number;
  maxEventsPerMinute: number;
  enabledEvents: string[];
}

export class EventDrivenUpdateService extends EventEmitter {
  private config: EventHandlerConfig;
  private eventQueue: MarketEvent[] = [];
  private processTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private eventCounts: Map<string, number> = new Map();
  private lastReset = Date.now();

  // Price tracking for change detection
  private lastPrices: Map<string, number> = new Map();
  private priceHistory: Map<string, number[]> = new Map();

  constructor(config?: Partial<EventHandlerConfig>) {
    super();

    this.config = {
      priceChangeThreshold: 2.0, // 2% change triggers event
      volumeSpikeMultiplier: 3.0, // 3x normal volume triggers event
      newsRelevanceThreshold: 0.7,
      maxEventsPerMinute: 30,
      enabledEvents: [
        'price_change', 'volume_spike', 'market_open', 
        'market_close', 'news_alert', 'system_alert'
      ],
      ...config
    };

    this.setupEventHandlers();
    this.startEventProcessor();
    
    console.log('⚡ Event-driven update service initialized');
  }

  // Setup internal event handlers
  private setupEventHandlers(): void {
    // Price change events
    this.on('price_change', this.handlePriceChange.bind(this));
    
    // Volume spike events
    this.on('volume_spike', this.handleVolumeSpike.bind(this));
    
    // Market events
    this.on('market_open', this.handleMarketOpen.bind(this));
    this.on('market_close', this.handleMarketClose.bind(this));
    
    // News events
    this.on('news_alert', this.handleNewsAlert.bind(this));
    
    // System events
    this.on('system_alert', this.handleSystemAlert.bind(this));

    console.log('📋 Event handlers registered');
  }

  // Emit a market event with validation and queuing
  emitMarketEvent(event: Omit<MarketEvent, 'timestamp'>): void {
    // Check if event type is enabled
    if (!this.config.enabledEvents.includes(event.type)) {
      return;
    }

    // Rate limiting check
    if (!this.checkRateLimit(event.type)) {
      console.warn(`⚠️ Rate limit exceeded for event type: ${event.type}`);
      return;
    }

    const fullEvent: MarketEvent = {
      ...event,
      timestamp: new Date()
    };

    // Add to queue for processing
    this.eventQueue.push(fullEvent);
    
    // Emit the event for immediate listeners
    this.emit(event.type, fullEvent);

    console.log(`📡 Event emitted: ${event.type} (${event.symbol || 'system'}) - Priority: ${event.priority}`);
  }

  // Check rate limiting
  private checkRateLimit(eventType: string): boolean {
    const now = Date.now();
    
    // Reset counters every minute
    if (now - this.lastReset > 60000) {
      this.eventCounts.clear();
      this.lastReset = now;
    }

    const currentCount = this.eventCounts.get(eventType) || 0;
    if (currentCount >= this.config.maxEventsPerMinute) {
      return false;
    }

    this.eventCounts.set(eventType, currentCount + 1);
    return true;
  }

  // Monitor price changes and trigger events
  async monitorPriceChanges(symbol: string, currentPrice: number): Promise<void> {
    const lastPrice = this.lastPrices.get(symbol);
    
    if (lastPrice && lastPrice !== currentPrice) {
      const changePercent = Math.abs((currentPrice - lastPrice) / lastPrice) * 100;
      
      if (changePercent >= this.config.priceChangeThreshold) {
        this.emitMarketEvent({
          type: 'price_change',
          symbol,
          priority: changePercent > 5 ? 'high' : 'medium',
          source: 'price_monitor',
          data: {
            oldPrice: lastPrice,
            newPrice: currentPrice,
            changePercent,
            trigger: 'threshold'
          } as PriceChangeEvent
        });
      }
    }

    // Update price tracking
    this.lastPrices.set(symbol, currentPrice);
    
    // Maintain price history for volatility analysis
    const history = this.priceHistory.get(symbol) || [];
    history.push(currentPrice);
    if (history.length > 20) history.shift(); // Keep last 20 prices
    this.priceHistory.set(symbol, history);
  }

  // Monitor volume spikes
  async monitorVolumeSpike(symbol: string, currentVolume: number, avgVolume: number): Promise<void> {
    if (avgVolume > 0) {
      const volumeMultiplier = currentVolume / avgVolume;
      
      if (volumeMultiplier >= this.config.volumeSpikeMultiplier) {
        this.emitMarketEvent({
          type: 'volume_spike',
          symbol,
          priority: volumeMultiplier > 5 ? 'high' : 'medium',
          source: 'volume_monitor',
          data: {
            currentVolume,
            avgVolume,
            volumeMultiplier,
            timestamp: new Date()
          } as VolumeSpikeEvent
        });
      }
    }
  }

  // Detect news-related events
  async processNewsEvent(news: NewsEvent): Promise<void> {
    if (news.relevance >= this.config.newsRelevanceThreshold) {
      this.emitMarketEvent({
        type: 'news_alert',
        symbol: news.symbol,
        priority: news.impact === 'high' ? 'critical' : 
                 news.impact === 'medium' ? 'high' : 'medium',
        source: 'news_processor',
        data: news
      });
    }
  }

  // Event Handlers
  private async handlePriceChange(event: MarketEvent): Promise<void> {
    const data = event.data as PriceChangeEvent;
    console.log(`💰 Price change detected: ${event.symbol} ${data.changePercent.toFixed(2)}%`);
    
    // Trigger immediate price update for this symbol
    if (event.symbol) {
      await this.triggerSymbolUpdate(event.symbol, 'price_change');
      
      // Clear cache for this symbol to force fresh data
      stockDataCache.invalidateSymbol(event.symbol);
    }
  }

  private async handleVolumeSpike(event: MarketEvent): Promise<void> {
    const data = event.data as VolumeSpikeEvent;
    console.log(`📊 Volume spike detected: ${event.symbol} ${data.volumeMultiplier.toFixed(1)}x`);
    
    // Trigger immediate update and mark for enhanced monitoring
    if (event.symbol) {
      await this.triggerSymbolUpdate(event.symbol, 'volume_spike');
    }
  }

  private async handleMarketOpen(event: MarketEvent): Promise<void> {
    console.log('🔔 Market opened - switching to high-frequency monitoring');
    
    // Clear all caches to start fresh
    stockDataCache.clear();
    
    // Trigger immediate full portfolio update
    await realTimeUpdateManager.triggerUpdate();
    
    // Switch to aggressive update mode
    await realTimeUpdateManager.onMarketEvent('market_open');
  }

  private async handleMarketClose(event: MarketEvent): Promise<void> {
    console.log('🔔 Market closed - switching to low-frequency monitoring');
    
    // Trigger final update with end-of-day data
    await realTimeUpdateManager.triggerUpdate();
    
    // Switch to lazy update mode
    await realTimeUpdateManager.onMarketEvent('market_close');
  }

  private async handleNewsAlert(event: MarketEvent): Promise<void> {
    const data = event.data as NewsEvent;
    console.log(`📰 News alert: ${data.headline.substring(0, 50)}... (${event.symbol || 'market'})`);
    
    if (event.symbol) {
      // Trigger immediate update for affected symbol
      await this.triggerSymbolUpdate(event.symbol, 'news');
    } else {
      // Market-wide news - trigger portfolio update
      await realTimeUpdateManager.triggerUpdate();
    }
  }

  private async handleSystemAlert(event: MarketEvent): Promise<void> {
    console.log(`🚨 System alert: ${event.data.message}`);
    
    switch (event.data.type) {
      case 'data_source_failure':
        await this.handleDataSourceFailure(event.data);
        break;
      case 'high_latency':
        await this.handleHighLatency(event.data);
        break;
      case 'cache_corruption':
        await this.handleCacheCorruption(event.data);
        break;
    }
  }

  // Specialized update triggers
  private async triggerSymbolUpdate(symbol: string, reason: string): Promise<void> {
    try {
      console.log(`🔄 Triggering update for ${symbol} (reason: ${reason})`);
      
      // Clear symbol cache first
      nigerianStockDataAggregator.clearCache(symbol);
      
      // Fetch fresh data
      const quote = await nigerianStockDataAggregator.getAggregatedQuote(symbol);
      
      // Cache with high priority
      stockDataCache.cacheQuote(symbol, quote);
      
      console.log(`✅ Updated ${symbol}: ₦${quote.consensusPrice} (confidence: ${quote.confidence})`);
    } catch (error) {
      console.error(`❌ Failed to update ${symbol}:`, error.message);
      
      // Emit system alert for failed update
      this.emitMarketEvent({
        type: 'system_alert',
        priority: 'medium',
        source: 'update_service',
        data: {
          type: 'update_failure',
          symbol,
          error: error.message,
          reason
        }
      });
    }
  }

  // System alert handlers
  private async handleDataSourceFailure(data: any): Promise<void> {
    console.log(`🚨 Data source failure: ${data.source}`);
    
    // Trigger health check
    const health = await nigerianStockDataAggregator.checkSourceHealth();
    
    // If multiple sources failing, trigger fallback mode
    const healthyCount = Object.values(health).filter(h => h).length;
    if (healthyCount < 2) {
      console.warn('⚠️ Multiple data sources failing - entering fallback mode');
      // Could implement fallback to cached data or alternative sources
    }
  }

  private async handleHighLatency(data: any): Promise<void> {
    console.log(`⏱️ High latency detected: ${data.latency}ms`);
    
    // Could adjust update frequencies or timeout values
    if (data.latency > 10000) { // 10 seconds
      console.warn('⚠️ Extremely high latency - reducing update frequency');
    }
  }

  private async handleCacheCorruption(data: any): Promise<void> {
    console.log('🗑️ Cache corruption detected - clearing affected caches');
    
    if (data.symbol) {
      stockDataCache.invalidateSymbol(data.symbol);
    } else {
      stockDataCache.clear();
    }
  }

  // Volatility detection based on price history
  private detectVolatility(symbol: string): number {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 5) return 0;

    // Calculate standard deviation of recent prices
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    
    // Return volatility as percentage of mean
    return (stdDev / mean) * 100;
  }

  // Start the event processor
  private startEventProcessor(): void {
    this.processTimer = setInterval(() => {
      this.processEventQueue();
    }, 1000); // Process every second
  }

  // Process queued events
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    
    try {
      // Sort by priority and timestamp
      this.eventQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      // Process up to 5 events per cycle
      const eventsToProcess = this.eventQueue.splice(0, 5);
      
      for (const event of eventsToProcess) {
        await this.processEvent(event);
      }
      
    } catch (error) {
      console.error('❌ Error processing event queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual event
  private async processEvent(event: MarketEvent): Promise<void> {
    console.log(`⚡ Processing ${event.type} event for ${event.symbol || 'system'}`);
    
    // Additional processing logic can be added here
    // This could include logging, metrics collection, etc.
  }

  // Public interface methods
  async triggerPriceAlert(symbol: string, targetPrice: number, currentPrice: number): Promise<void> {
    const changePercent = Math.abs((currentPrice - targetPrice) / targetPrice) * 100;
    
    this.emitMarketEvent({
      type: 'price_change',
      symbol,
      priority: 'high',
      source: 'user_alert',
      data: {
        oldPrice: targetPrice,
        newPrice: currentPrice,
        changePercent,
        trigger: 'user_defined'
      }
    });
  }

  // Get service status
  getStatus(): {
    queueSize: number;
    isProcessing: boolean;
    eventCounts: Record<string, number>;
    config: EventHandlerConfig;
    monitoredSymbols: string[];
  } {
    return {
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      eventCounts: Object.fromEntries(this.eventCounts),
      config: this.config,
      monitoredSymbols: Array.from(this.lastPrices.keys())
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<EventHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Event service configuration updated');
  }

  // Shutdown service
  shutdown(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
    this.removeAllListeners();
    console.log('🛑 Event-driven update service shutdown');
  }
}

// Singleton instance
export const eventDrivenUpdateService = new EventDrivenUpdateService();