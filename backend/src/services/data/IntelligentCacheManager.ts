interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  metadata: {
    dataSource: string;
    confidence: number;
    isStale: boolean;
    updateStrategy: 'aggressive' | 'normal' | 'lazy';
  };
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  memoryUsage: number;
  staleness: {
    fresh: number;
    aging: number;
    stale: number;
  };
}

interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  stalenessThreshold: number;
  cleanupInterval: number;
  priorityWeights: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export class IntelligentCacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    accessCount: 0
  };
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      stalenessThreshold: 15 * 60 * 1000, // 15 minutes
      cleanupInterval: 2 * 60 * 1000, // 2 minutes
      priorityWeights: {
        low: 1,
        medium: 3,
        high: 7,
        critical: 15
      },
      ...config
    };

    this.startCleanupTimer();
  }

  // Intelligent get with staleness awareness
  get(key: string): { data: T | null; metadata: any } {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateAccessStats(startTime);
      return { data: null, metadata: { reason: 'cache_miss' } };
    }

    // Update access patterns
    entry.accessCount++;
    entry.lastAccessed = new Date();

    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    const isExpired = age > entry.ttl;
    const isStale = age > this.config.stalenessThreshold;

    // Return data with freshness metadata
    if (isExpired) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateAccessStats(startTime);
      return { 
        data: null, 
        metadata: { 
          reason: 'expired', 
          age, 
          ttl: entry.ttl 
        } 
      };
    }

    this.stats.hits++;
    this.updateAccessStats(startTime);

    return {
      data: entry.data,
      metadata: {
        age,
        isStale,
        confidence: entry.metadata.confidence,
        accessCount: entry.accessCount,
        priority: entry.priority,
        freshness: this.calculateFreshness(entry)
      }
    };
  }

  // Smart set with adaptive TTL based on data characteristics
  set(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      dataSource?: string;
      confidence?: number;
      updateStrategy?: 'aggressive' | 'normal' | 'lazy';
    } = {}
  ): void {
    // Calculate adaptive TTL based on data characteristics
    const adaptiveTtl = this.calculateAdaptiveTtl(data, options);

    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl: adaptiveTtl,
      accessCount: 0,
      lastAccessed: new Date(),
      priority: options.priority || 'medium',
      tags: options.tags || [],
      metadata: {
        dataSource: options.dataSource || 'unknown',
        confidence: options.confidence || 0.5,
        isStale: false,
        updateStrategy: options.updateStrategy || 'normal'
      }
    };

    // Enforce cache size limits with intelligent eviction
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastValuable();
    }

    this.cache.set(key, entry);
    console.log(`💾 Cached ${key} with TTL ${adaptiveTtl}ms (priority: ${entry.priority})`);
  }

  // Calculate adaptive TTL based on data patterns and market conditions
  private calculateAdaptiveTtl(data: T, options: any): number {
    let baseTtl = options.ttl || this.config.defaultTtl;

    // Adjust TTL based on confidence
    const confidence = options.confidence || 0.5;
    const confidenceMultiplier = 0.5 + confidence; // 0.5x to 1.5x
    baseTtl *= confidenceMultiplier;

    // Adjust TTL based on priority
    const priorityMultipliers = {
      low: 2.0,      // Low priority data can stay longer
      medium: 1.0,   // Standard TTL
      high: 0.7,     // High priority data refreshes more frequently
      critical: 0.3  // Critical data refreshes very frequently
    };
    baseTtl *= priorityMultipliers[options.priority || 'medium'];

    // Adjust TTL based on update strategy
    const strategyMultipliers = {
      lazy: 3.0,      // Lazy updates use longer TTL
      normal: 1.0,    // Standard TTL
      aggressive: 0.4 // Aggressive updates use shorter TTL
    };
    baseTtl *= strategyMultipliers[options.updateStrategy || 'normal'];

    // Market-aware adjustments
    if (this.isMarketHours()) {
      baseTtl *= 0.5; // Shorter TTL during trading hours
    }

    return Math.max(30000, Math.min(baseTtl, 30 * 60 * 1000)); // 30s to 30min bounds
  }

  // Intelligent eviction using weighted scoring
  private evictLeastValuable(): void {
    let lowestScore = Infinity;
    let evictKey = '';

    for (const [key, entry] of this.cache.entries()) {
      const score = this.calculateValueScore(entry);
      if (score < lowestScore) {
        lowestScore = score;
        evictKey = key;
      }
    }

    if (evictKey) {
      this.cache.delete(evictKey);
      console.log(`🗑️ Evicted ${evictKey} (score: ${lowestScore.toFixed(2)})`);
    }
  }

  // Calculate value score for eviction decisions
  private calculateValueScore(entry: CacheEntry<T>): number {
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    const timeSinceAccess = now - entry.lastAccessed.getTime();

    // Base score from priority
    let score = this.config.priorityWeights[entry.priority];

    // Boost score based on access frequency
    const accessFrequency = entry.accessCount / Math.max(1, age / (60 * 1000)); // accesses per minute
    score += accessFrequency * 2;

    // Reduce score based on staleness
    const staleness = Math.min(1, age / this.config.stalenessThreshold);
    score *= (1 - staleness * 0.5);

    // Reduce score based on time since last access
    const accessRecency = Math.min(1, timeSinceAccess / (10 * 60 * 1000)); // 10 minutes
    score *= (1 - accessRecency * 0.3);

    // Boost score based on confidence
    score *= (0.5 + entry.metadata.confidence * 0.5);

    return score;
  }

  // Calculate freshness score (0 = stale, 1 = fresh)
  private calculateFreshness(entry: CacheEntry<T>): number {
    const age = Date.now() - entry.timestamp.getTime();
    const freshnessRatio = Math.max(0, 1 - (age / entry.ttl));
    return Math.round(freshnessRatio * 100) / 100;
  }

  // Tag-based invalidation
  invalidateByTag(tag: string): number {
    let invalidated = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    console.log(`🗑️ Invalidated ${invalidated} entries with tag: ${tag}`);
    return invalidated;
  }

  // Priority-based invalidation
  invalidateByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): number {
    let invalidated = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority === priority) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    console.log(`🗑️ Invalidated ${invalidated} entries with priority: ${priority}`);
    return invalidated;
  }

  // Pattern-based invalidation
  invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    console.log(`🗑️ Invalidated ${invalidated} entries matching pattern: ${pattern}`);
    return invalidated;
  }

  // Cleanup expired and stale entries
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;
    let staleMarked = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();
      
      // Remove expired entries
      if (age > entry.ttl) {
        this.cache.delete(key);
        expired++;
        continue;
      }

      // Mark stale entries
      if (age > this.config.stalenessThreshold && !entry.metadata.isStale) {
        entry.metadata.isStale = true;
        staleMarked++;
      }
    }

    if (expired > 0 || staleMarked > 0) {
      console.log(`🧹 Cleanup: ${expired} expired, ${staleMarked} marked stale`);
    }
  }

  // Pre-warm cache with anticipated data
  async preWarm(keys: string[], fetcher: (key: string) => Promise<T>): Promise<void> {
    console.log(`🔥 Pre-warming cache for ${keys.length} keys`);
    
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        try {
          const data = await fetcher(key);
          this.set(key, data, { 
            priority: 'medium',
            tags: ['prewarmed'],
            updateStrategy: 'normal'
          });
          return { key, success: true };
        } catch (error) {
          console.error(`❌ Pre-warm failed for ${key}:`, error.message);
          return { key, success: false };
        }
      })
    );

    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    console.log(`🔥 Pre-warming completed: ${successful}/${keys.length} successful`);
  }

  // Get comprehensive cache statistics
  getStats(): CacheStats {
    const now = Date.now();
    let fresh = 0, aging = 0, stale = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp.getTime();
      const freshnessRatio = age / entry.ttl;

      if (freshnessRatio < 0.5) fresh++;
      else if (freshnessRatio < 0.8) aging++;
      else stale++;
    }

    const totalAccesses = this.stats.hits + this.stats.misses;
    const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;

    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      missRate: Math.round((1 - hitRate) * 10000) / 100,
      avgAccessTime: this.stats.accessCount > 0 ? 
        this.stats.totalAccessTime / this.stats.accessCount : 0,
      memoryUsage: process.memoryUsage().heapUsed,
      staleness: { fresh, aging, stale }
    };
  }

  // Market hours check for adaptive behavior
  private isMarketHours(): boolean {
    const now = new Date();
    const nigTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
    const day = nigTime.getDay();
    const hours = nigTime.getHours();
    const minutes = nigTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // NGX trading hours: Monday-Friday, 10:00-14:30 WAT
    const isWeekday = day >= 1 && day <= 5;
    const isTradingTime = timeInMinutes >= 600 && timeInMinutes <= 870; // 10:00-14:30

    return isWeekday && isTradingTime;
  }

  // Start automatic cleanup timer
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Update access time statistics
  private updateAccessStats(startTime: number): void {
    const accessTime = Date.now() - startTime;
    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0, accessCount: 0 };
    console.log('🗑️ Cache cleared completely');
  }

  // Export cache state for debugging
  exportState(): any {
    const entries: any = {};
    for (const [key, entry] of this.cache.entries()) {
      entries[key] = {
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        priority: entry.priority,
        tags: entry.tags,
        metadata: entry.metadata,
        freshness: this.calculateFreshness(entry)
      };
    }
    
    return {
      config: this.config,
      stats: this.getStats(),
      entries
    };
  }

  // Graceful shutdown
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    console.log('🛑 Intelligent cache manager shutdown');
  }
}

// Specialized cache for stock data
export class StockDataCache extends IntelligentCacheManager<any> {
  constructor() {
    super({
      defaultTtl: 2 * 60 * 1000, // 2 minutes for stock data
      stalenessThreshold: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 60 * 1000, // 1 minute cleanup
      maxSize: 500
    });
  }

  // Stock-specific cache operations
  cacheQuote(symbol: string, quote: any): void {
    this.set(`quote:${symbol}`, quote, {
      priority: 'high',
      tags: ['quote', 'realtime', symbol],
      dataSource: 'aggregator',
      confidence: quote.confidence || 0.8,
      updateStrategy: 'aggressive'
    });
  }

  getQuote(symbol: string): { data: any | null; metadata: any } {
    return this.get(`quote:${symbol}`);
  }

  invalidateSymbol(symbol: string): void {
    this.invalidateByTag(symbol);
  }

  invalidateAllQuotes(): void {
    this.invalidateByTag('quote');
  }
}

// Export instances
export const intelligentCacheManager = new IntelligentCacheManager();
export const stockDataCache = new StockDataCache();