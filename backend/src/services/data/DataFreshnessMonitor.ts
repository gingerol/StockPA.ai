import { EventEmitter } from 'events';
import { nigerianStockDataAggregator } from './NigerianStockDataAggregator';
import { stockDataCache } from './IntelligentCacheManager';
import { eventDrivenUpdateService } from './EventDrivenUpdateService';

interface FreshnessMetrics {
  symbol: string;
  lastUpdate: Date;
  dataAge: number; // milliseconds
  freshnessScore: number; // 0-100 (100 = fresh, 0 = stale)
  staleness: 'fresh' | 'aging' | 'stale' | 'critical';
  confidence: number;
  sourceHealth: Record<string, boolean>;
  updateFrequency: number; // updates per hour
  failureCount: number;
  consecutiveFailures: number;
}

interface DataQualityMetrics {
  symbol: string;
  priceConsistency: number; // 0-100
  volumeReliability: number; // 0-100
  sourceAgreement: number; // 0-100 (how well sources agree)
  outlierCount: number;
  confidenceScore: number;
  lastValidation: Date;
}

interface MonitorConfig {
  freshThreshold: number; // milliseconds
  agingThreshold: number; // milliseconds
  staleThreshold: number; // milliseconds
  criticalThreshold: number; // milliseconds
  checkInterval: number; // milliseconds
  maxFailures: number;
  minConfidence: number;
  alertThresholds: {
    staleness: number;
    confidence: number;
    failures: number;
  };
}

interface Alert {
  id: string;
  type: 'staleness' | 'quality' | 'failure' | 'source_health';
  severity: 'low' | 'medium' | 'high' | 'critical';
  symbol?: string;
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
}

export class DataFreshnessMonitor extends EventEmitter {
  private config: MonitorConfig;
  private freshnessData: Map<string, FreshnessMetrics> = new Map();
  private qualityData: Map<string, DataQualityMetrics> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private monitorTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Historical data for trend analysis
  private updateHistory: Map<string, Date[]> = new Map();
  private failureHistory: Map<string, Date[]> = new Map();

  constructor(config?: Partial<MonitorConfig>) {
    super();

    this.config = {
      freshThreshold: 2 * 60 * 1000, // 2 minutes
      agingThreshold: 5 * 60 * 1000, // 5 minutes
      staleThreshold: 15 * 60 * 1000, // 15 minutes
      criticalThreshold: 30 * 60 * 1000, // 30 minutes
      checkInterval: 30 * 1000, // 30 seconds
      maxFailures: 5,
      minConfidence: 0.6,
      alertThresholds: {
        staleness: 15 * 60 * 1000, // 15 minutes
        confidence: 0.5,
        failures: 3
      },
      ...config
    };

    console.log('📊 Data freshness monitor initialized');
  }

  // Start monitoring
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Data freshness monitor already running');
      return;
    }

    console.log('🚀 Starting data freshness monitoring...');
    
    // Initial data collection
    await this.performFullCheck();
    
    // Start periodic monitoring
    this.monitorTimer = setInterval(() => {
      this.performFullCheck();
    }, this.config.checkInterval);
    
    this.isRunning = true;
    console.log('✅ Data freshness monitor started');
  }

  // Stop monitoring
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Data freshness monitor not running');
      return;
    }

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    this.isRunning = false;
    console.log('🛑 Data freshness monitor stopped');
  }

  // Perform comprehensive freshness check
  private async performFullCheck(): Promise<void> {
    const portfolioSymbols = ['MTNN', 'DANGCEM', 'NESTLE', 'UBA', 'ZENITHBANK', 'DANGSUGAR', 'ACCESSCORP'];
    
    console.log('🔍 Performing freshness check...');
    
    for (const symbol of portfolioSymbols) {
      await this.checkSymbolFreshness(symbol);
      await this.validateDataQuality(symbol);
    }

    // Check overall system health
    await this.checkSystemHealth();
    
    // Process alerts
    this.processAlerts();
    
    // Emit summary event
    this.emit('freshness_check_complete', {
      timestamp: new Date(),
      symbols: portfolioSymbols.length,
      freshSymbols: this.getFreshSymbolCount(),
      staleSymbols: this.getStaleSymbolCount(),
      alerts: this.alerts.size
    });
  }

  // Check freshness for specific symbol
  private async checkSymbolFreshness(symbol: string): Promise<void> {
    try {
      // Get cache status
      const cacheResult = stockDataCache.getQuote(symbol);
      
      let freshnessMetrics: FreshnessMetrics;
      
      if (cacheResult.data) {
        // Data exists in cache
        const dataAge = cacheResult.metadata.age || 0;
        const staleness = this.calculateStaleness(dataAge);
        const freshnessScore = this.calculateFreshnessScore(dataAge);
        
        freshnessMetrics = {
          symbol,
          lastUpdate: new Date(Date.now() - dataAge),
          dataAge,
          freshnessScore,
          staleness,
          confidence: cacheResult.data.confidence || 0,
          sourceHealth: {},
          updateFrequency: this.calculateUpdateFrequency(symbol),
          failureCount: this.getFailureCount(symbol),
          consecutiveFailures: this.getConsecutiveFailures(symbol)
        };
        
        // Record successful update
        this.recordUpdate(symbol);
        
      } else {
        // No data in cache - try fresh fetch
        try {
          console.log(`🔄 No cached data for ${symbol}, fetching fresh...`);
          const quote = await nigerianStockDataAggregator.getAggregatedQuote(symbol);
          
          freshnessMetrics = {
            symbol,
            lastUpdate: new Date(),
            dataAge: 0,
            freshnessScore: 100,
            staleness: 'fresh',
            confidence: quote.confidence,
            sourceHealth: {},
            updateFrequency: this.calculateUpdateFrequency(symbol),
            failureCount: this.getFailureCount(symbol),
            consecutiveFailures: 0
          };
          
          this.recordUpdate(symbol);
          
        } catch (error) {
          // Fetch failed
          console.error(`❌ Failed to fetch data for ${symbol}:`, error.message);
          
          freshnessMetrics = {
            symbol,
            lastUpdate: this.getLastKnownUpdate(symbol),
            dataAge: Date.now() - this.getLastKnownUpdate(symbol).getTime(),
            freshnessScore: 0,
            staleness: 'critical',
            confidence: 0,
            sourceHealth: {},
            updateFrequency: this.calculateUpdateFrequency(symbol),
            failureCount: this.getFailureCount(symbol) + 1,
            consecutiveFailures: this.getConsecutiveFailures(symbol) + 1
          };
          
          this.recordFailure(symbol);
        }
      }
      
      // Update metrics
      this.freshnessData.set(symbol, freshnessMetrics);
      
      // Check for alerts
      this.checkFreshnessAlerts(freshnessMetrics);
      
    } catch (error) {
      console.error(`❌ Error checking freshness for ${symbol}:`, error);
    }
  }

  // Validate data quality
  private async validateDataQuality(symbol: string): Promise<void> {
    try {
      const cacheResult = stockDataCache.getQuote(symbol);
      
      if (!cacheResult.data) return;
      
      const quote = cacheResult.data;
      
      // Calculate quality metrics
      const priceConsistency = this.calculatePriceConsistency(quote);
      const volumeReliability = this.calculateVolumeReliability(quote);
      const sourceAgreement = this.calculateSourceAgreement(quote);
      const outlierCount = this.countOutliers(quote);
      
      const qualityMetrics: DataQualityMetrics = {
        symbol,
        priceConsistency,
        volumeReliability,
        sourceAgreement,
        outlierCount,
        confidenceScore: quote.confidence || 0,
        lastValidation: new Date()
      };
      
      this.qualityData.set(symbol, qualityMetrics);
      
      // Check for quality alerts
      this.checkQualityAlerts(qualityMetrics);
      
    } catch (error) {
      console.error(`❌ Error validating quality for ${symbol}:`, error);
    }
  }

  // Calculate staleness category
  private calculateStaleness(dataAge: number): 'fresh' | 'aging' | 'stale' | 'critical' {
    if (dataAge <= this.config.freshThreshold) return 'fresh';
    if (dataAge <= this.config.agingThreshold) return 'aging';
    if (dataAge <= this.config.staleThreshold) return 'stale';
    return 'critical';
  }

  // Calculate freshness score (0-100)
  private calculateFreshnessScore(dataAge: number): number {
    const maxAge = this.config.criticalThreshold;
    const score = Math.max(0, 100 - (dataAge / maxAge) * 100);
    return Math.round(score);
  }

  // Calculate price consistency across sources
  private calculatePriceConsistency(quote: any): number {
    if (!quote.prices || quote.prices.length < 2) return 100;
    
    const prices = quote.prices.map((p: any) => p.price);
    const mean = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const variance = prices.reduce((acc: number, price: number) => 
      acc + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    
    // Convert to 0-100 scale (lower variation = higher consistency)
    const consistency = Math.max(0, 100 - (coefficientOfVariation * 1000));
    return Math.round(consistency);
  }

  // Calculate volume reliability
  private calculateVolumeReliability(quote: any): number {
    if (!quote.prices) return 50;
    
    const volumeReports = quote.prices.filter((p: any) => p.volume).length;
    const totalSources = quote.prices.length;
    
    return Math.round((volumeReports / totalSources) * 100);
  }

  // Calculate source agreement
  private calculateSourceAgreement(quote: any): number {
    if (!quote.metadata || !quote.metadata.priceRange) return 100;
    
    const { min, max } = quote.metadata.priceRange;
    const range = max - min;
    const avgPrice = (min + max) / 2;
    const agreementScore = Math.max(0, 100 - (range / avgPrice) * 100);
    
    return Math.round(agreementScore);
  }

  // Count price outliers
  private countOutliers(quote: any): number {
    if (!quote.prices || quote.prices.length < 3) return 0;
    
    const prices = quote.prices.map((p: any) => p.price);
    const mean = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(
      prices.reduce((acc: number, price: number) => 
        acc + Math.pow(price - mean, 2), 0) / prices.length
    );
    
    // Count prices beyond 2 standard deviations
    return prices.filter(price => Math.abs(price - mean) > 2 * stdDev).length;
  }

  // Calculate update frequency
  private calculateUpdateFrequency(symbol: string): number {
    const history = this.updateHistory.get(symbol) || [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentUpdates = history.filter(date => date > oneHourAgo);
    return recentUpdates.length;
  }

  // Get failure count
  private getFailureCount(symbol: string): number {
    const history = this.failureHistory.get(symbol) || [];
    return history.length;
  }

  // Get consecutive failures
  private getConsecutiveFailures(symbol: string): number {
    const updates = this.updateHistory.get(symbol) || [];
    const failures = this.failureHistory.get(symbol) || [];
    
    if (failures.length === 0) return 0;
    
    const lastUpdate = updates[updates.length - 1];
    const lastFailure = failures[failures.length - 1];
    
    if (!lastUpdate || lastFailure > lastUpdate) {
      // Last action was a failure, count consecutive failures
      let consecutive = 0;
      for (let i = failures.length - 1; i >= 0; i--) {
        if (!lastUpdate || failures[i] > lastUpdate) {
          consecutive++;
        } else {
          break;
        }
      }
      return consecutive;
    }
    
    return 0;
  }

  // Get last known update time
  private getLastKnownUpdate(symbol: string): Date {
    const history = this.updateHistory.get(symbol) || [];
    return history.length > 0 ? history[history.length - 1] : new Date(0);
  }

  // Record successful update
  private recordUpdate(symbol: string): void {
    const history = this.updateHistory.get(symbol) || [];
    history.push(new Date());
    
    // Keep only last 50 updates
    if (history.length > 50) history.shift();
    
    this.updateHistory.set(symbol, history);
  }

  // Record failure
  private recordFailure(symbol: string): void {
    const history = this.failureHistory.get(symbol) || [];
    history.push(new Date());
    
    // Keep only last 20 failures
    if (history.length > 20) history.shift();
    
    this.failureHistory.set(symbol, history);
  }

  // Check for freshness alerts
  private checkFreshnessAlerts(metrics: FreshnessMetrics): void {
    // Staleness alert
    if (metrics.dataAge > this.config.alertThresholds.staleness) {
      this.createAlert({
        type: 'staleness',
        severity: metrics.staleness === 'critical' ? 'critical' : 'high',
        symbol: metrics.symbol,
        message: `Data for ${metrics.symbol} is ${metrics.staleness} (${Math.round(metrics.dataAge / 60000)}m old)`,
        details: metrics
      });
    }

    // Confidence alert
    if (metrics.confidence < this.config.alertThresholds.confidence) {
      this.createAlert({
        type: 'quality',
        severity: 'medium',
        symbol: metrics.symbol,
        message: `Low confidence data for ${metrics.symbol} (${(metrics.confidence * 100).toFixed(1)}%)`,
        details: metrics
      });
    }

    // Failure alert
    if (metrics.consecutiveFailures >= this.config.alertThresholds.failures) {
      this.createAlert({
        type: 'failure',
        severity: 'high',
        symbol: metrics.symbol,
        message: `${metrics.consecutiveFailures} consecutive failures for ${metrics.symbol}`,
        details: metrics
      });
    }
  }

  // Check for quality alerts
  private checkQualityAlerts(metrics: DataQualityMetrics): void {
    if (metrics.priceConsistency < 80) {
      this.createAlert({
        type: 'quality',
        severity: 'medium',
        symbol: metrics.symbol,
        message: `Price inconsistency detected for ${metrics.symbol} (${metrics.priceConsistency}% consistency)`,
        details: metrics
      });
    }

    if (metrics.outlierCount > 1) {
      this.createAlert({
        type: 'quality',
        severity: 'low',
        symbol: metrics.symbol,
        message: `${metrics.outlierCount} price outliers detected for ${metrics.symbol}`,
        details: metrics
      });
    }
  }

  // Check system health
  private async checkSystemHealth(): Promise<void> {
    try {
      const sourceHealth = await nigerianStockDataAggregator.checkSourceHealth();
      const healthyCount = Object.values(sourceHealth).filter(h => h).length;
      const totalSources = Object.keys(sourceHealth).length;
      const healthPercentage = (healthyCount / totalSources) * 100;

      if (healthPercentage < 60) {
        this.createAlert({
          type: 'source_health',
          severity: healthPercentage < 30 ? 'critical' : 'high',
          message: `Data source health degraded: ${healthyCount}/${totalSources} sources healthy (${healthPercentage.toFixed(1)}%)`,
          details: sourceHealth
        });
      }
    } catch (error) {
      console.error('❌ Error checking system health:', error);
    }
  }

  // Create alert
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alertId = `${alert.type}_${alert.symbol || 'system'}_${Date.now()}`;
    
    // Check if similar alert already exists (within last 5 minutes)
    const existingAlert = Array.from(this.alerts.values()).find(a => 
      a.type === alert.type && 
      a.symbol === alert.symbol &&
      (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alertId, fullAlert);
    
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Emit alert event
    this.emit('alert', fullAlert);

    // Trigger system response for critical alerts
    if (alert.severity === 'critical' && alert.symbol) {
      eventDrivenUpdateService.emitMarketEvent({
        type: 'system_alert',
        symbol: alert.symbol,
        priority: 'critical',
        source: 'freshness_monitor',
        data: {
          type: 'data_freshness_critical',
          alert: fullAlert
        }
      });
    }
  }

  // Process and cleanup alerts
  private processAlerts(): void {
    const now = Date.now();
    
    // Auto-acknowledge old alerts (24 hours)
    for (const [id, alert] of this.alerts) {
      if (now - alert.timestamp.getTime() > 24 * 60 * 60 * 1000) {
        alert.acknowledged = true;
      }
    }

    // Remove very old alerts (7 days)
    for (const [id, alert] of this.alerts) {
      if (now - alert.timestamp.getTime() > 7 * 24 * 60 * 60 * 1000) {
        this.alerts.delete(id);
      }
    }
  }

  // Public methods
  getFreshSymbolCount(): number {
    let count = 0;
    for (const metrics of this.freshnessData.values()) {
      if (metrics.staleness === 'fresh') count++;
    }
    return count;
  }

  getStaleSymbolCount(): number {
    let count = 0;
    for (const metrics of this.freshnessData.values()) {
      if (metrics.staleness === 'stale' || metrics.staleness === 'critical') count++;
    }
    return count;
  }

  getSymbolFreshness(symbol: string): FreshnessMetrics | null {
    return this.freshnessData.get(symbol) || null;
  }

  getSymbolQuality(symbol: string): DataQualityMetrics | null {
    return this.qualityData.get(symbol) || null;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  // Get comprehensive status
  getStatus(): {
    isRunning: boolean;
    lastCheck: Date;
    totalSymbols: number;
    freshSymbols: number;
    agingSymbols: number;
    staleSymbols: number;
    criticalSymbols: number;
    activeAlerts: number;
    systemHealth: string;
  } {
    const fresh = this.getFreshSymbolCount();
    const stale = this.getStaleSymbolCount();
    const total = this.freshnessData.size;
    
    let aging = 0, critical = 0;
    for (const metrics of this.freshnessData.values()) {
      if (metrics.staleness === 'aging') aging++;
      if (metrics.staleness === 'critical') critical++;
    }

    return {
      isRunning: this.isRunning,
      lastCheck: new Date(),
      totalSymbols: total,
      freshSymbols: fresh,
      agingSymbols: aging,
      staleSymbols: stale - critical,
      criticalSymbols: critical,
      activeAlerts: this.getActiveAlerts().length,
      systemHealth: this.calculateOverallHealth()
    };
  }

  private calculateOverallHealth(): string {
    const fresh = this.getFreshSymbolCount();
    const total = this.freshnessData.size;
    
    if (total === 0) return 'unknown';
    
    const healthPercentage = (fresh / total) * 100;
    
    if (healthPercentage >= 80) return 'excellent';
    if (healthPercentage >= 60) return 'good';
    if (healthPercentage >= 40) return 'fair';
    if (healthPercentage >= 20) return 'poor';
    return 'critical';
  }

  // Shutdown
  shutdown(): void {
    this.stop();
    this.removeAllListeners();
    console.log('🛑 Data freshness monitor shutdown');
  }
}

// Singleton instance
export const dataFreshnessMonitor = new DataFreshnessMonitor();