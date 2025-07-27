import axios from 'axios';

interface AnalystData {
  symbol: string;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  targetPrice: number;
  priceTargets: {
    high: number;
    low: number;
    average: number;
  };
  analystCount: number;
  lastUpdated: Date;
}

interface ValuationData {
  symbol: string;
  currentPE?: number;
  sectorPE?: number;
  currentPB?: number;
  sectorPB?: number;
  debtToEquity?: number;
  currentRatio?: number;
  fundingCosts?: number;
  lastUpdated: Date;
}

interface CommodityData {
  name: string;
  price: number;
  change: number;
  impact: 'high' | 'medium' | 'low';
}

export class AnalystConsensusService {
  private cache: Map<string, { data: any; expires: Date }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for analyst data

  // Fetch analyst consensus for Nigerian stocks
  async getAnalystConsensus(symbol: string): Promise<AnalystData | null> {
    const cached = this.cache.get(`analyst_${symbol}`);
    if (cached && cached.expires > new Date()) {
      return cached.data;
    }

    try {
      console.log(`🏦 Fetching analyst consensus for ${symbol}...`);
      
      // In production, this would integrate with Bloomberg/Refinitiv APIs
      // For now, using realistic mock data based on known Nigerian stock patterns
      const analystData = await this.fetchFromDataSource(symbol);
      
      if (analystData) {
        this.cache.set(`analyst_${symbol}`, {
          data: analystData,
          expires: new Date(Date.now() + this.CACHE_DURATION)
        });
      }
      
      return analystData;
    } catch (error) {
      console.error(`❌ Failed to fetch analyst data for ${symbol}:`, error.message);
      return null;
    }
  }

  // Fetch valuation metrics
  async getValuationMetrics(symbol: string): Promise<ValuationData | null> {
    const cached = this.cache.get(`valuation_${symbol}`);
    if (cached && cached.expires > new Date()) {
      return cached.data;
    }

    try {
      console.log(`📊 Fetching valuation metrics for ${symbol}...`);
      
      const valuationData = await this.fetchValuationData(symbol);
      
      if (valuationData) {
        this.cache.set(`valuation_${symbol}`, {
          data: valuationData,
          expires: new Date(Date.now() + this.CACHE_DURATION)
        });
      }
      
      return valuationData;
    } catch (error) {
      console.error(`❌ Failed to fetch valuation data for ${symbol}:`, error.message);
      return null;
    }
  }

  // Fetch relevant commodity prices
  async getCommodityContext(symbol: string): Promise<CommodityData[]> {
    const cached = this.cache.get(`commodity_${symbol}`);
    if (cached && cached.expires > new Date()) {
      return cached.data;
    }

    try {
      console.log(`🌾 Fetching commodity context for ${symbol}...`);
      
      const commodities = await this.fetchCommodityData(symbol);
      
      if (commodities) {
        this.cache.set(`commodity_${symbol}`, {
          data: commodities,
          expires: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours for commodity data
        });
      }
      
      return commodities || [];
    } catch (error) {
      console.error(`❌ Failed to fetch commodity data for ${symbol}:`, error.message);
      return [];
    }
  }

  // Mock data source - replace with real API integration
  private async fetchFromDataSource(symbol: string): Promise<AnalystData | null> {
    // Realistic mock data based on critique received for DANGSUGAR
    const mockAnalystData: Record<string, AnalystData> = {
      'DANGSUGAR': {
        symbol: 'DANGSUGAR',
        rating: 'Hold',
        targetPrice: 38.80,
        priceTargets: {
          high: 41.07,
          low: 36.68,
          average: 38.80
        },
        analystCount: 3,
        lastUpdated: new Date('2025-07-25')
      },
      'MTNN': {
        symbol: 'MTNN',
        rating: 'Buy',
        targetPrice: 420.00,
        priceTargets: {
          high: 450.00,
          low: 380.00,
          average: 420.00
        },
        analystCount: 8,
        lastUpdated: new Date('2025-07-20')
      },
      'NESTLE': {
        symbol: 'NESTLE',
        rating: 'Hold',
        targetPrice: 1850.00,
        priceTargets: {
          high: 2000.00,
          low: 1700.00,
          average: 1850.00
        },
        analystCount: 5,
        lastUpdated: new Date('2025-07-22')
      },
      'UBA': {
        symbol: 'UBA',
        rating: 'Buy',
        targetPrice: 52.00,
        priceTargets: {
          high: 58.00,
          low: 48.00,
          average: 52.00
        },
        analystCount: 6,
        lastUpdated: new Date('2025-07-24')
      },
      'ZENITHBANK': {
        symbol: 'ZENITHBANK',
        rating: 'Hold',
        targetPrice: 75.00,
        priceTargets: {
          high: 82.00,
          low: 68.00,
          average: 75.00
        },
        analystCount: 7,
        lastUpdated: new Date('2025-07-23')
      }
    };

    return mockAnalystData[symbol] || null;
  }

  private async fetchValuationData(symbol: string): Promise<ValuationData | null> {
    // Mock valuation data with realistic Nigerian market metrics
    const mockValuationData: Record<string, ValuationData> = {
      'DANGSUGAR': {
        symbol: 'DANGSUGAR',
        currentPE: undefined, // Company currently loss-making
        sectorPE: 18.5, // Consumer goods sector average
        currentPB: 2.1,
        sectorPB: 1.8,
        debtToEquity: 1.8, // High leverage as mentioned in critique
        currentRatio: 1.2,
        fundingCosts: 20.80, // From commercial paper as mentioned
        lastUpdated: new Date()
      },
      'MTNN': {
        symbol: 'MTNN',
        currentPE: 12.5,
        sectorPE: 15.2,
        currentPB: 2.8,
        sectorPB: 2.1,
        debtToEquity: 0.4,
        currentRatio: 1.8,
        fundingCosts: 8.5,
        lastUpdated: new Date()
      },
      'NESTLE': {
        symbol: 'NESTLE',
        currentPE: 24.5,
        sectorPE: 18.5,
        currentPB: 8.2,
        sectorPB: 1.8,
        debtToEquity: 0.3,
        currentRatio: 2.1,
        fundingCosts: 6.2,
        lastUpdated: new Date()
      },
      'UBA': {
        symbol: 'UBA',
        currentPE: 4.8,
        sectorPE: 6.2,
        currentPB: 0.6,
        sectorPB: 0.8,
        debtToEquity: 8.5, // Banks have high leverage naturally
        currentRatio: 1.1,
        fundingCosts: 12.5,
        lastUpdated: new Date()
      },
      'ZENITHBANK': {
        symbol: 'ZENITHBANK',
        currentPE: 5.2,
        sectorPE: 6.2,
        currentPB: 0.8,
        sectorPB: 0.8,
        debtToEquity: 7.8,
        currentRatio: 1.3,
        fundingCosts: 11.8,
        lastUpdated: new Date()
      }
    };

    return mockValuationData[symbol] || null;
  }

  private async fetchCommodityData(symbol: string): Promise<CommodityData[]> {
    // Map stocks to relevant commodities
    const commodityMappings: Record<string, CommodityData[]> = {
      'DANGSUGAR': [
        {
          name: 'Sugar (Global)',
          price: 18.45, // cents per pound
          change: -8.1, // YTD change as mentioned in critique
          impact: 'high'
        },
        {
          name: 'USD/NGN',
          price: 1580.50,
          change: 12.5, // FX volatility
          impact: 'high'
        }
      ],
      'MTNN': [
        {
          name: 'USD/NGN',
          price: 1580.50,
          change: 12.5,
          impact: 'medium'
        }
      ],
      'NESTLE': [
        {
          name: 'Cocoa',
          price: 3250.00, // USD per tonne
          change: -2.3,
          impact: 'medium'
        },
        {
          name: 'Wheat',
          price: 245.50,
          change: -1.8,
          impact: 'low'
        },
        {
          name: 'USD/NGN',
          price: 1580.50,
          change: 12.5,
          impact: 'medium'
        }
      ],
      'UBA': [
        {
          name: 'Oil (Brent)',
          price: 82.35,
          change: 5.2,
          impact: 'medium'
        },
        {
          name: 'USD/NGN',
          price: 1580.50,
          change: 12.5,
          impact: 'high'
        }
      ],
      'ZENITHBANK': [
        {
          name: 'Oil (Brent)',
          price: 82.35,
          change: 5.2,
          impact: 'medium'
        },
        {
          name: 'USD/NGN',
          price: 1580.50,
          change: 12.5,
          impact: 'high'
        }
      ]
    };

    return commodityMappings[symbol] || [];
  }

  // Get comprehensive analysis context
  async getComprehensiveContext(symbol: string): Promise<{
    analystConsensus: AnalystData | null;
    valuationMetrics: ValuationData | null;
    commodityContext: CommodityData[];
  }> {
    console.log(`🔍 Fetching comprehensive analysis context for ${symbol}...`);
    
    const [analystConsensus, valuationMetrics, commodityContext] = await Promise.all([
      this.getAnalystConsensus(symbol),
      this.getValuationMetrics(symbol),
      this.getCommodityContext(symbol)
    ]);

    console.log(`✅ Context fetched: Analyst=${!!analystConsensus}, Valuation=${!!valuationMetrics}, Commodities=${commodityContext.length}`);

    return {
      analystConsensus,
      valuationMetrics,
      commodityContext
    };
  }

  // Health check for data sources
  async checkDataSourceHealth(): Promise<Record<string, boolean>> {
    return {
      analyst_consensus: true, // Would check real Bloomberg/Refinitiv API
      valuation_metrics: true, // Would check financial data API
      commodity_prices: true   // Would check commodity data API
    };
  }

  // Clear cache
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.delete(`analyst_${symbol}`);
      this.cache.delete(`valuation_${symbol}`);
      this.cache.delete(`commodity_${symbol}`);
      console.log(`🗑️ Cleared analysis context cache for ${symbol}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cleared all analysis context cache');
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const analystConsensusService = new AnalystConsensusService();