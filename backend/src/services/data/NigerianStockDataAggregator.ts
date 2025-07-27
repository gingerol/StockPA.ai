import axios from 'axios';
import * as cheerio from 'cheerio';

interface StockQuote {
  symbol: string;
  price: number;
  source: string;
  timestamp: Date;
  volume?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  confidence: number;
}

interface AggregatedQuote {
  symbol: string;
  consensusPrice: number;
  prices: StockQuote[];
  confidence: number;
  timestamp: Date;
  metadata: {
    sources: string[];
    priceRange: { min: number; max: number };
    deviation: number;
    isStale: boolean;
    dataAge: number; // milliseconds since data collection
  };
}

export class NigerianStockDataAggregator {
  private cache: Map<string, { data: AggregatedQuote; expires: Date }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes
  
  // Convert NGX symbols to various platform formats
  private symbolMappings: Record<string, Record<string, string>> = {
    'MTNN': {
      yahoo: 'MTNN.NG',
      google: 'MTNN:NGX',
      investing: 'mtn-nigeria-comm',
      tradingview: 'NGSE:MTNN'
    },
    'DANGCEM': {
      yahoo: 'DANGCEM.NG',
      google: 'DANGCEM:NGX',
      investing: 'dangote-cement',
      tradingview: 'NGSE:DANGCEM'
    },
    'NESTLE': {
      yahoo: 'NESTLE.NG',
      google: 'NESTLE:NGX',
      investing: 'nestle-nigeria',
      tradingview: 'NGSE:NESTLE'
    },
    'UBA': {
      yahoo: 'UBA.NG',
      google: 'UBA:NGX',
      investing: 'united-bank-africa',
      tradingview: 'NGSE:UBA'
    },
    'ZENITHBANK': {
      yahoo: 'ZENITHBANK.NG',
      google: 'ZENITHBANK:NGX',
      investing: 'zenith-bank',
      tradingview: 'NGSE:ZENITHBANK'
    },
    'WEMABANK': {
      yahoo: 'WEMABANK.NG',
      google: 'WEMABANK:NGX',
      investing: 'wema-bank',
      tradingview: 'NGSE:WEMABANK'
    },
    'ACCESSCORP': {
      yahoo: 'ACCESSCORP.NG',
      google: 'ACCESSCORP:NGX',
      investing: 'access-holdings',
      tradingview: 'NGSE:ACCESSCORP'
    },
    'DANGSUGAR': {
      yahoo: 'DANGSUGAR.NG',
      google: 'DANGSUGAR:NGX',
      investing: 'dangote-sugar',
      tradingview: 'NGSE:DANGSUGAR'
    },
    'ACCESSCORP': {
      yahoo: 'ACCESSCORP.NG',
      google: 'ACCESSCORP:NGX',
      investing: 'access-holdings',
      tradingview: 'NGSE:ACCESSCORP'
    },
    // Additional portfolio stocks
    'BUACEMENT': {
      yahoo: 'BUACEMENT.NG',
      google: 'BUACEMENT:NGX',
      investing: 'bua-cement',
      tradingview: 'NGSE:BUACEMENT'
    },
    'CADBURY': {
      yahoo: 'CADBURY.NG',
      google: 'CADBURY:NGX',
      investing: 'cadbury-nigeria',
      tradingview: 'NGSE:CADBURY'
    },
    'FIRSTHOLDCO': {
      yahoo: 'FIRSTHOLDCO.NG',
      google: 'FIRSTHOLDCO:NGX',
      investing: 'first-holdco',
      tradingview: 'NGSE:FIRSTHOLDCO'
    },
    'OANDO': {
      yahoo: 'OANDO.NG',
      google: 'OANDO:NGX',
      investing: 'oando',
      tradingview: 'NGSE:OANDO'
    },
    'VFDGROUP': {
      yahoo: 'VFDGROUP.NG',
      google: 'VFDGROUP:NGX',
      investing: 'vfd-group',
      tradingview: 'NGSE:VFDGROUP'
    },
    'AIICO': {
      yahoo: 'AIICO.NG',
      google: 'AIICO:NGX',
      investing: 'aiico-insurance',
      tradingview: 'NGSE:AIICO'
    }
  };

  async getAggregatedQuote(symbol: string): Promise<AggregatedQuote> {
    console.log(`🔍 Fetching aggregated quote for ${symbol}`);
    
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && cached.expires > new Date()) {
      console.log(`💾 Using cached data for ${symbol}`);
      return cached.data;
    }

    // Fetch from all sources in parallel
    console.log(`🌐 Fetching from multiple sources for ${symbol}...`);
    const startTime = Date.now();
    
    const quotes = await Promise.allSettled([
      this.fetchYahooFinance(symbol),
      this.fetchGoogleFinance(symbol),
      this.fetchInvestingCom(symbol),
      this.fetchAlphaVantage(symbol),
      this.fetchAfricanMarkets(symbol)
    ]);

    // Filter successful results
    const validQuotes = quotes
      .filter((result): result is PromiseFulfilledResult<StockQuote> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    console.log(`✅ Got ${validQuotes.length} valid quotes for ${symbol}`);

    if (validQuotes.length === 0) {
      throw new Error(`No valid quotes found for ${symbol}`);
    }

    // Calculate consensus
    const aggregated = this.calculateConsensus(symbol, validQuotes, Date.now() - startTime);
    
    // Cache the result
    this.cache.set(symbol, {
      data: aggregated,
      expires: new Date(Date.now() + this.CACHE_DURATION)
    });

    return aggregated;
  }

  private async fetchYahooFinance(symbol: string): Promise<StockQuote | null> {
    try {
      const yahooSymbol = this.symbolMappings[symbol]?.yahoo || `${symbol}.NG`;
      const url = `https://finance.yahoo.com/quote/${yahooSymbol}`;
      
      console.log(`📊 Fetching Yahoo Finance: ${yahooSymbol}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      
      // Multiple selectors for resilience
      const priceSelectors = [
        '[data-test="qsp-price"]',
        '[data-field="regularMarketPrice"]',
        '.Fw\\(b\\).Fz\\(36px\\)',
        'fin-streamer[data-field="regularMarketPrice"]',
        '.D\\(ib\\).Va\\(m\\).Fw\\(200\\).Fz\\(54px\\)',
        '[data-symbol] [data-field="regularMarketPrice"]'
      ];

      let price: number | null = null;
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().replace(/[,\s]/g, '');
          price = parseFloat(text);
          if (!isNaN(price) && price > 0) {
            console.log(`✅ Yahoo Finance found price: ₦${price} for ${symbol}`);
            break;
          }
        }
      }

      if (!price) {
        console.log(`❌ Yahoo Finance: No valid price found for ${symbol}`);
        return null;
      }

      // Extract additional data
      const volume = this.extractNumber($, '[data-field="regularMarketVolume"]');
      const change = this.extractNumber($, '[data-field="regularMarketChange"]');
      const changePercent = this.extractNumber($, '[data-field="regularMarketChangePercent"]');

      return {
        symbol,
        price,
        source: 'Yahoo Finance',
        timestamp: new Date(),
        volume,
        change,
        changePercent,
        confidence: 0.9
      };
    } catch (error) {
      console.error(`❌ Yahoo Finance error for ${symbol}:`, error.message);
      return null;
    }
  }

  private async fetchGoogleFinance(symbol: string): Promise<StockQuote | null> {
    try {
      const googleSymbol = this.symbolMappings[symbol]?.google || `${symbol}:NGX`;
      const url = `https://www.google.com/finance/quote/${googleSymbol}`;
      
      console.log(`📊 Fetching Google Finance: ${googleSymbol}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      
      // Google Finance price selectors
      const priceSelectors = [
        '.YMlKec.fxKbKc',
        '.kf1m0',
        '[data-source="BX"] .YMlKec',
        '.AHmHk .fxKbKc'
      ];

      let price: number | null = null;
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().replace(/[₦,\s]/g, '');
          price = parseFloat(text);
          if (!isNaN(price) && price > 0) {
            console.log(`✅ Google Finance found price: ₦${price} for ${symbol}`);
            break;
          }
        }
      }

      if (!price) {
        console.log(`❌ Google Finance: No valid price found for ${symbol}`);
        return null;
      }

      return {
        symbol,
        price,
        source: 'Google Finance',
        timestamp: new Date(),
        confidence: 0.85
      };
    } catch (error) {
      console.error(`❌ Google Finance error for ${symbol}:`, error.message);
      return null;
    }
  }

  private async fetchInvestingCom(symbol: string): Promise<StockQuote | null> {
    try {
      const investingSymbol = this.symbolMappings[symbol]?.investing;
      if (!investingSymbol) {
        console.log(`❌ Investing.com: No symbol mapping for ${symbol}`);
        return null;
      }

      const url = `https://www.investing.com/equities/${investingSymbol}`;
      
      console.log(`📊 Fetching Investing.com: ${investingSymbol}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      
      // Investing.com selectors
      const priceSelectors = [
        '[data-test="instrument-price-last"]',
        '.text-5xl.font-bold',
        '.instrument-price_last__KQzyA',
        '.text-2xl',
        '[class*="price"] [class*="last"]'
      ];

      let price: number | null = null;
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().replace(/[,\s₦]/g, '');
          price = parseFloat(text);
          if (!isNaN(price) && price > 0) {
            console.log(`✅ Investing.com found price: ₦${price} for ${symbol}`);
            break;
          }
        }
      }

      if (!price) {
        console.log(`❌ Investing.com: No valid price found for ${symbol}`);
        return null;
      }

      return {
        symbol,
        price,
        source: 'Investing.com',
        timestamp: new Date(),
        confidence: 0.8
      };
    } catch (error) {
      console.error(`❌ Investing.com error for ${symbol}:`, error.message);
      return null;
    }
  }

  private async fetchAlphaVantage(symbol: string): Promise<StockQuote | null> {
    try {
      const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
      const avSymbol = `${symbol}.NG`;
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${avSymbol}&apikey=${API_KEY}`;
      
      console.log(`📊 Fetching Alpha Vantage: ${avSymbol}`);
      
      const response = await axios.get(url, { timeout: 8000 });
      const data = response.data['Global Quote'];
      
      if (!data || !data['05. price']) {
        console.log(`❌ Alpha Vantage: No valid data for ${symbol}`);
        return null;
      }

      const price = parseFloat(data['05. price']);
      console.log(`✅ Alpha Vantage found price: ₦${price} for ${symbol}`);

      return {
        symbol,
        price,
        source: 'Alpha Vantage',
        timestamp: new Date(),
        volume: parseInt(data['06. volume']) || undefined,
        change: parseFloat(data['09. change']) || undefined,
        changePercent: parseFloat(data['10. change percent']?.replace('%', '')) || undefined,
        confidence: 0.95
      };
    } catch (error) {
      console.error(`❌ Alpha Vantage error for ${symbol}:`, error.message);
      return null;
    }
  }

  private async fetchAfricanMarkets(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `https://www.african-markets.com/en/stock-markets/ngse/${symbol.toLowerCase()}`;
      
      console.log(`📊 Fetching African Markets: ${symbol}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      
      // African Markets specific selectors
      const priceSelectors = [
        '.price-value',
        '.current-price',
        '[class*="price"]'
      ];

      let price: number | null = null;
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().replace(/[₦,\s]/g, '');
          price = parseFloat(text);
          if (!isNaN(price) && price > 0) {
            console.log(`✅ African Markets found price: ₦${price} for ${symbol}`);
            break;
          }
        }
      }

      if (!price) {
        console.log(`❌ African Markets: No valid price found for ${symbol}`);
        return null;
      }

      return {
        symbol,
        price,
        source: 'African Markets',
        timestamp: new Date(),
        confidence: 0.75
      };
    } catch (error) {
      console.error(`❌ African Markets error for ${symbol}:`, error.message);
      return null;
    }
  }

  private calculateConsensus(symbol: string, quotes: StockQuote[], fetchDuration: number): AggregatedQuote {
    // Sort by confidence
    quotes.sort((a, b) => b.confidence - a.confidence);

    // Calculate price statistics
    const prices = quotes.map(q => q.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Calculate standard deviation
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const deviation = (stdDev / avg) * 100; // Percentage deviation

    // Filter outliers (prices beyond 2 standard deviations)
    const filteredQuotes = quotes.filter(q => 
      Math.abs(q.price - avg) <= 2 * stdDev
    );

    // Calculate weighted average based on confidence
    const weightedSum = filteredQuotes.reduce(
      (sum, q) => sum + (q.price * q.confidence), 0
    );
    const weightSum = filteredQuotes.reduce(
      (sum, q) => sum + q.confidence, 0
    );
    const consensusPrice = weightedSum / weightSum;

    // Overall confidence based on:
    // 1. Number of sources
    // 2. Price deviation
    // 3. Individual source confidence
    const sourceCount = filteredQuotes.length;
    const sourceFactor = Math.min(sourceCount / 3, 1); // Max confidence with 3+ sources
    const deviationFactor = Math.max(0, 1 - (deviation / 10)); // Lower confidence with high deviation
    const avgConfidence = filteredQuotes.reduce((sum, q) => sum + q.confidence, 0) / sourceCount;
    
    const overallConfidence = (sourceFactor * 0.3 + deviationFactor * 0.3 + avgConfidence * 0.4);

    // Determine if data is stale
    const dataAge = fetchDuration;
    const isStale = dataAge > this.STALE_THRESHOLD;

    return {
      symbol,
      consensusPrice: Math.round(consensusPrice * 100) / 100,
      prices: quotes,
      confidence: Math.round(overallConfidence * 100) / 100,
      timestamp: new Date(),
      metadata: {
        sources: quotes.map(q => q.source),
        priceRange: { min, max },
        deviation: Math.round(deviation * 100) / 100,
        isStale,
        dataAge
      }
    };
  }

  private extractNumber($: cheerio.CheerioAPI, selector: string): number | undefined {
    const element = $(selector).first();
    if (!element.length) return undefined;
    
    const text = element.text().replace(/[₦,%\s]/g, '');
    const num = parseFloat(text);
    return isNaN(num) ? undefined : num;
  }

  // Batch fetch for portfolio
  async getPortfolioQuotes(symbols: string[]): Promise<Map<string, AggregatedQuote>> {
    console.log(`📊 Fetching portfolio quotes for: ${symbols.join(', ')}`);
    
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getAggregatedQuote(symbol))
    );

    const portfolio = new Map<string, AggregatedQuote>();
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        portfolio.set(symbols[index], result.value);
      } else {
        console.error(`Failed to fetch quote for ${symbols[index]}:`, result.reason);
      }
    });

    console.log(`✅ Successfully fetched ${portfolio.size}/${symbols.length} portfolio quotes`);
    return portfolio;
  }

  // Health check for sources
  async checkSourceHealth(): Promise<Record<string, boolean>> {
    console.log('🏥 Checking data source health...');
    const testSymbol = 'MTNN';
    
    const sources = {
      yahoo: this.fetchYahooFinance(testSymbol),
      google: this.fetchGoogleFinance(testSymbol),
      investing: this.fetchInvestingCom(testSymbol),
      alphaVantage: this.fetchAlphaVantage(testSymbol),
      africanMarkets: this.fetchAfricanMarkets(testSymbol)
    };

    const results = await Promise.allSettled(Object.values(sources));
    const health: Record<string, boolean> = {};

    Object.keys(sources).forEach((source, index) => {
      health[source] = results[index].status === 'fulfilled' && 
                      (results[index] as PromiseFulfilledResult<StockQuote | null>).value !== null;
    });

    console.log('🏥 Source health check results:', health);
    return health;
  }

  // Clear cache for specific symbol or all
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.delete(symbol);
      console.log(`🗑️ Cleared cache for ${symbol}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; symbols: string[] } {
    return {
      size: this.cache.size,
      symbols: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const nigerianStockDataAggregator = new NigerianStockDataAggregator();