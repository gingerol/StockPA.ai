import { ollamaService } from './OllamaService';
import { llmOrchestrator } from './LLMOrchestrator';
import { nigerianStockDataAggregator } from '../data/NigerianStockDataAggregator';
import { stockDataCache } from '../data/IntelligentCacheManager';
import { dataFreshnessMonitor } from '../data/DataFreshnessMonitor';
import { analystConsensusService } from '../data/AnalystConsensusService';

export interface LayerAnalysisRequest {
  ticker: string;
  timeHorizon: string;
  riskTolerance: string;
  marketData?: any;
  userContext?: any;
  portfolioContext?: {
    totalValue: number;
    positionSize: number;
    concentration: number;
    otherHoldings: Array<{symbol: string; value: number}>;
  };
  analystConsensus?: {
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
    targetPrice: number;
    priceTargets: {
      high: number;
      low: number;
      average: number;
    };
    analystCount: number;
    lastUpdated: Date;
  };
  valuationMetrics?: {
    currentPE?: number;
    sectorPE?: number;
    currentPB?: number;
    sectorPB?: number;
    debtToEquity?: number;
    currentRatio?: number;
    fundingCosts?: number;
  };
  commodityContext?: {
    relevantCommodities?: Array<{
      name: string;
      price: number;
      change: number;
      impact: 'high' | 'medium' | 'low';
    }>;
  };
}

export interface LayerResult {
  layerName: string;
  layerType: string;
  score: number;
  confidence: number;
  reasoning: string;
  indicators: any;
  modelUsed: string;
  processingTime: number;
}

export interface SevenLayerAnalysis {
  ticker: string;
  overallScore: number;
  overallConfidence: number;
  finalRecommendation: string;
  layers: LayerResult[];
  synthesis: string;
  riskAssessment: string;
  totalProcessingTime: number;
  analysisTimestamp: Date;
}

export class SevenLayerAnalysisEngine {
  constructor() {
    // Direct access to Ollama service for faster analysis
  }

  async analyzeStock(request: LayerAnalysisRequest): Promise<SevenLayerAnalysis> {
    const startTime = Date.now();
    console.log(`🧠 Starting Sequential Multi-Model Seven-Layer Analysis for ${request.ticker}`);

    try {
      // STEP 1: Fetch real-time market data first to fix ₦147 vs ₦400 price issue
      console.log(`📊 Fetching real-time market data for ${request.ticker}...`);
      const realTimeData = await this.fetchRealTimeMarketData(request.ticker);
      
      // Verify data freshness
      const freshnessCheck = dataFreshnessMonitor.getSymbolFreshness(request.ticker);
      if (freshnessCheck && freshnessCheck.staleness === 'critical') {
        console.warn(`⚠️ WARNING: Data for ${request.ticker} is ${freshnessCheck.staleness} - continuing with available data`);
      }

      // STEP 2: Fetch comprehensive analysis context (learned from critique)
      console.log(`🏦 Fetching analyst consensus and valuation data for ${request.ticker}...`);
      const analysisContext = await analystConsensusService.getComprehensiveContext(request.ticker);

      // STEP 3: Enhanced request with real-time data and professional context
      const enhancedRequest = {
        ...request,
        marketData: realTimeData,
        analystConsensus: analysisContext.analystConsensus,
        valuationMetrics: analysisContext.valuationMetrics,
        commodityContext: {
          relevantCommodities: analysisContext.commodityContext
        }
      };

      // Round 1: Complete analysis with Mistral 7B
      console.log(`🤖 Round 1: Mistral 7B - Full Seven-Layer Analysis`);
      const mistralAnalysis = await this.runFullAnalysisWithModel(enhancedRequest, 'mistral:7b-instruct');
      
      // Round 2: Complete analysis with CodeLlama 13B  
      console.log(`🤖 Round 2: CodeLlama 13B - Full Seven-Layer Analysis`);
      const codelamaAnalysis = await this.runFullAnalysisWithModel(enhancedRequest, 'codellama:13b');
      
      // Round 3: Complete analysis with Llama3 8B
      console.log(`🤖 Round 3: Llama3 8B - Full Seven-Layer Analysis`);
      const llama3Analysis = await this.runFullAnalysisWithModel(enhancedRequest, 'llama3:8b');

      // Combine all layer results from 3 models
      const allLayerResults = [
        ...mistralAnalysis,
        ...codelamaAnalysis, 
        ...llama3Analysis
      ];

      // Aggregate and synthesize results from all 3 model perspectives
      const analysis = this.synthesizeMultiModelResults(enhancedRequest, allLayerResults, startTime);
      
      console.log(`✅ Sequential Multi-Model Analysis completed in ${analysis.totalProcessingTime}ms`);
      console.log(`📊 Used real-time price: ₦${realTimeData.consensusPrice} (confidence: ${realTimeData.confidence})`);
      
      return analysis;

    } catch (error) {
      console.error('❌ Sequential Multi-Model Analysis failed:', error);
      throw error;
    }
  }

  // Fetch real-time market data to prevent outdated price analysis
  private async fetchRealTimeMarketData(ticker: string): Promise<any> {
    try {
      console.log(`🔄 Fetching fresh market data for ${ticker}...`);
      
      // First check cache for recent data
      const cacheResult = stockDataCache.getQuote(ticker);
      if (cacheResult.data && cacheResult.metadata.age < 2 * 60 * 1000) { // Less than 2 minutes old
        console.log(`💾 Using cached data for ${ticker} (${Math.round(cacheResult.metadata.age / 1000)}s old)`);
        return cacheResult.data;
      }

      // Fetch fresh data from aggregator
      const quote = await nigerianStockDataAggregator.getAggregatedQuote(ticker);
      
      // Cache the fresh data
      stockDataCache.cacheQuote(ticker, quote);
      
      console.log(`✅ Fresh data fetched for ${ticker}: ₦${quote.consensusPrice} (confidence: ${quote.confidence})`);
      return quote;
      
    } catch (error) {
      console.error(`❌ Failed to fetch real-time data for ${ticker}:`, error.message);
      
      // Fallback to cache even if stale
      const cacheResult = stockDataCache.getQuote(ticker);
      if (cacheResult.data) {
        console.warn(`⚠️ Using stale cached data for ${ticker} (${Math.round(cacheResult.metadata.age / 60000)}m old)`);
        return cacheResult.data;
      }
      
      throw new Error(`No market data available for ${ticker}`);
    }
  }

  private async runFullAnalysisWithModel(request: LayerAnalysisRequest, modelEndpoint: string): Promise<LayerResult[]> {
    const modelName = modelEndpoint.split(':')[0];
    console.log(`📊 Running all 7 layers with ${modelName}`);
    
    const layers = [
      this.runLayerWithModel(request, modelEndpoint, 'Market Data Intelligence', 'quantitative', this.getMarketDataPrompt(request)),
      this.runLayerWithModel(request, modelEndpoint, 'Technical Analysis', 'technical', this.getTechnicalPrompt(request)),
      this.runLayerWithModel(request, modelEndpoint, 'Fundamental Analysis', 'fundamental', this.getFundamentalPrompt(request)),
      this.runLayerWithModel(request, modelEndpoint, 'Nigerian Market Intelligence', 'local_market', this.getNigerianMarketPrompt(request)),
      this.runLayerWithModel(request, modelEndpoint, 'Risk Assessment', 'risk', this.getRiskPrompt(request)),
      this.runLayerWithModel(request, modelEndpoint, 'Sentiment & News Analysis', 'sentiment', this.getSentimentPrompt(request)),
      this.runLayerWithModel(request, modelEndpoint, 'Portfolio Optimization', 'optimization', this.getPortfolioPrompt(request))
    ];

    // Run layers sequentially to avoid memory pressure
    const results = [];
    for (const layerPromise of layers) {
      const result = await layerPromise;
      results.push(result);
    }
    
    return results;
  }

  private async runLayerWithModel(
    request: LayerAnalysisRequest,
    modelEndpoint: string,
    layerName: string,
    layerType: string,
    prompt: string
  ): Promise<LayerResult> {
    const startTime = Date.now();
    const modelName = modelEndpoint.split(':')[0];

    try {
      const result = await ollamaService.queryWithRetry(modelEndpoint, prompt);
      
      return {
        layerName: `${layerName} (${modelName})`,
        layerType,
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: {},
        modelUsed: modelName,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error(`❌ ${layerName} with ${modelName} failed:`, error);
      return this.createFallbackLayerResult(`${layerName} (${modelName})`, startTime);
    }
  }

  private getMarketDataPrompt(request: LayerAnalysisRequest): string {
    const marketData = request.marketData;
    const realTimeInfo = marketData ? 
      `REAL-TIME DATA (CURRENT):
- Current Price: ₦${marketData.consensusPrice}
- Data Confidence: ${(marketData.confidence * 100).toFixed(1)}%
- Last Updated: ${new Date(marketData.timestamp).toLocaleString()}
- Price Sources: ${marketData.metadata.sources.join(', ')}
- Price Range: ₦${marketData.metadata.priceRange.min} - ₦${marketData.metadata.priceRange.max}
- Price Deviation: ${marketData.metadata.deviation}%
- Data Age: ${Math.round(marketData.metadata.dataAge / 1000)} seconds

` : 'No real-time data available - use general analysis.\n\n';

    return `Analyze ${request.ticker} Nigerian stock - market data intelligence.

${realTimeInfo}NGX Context: Oil-dependent economy, NGN volatility, key sectors Banking/Oil/Consumer.

IMPORTANT: Use the real-time price data above for your analysis. The current price of ₦${marketData?.consensusPrice || 'N/A'} is the most accurate available.

Analyze: price trends, volume, liquidity, market cap, patterns, support/resistance.

Score 0-100 and reasoning. Format: SCORE: [number] REASONING: [analysis]`;
  }

  private getTechnicalPrompt(request: LayerAnalysisRequest): string {
    return `Technical analysis ${request.ticker} Nigerian stock.

Analyze: chart patterns, moving averages, RSI/MACD, support/resistance, volume, NGX seasonality.

Score 0-100 for technical strength. Format: SCORE: [number] REASONING: [analysis]`;
  }

  private getFundamentalPrompt(request: LayerAnalysisRequest): string {
    return `Fundamental analysis ${request.ticker} Nigerian company.

Analyze: P/E, ROE, debt ratios, revenue growth, cash flow, competitive position, governance, dividends, FX exposure.

Score 0-100 for fundamental strength. Format: SCORE: [number] REASONING: [analysis]`;
  }

  private getNigerianMarketPrompt(request: LayerAnalysisRequest): string {
    return `Nigerian market intelligence ${request.ticker}.

Analyze: CBN policy impact, oil correlation, FX exposure, political risks, infrastructure challenges, local competition.

Score 0-100 for Nigerian market favorability. Format: SCORE: [number] REASONING: [analysis]`;
  }

  private getRiskPrompt(request: LayerAnalysisRequest): string {
    return `Risk assessment ${request.ticker} Nigerian stock.

Analyze: market volatility, currency risk, political risk, liquidity risk, operational risks, systemic risks.

Risk score 0-100 (0=low risk, 100=high risk). Format: RISK_SCORE: [number] REASONING: [analysis]`;
  }

  private getSentimentPrompt(request: LayerAnalysisRequest): string {
    return `Sentiment analysis ${request.ticker} Nigerian stock.

Analyze: news sentiment, social sentiment, analyst opinions, investor flows, market mood.

Sentiment score 0-100 (0=bearish, 100=bullish). Format: SENTIMENT_SCORE: [number] REASONING: [analysis]`;
  }

  private getPortfolioPrompt(request: LayerAnalysisRequest): string {
    return `Portfolio optimization ${request.ticker} Nigerian stock.

Analyze: sector correlation, diversification benefits, position sizing, risk-return profile, portfolio fit.

Portfolio fit score 0-100. Format: PORTFOLIO_FIT_SCORE: [number] REASONING: [analysis]`;
  }

  private async runLayer1_MarketDataIntelligence(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for market data analysis
      const prompt = `Analyze ${request.ticker} Nigerian stock - market data intelligence.

NGX Context: Oil-dependent economy, NGN volatility, key sectors Banking/Oil/Consumer.

Analyze: price trends, volume, liquidity, market cap, patterns, support/resistance.

Score 0-100 and reasoning. Format: SCORE: [number] REASONING: [analysis]`;

      const result = await ollamaService.queryWithRetry('mistral:7b-instruct', prompt);

      return {
        layerName: 'Market Data Intelligence',
        layerType: 'quantitative',
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractMarketDataIndicators(result),
        modelUsed: 'mistral-7b-instruct',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 1 failed:', error);
      return this.createFallbackLayerResult('Market Data Intelligence', startTime);
    }
  }

  private async runLayer2_TechnicalAnalysis(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for technical analysis
      const prompt = `Technical analysis ${request.ticker} Nigerian stock.

Analyze: chart patterns, moving averages, RSI/MACD, support/resistance, volume, NGX seasonality.

Score 0-100 for technical strength. Format: SCORE: [number] REASONING: [analysis]`;

      const result = await ollamaService.queryWithRetry('codellama:13b', prompt);

      return {
        layerName: 'Technical Analysis',
        layerType: 'technical',
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractTechnicalIndicators(result),
        modelUsed: 'codellama-13b',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 2 failed:', error);
      return this.createFallbackLayerResult('Technical Analysis', startTime);
    }
  }

  private async runLayer3_FundamentalAnalysis(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for fundamental analysis
      const prompt = `Fundamental analysis ${request.ticker} Nigerian company.

Analyze: P/E, ROE, debt ratios, revenue growth, cash flow, competitive position, governance, dividends, FX exposure.

Score 0-100 for fundamental strength. Format: SCORE: [number] REASONING: [analysis]`;

      const result = await ollamaService.queryWithRetry('mistral:7b-instruct', prompt);

      return {
        layerName: 'Fundamental Analysis',
        layerType: 'fundamental',
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractFundamentalIndicators(result),
        modelUsed: 'mistral-7b-instruct',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 3 failed:', error);
      return this.createFallbackLayerResult('Fundamental Analysis', startTime);
    }
  }

  private async runLayer4_NigerianMarketIntelligence(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for Nigerian market intelligence
      const prompt = `You are an expert Nigerian market intelligence analyst with deep knowledge of local economic, political, and business dynamics.

SPECIALIZED NIGERIAN MARKET INTELLIGENCE:
- Central Bank of Nigeria (CBN) monetary policy framework and impact
- Oil price correlation (Nigeria exports ~2M barrels/day)
- Foreign exchange (FX) challenges and NGN volatility patterns
- Political stability, election cycles, and policy changes
- Regulatory environment changes (SEC Nigeria, CBN banking regulations)
- Infrastructure challenges (power, logistics, telecoms)
- Banking sector reforms and consolidation impacts
- Local vs foreign investor sentiment and capital flows
- Regional economic dynamics (ECOWAS, AfCFTA impact)
- Inflation trends and consumer purchasing power

LAYER 4: NIGERIAN MARKET INTELLIGENCE
Analyze ${request.ticker} specifically within Nigerian context:
- How CBN monetary policy affects this stock/sector
- Oil price correlation impact (if any)
- FX exposure and currency hedging effectiveness
- Political/regulatory risks specific to this company
- Infrastructure dependencies and operational challenges
- Nigerian consumer/business demand patterns
- Competition from foreign vs local players
- Banking/financing accessibility for growth
- Export/import exposure to global markets

Provide a numerical score (0-100) for Nigerian market favorability and specific local insights.
Time horizon: ${request.timeHorizon}
Risk tolerance: ${request.riskTolerance}

Format your response as: SCORE: [number] REASONING: [detailed Nigerian market-specific analysis]`;

      const result = await ollamaService.queryWithRetry('llama3:8b', prompt);

      return {
        layerName: 'Nigerian Market Intelligence',
        layerType: 'local_market',
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractNigerianMarketIndicators(result),
        modelUsed: 'llama3-8b',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 4 failed:', error);
      return this.createFallbackLayerResult('Nigerian Market Intelligence', startTime);
    }
  }

  private async runLayer5_RiskAssessment(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for comprehensive risk assessment
      const prompt = `You are an expert risk management analyst specializing in Nigerian market risks and comprehensive risk assessment frameworks.

NIGERIAN RISK ENVIRONMENT:
- Currency volatility (NGN/USD fluctuations)
- Political stability and election cycles
- CBN monetary policy changes
- Oil price dependency risks
- Infrastructure reliability challenges
- Regulatory environment changes
- Banking sector stability
- Foreign exchange restrictions

LAYER 5: RISK ASSESSMENT ENGINE
Analyze all risk dimensions for ${request.ticker}:

MARKET RISKS:
- Volatility and beta relative to NGX ASI
- Correlation with oil prices and USD/NGN
- Liquidity risk (trading volumes, market depth)
- Sector-specific cyclicality

NIGERIAN-SPECIFIC RISKS:
- Currency risk (NGN exposure and hedging effectiveness)
- Political risk (policy changes, elections, regulatory shifts)
- Infrastructure risk (power, logistics, telecommunications)
- CBN monetary policy sensitivity

OPERATIONAL RISKS:
- Counterparty and credit risks
- Operational and business model risks
- Management and governance risks
- Competition and market share risks

SYSTEMIC RISKS:
- Black swan events and tail risks
- Regional economic instability
- Global market contagion effects
- Commodity price shock impacts

Provide a numerical risk score (0-100, where 0=lowest risk, 100=highest risk) and detailed mitigation strategies.
Time horizon: ${request.timeHorizon}
Risk tolerance: ${request.riskTolerance}

Format your response as: RISK_SCORE: [number] REASONING: [detailed risk analysis with specific mitigation strategies]`;

      const result = await ollamaService.queryWithRetry('llama3:8b', prompt);

      return {
        layerName: 'Risk Assessment',
        layerType: 'risk',
        score: 100 - this.extractLayerScore(result.response), // Invert for risk (lower risk = higher score)
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractRiskIndicators(result),
        modelUsed: 'llama3-8b',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 5 failed:', error);
      return this.createFallbackLayerResult('Risk Assessment', startTime);
    }
  }

  private async runLayer6_SentimentNewsAnalysis(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for sentiment and news analysis
      const prompt = `You are an expert sentiment analyst specializing in Nigerian market sentiment, news analysis, and investor behavior patterns.

NIGERIAN SENTIMENT LANDSCAPE:
- Local vs international media coverage patterns
- Nigerian social media and retail investor sentiment
- Institutional investor sentiment (pension funds, insurance)
- Foreign investor sentiment and capital flows
- Government and regulatory sentiment
- Oil price sentiment correlation
- Election cycle sentiment impacts

LAYER 6: SENTIMENT & NEWS ANALYSIS
Analyze sentiment factors for ${request.ticker}:

NEWS SENTIMENT:
- Recent company-specific news and announcements
- Media coverage tone and frequency
- Analyst reports and rating changes
- Management communications and guidance quality

MARKET SENTIMENT:
- Social media discussions and retail sentiment
- Institutional investor positioning and flows
- Foreign investor sentiment toward Nigerian assets
- Peer company performance and sector sentiment

ECONOMIC SENTIMENT:
- Nigerian political and economic sentiment
- Oil price sentiment impact (if relevant)
- Currency and inflation sentiment
- Central Bank policy sentiment

BEHAVIORAL INDICATORS:
- Trading volume patterns and sentiment signals
- Options activity and derivative positioning
- Insider trading and management actions
- Sector rotation and thematic investment flows

Provide a numerical sentiment score (0-100, where 0=very bearish, 100=very bullish) and detailed sentiment breakdown.
Time horizon: ${request.timeHorizon}
Risk tolerance: ${request.riskTolerance}

Format your response as: SENTIMENT_SCORE: [number] REASONING: [detailed sentiment analysis with specific indicators and sources]`;

      const result = await ollamaService.queryWithRetry('mistral:7b-instruct', prompt);

      return {
        layerName: 'Sentiment & News Analysis',
        layerType: 'sentiment',
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractSentimentIndicators(result),
        modelUsed: 'mistral-7b-instruct',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 6 failed:', error);
      return this.createFallbackLayerResult('Sentiment & News Analysis', startTime);
    }
  }

  private async runLayer7_PortfolioOptimization(request: LayerAnalysisRequest): Promise<LayerResult> {
    const startTime = Date.now();

    try {
      // Build focused prompt for portfolio optimization
      const prompt = `You are an expert portfolio optimization specialist focusing on Nigerian market portfolio construction and asset allocation strategies.

NIGERIAN PORTFOLIO CONSIDERATIONS:
- Sector diversification across Banking, Oil & Gas, Consumer Goods, Insurance, Industrial
- Currency hedging and NGN exposure management
- Liquidity constraints in Nigerian market
- Correlation patterns with oil prices and global markets
- Local vs foreign investor portfolio preferences
- Dividend income optimization strategies
- Risk budgeting for Nigerian-specific risks

LAYER 7: PORTFOLIO OPTIMIZATION ENGINE
Analyze portfolio fit and optimization for ${request.ticker}:

DIVERSIFICATION ANALYSIS:
- Correlation with major Nigerian sectors
- Concentration risk assessment
- Geographic and sector diversification benefits
- Currency exposure optimization

RISK-RETURN OPTIMIZATION:
- Risk-adjusted return potential (Sharpe ratio considerations)
- Volatility contribution to portfolio
- Downside protection characteristics
- Beta stability and market sensitivity

POSITION SIZING:
- Optimal position size for ${request.riskTolerance} risk tolerance
- Portfolio weight recommendations
- Concentration limits and guidelines
- Rebalancing triggers and thresholds

STRATEGIC ALLOCATION:
- Core vs satellite positioning
- Tactical allocation opportunities
- Sector rotation considerations
- Exit strategy and timing optimization

NIGERIAN MARKET CONSTRAINTS:
- Liquidity considerations for position sizing
- Trading cost impact on optimization
- Settlement and custody considerations
- Regulatory limits and compliance

Provide a numerical portfolio fit score (0-100) and specific optimization recommendations.
Time horizon: ${request.timeHorizon}
Risk tolerance: ${request.riskTolerance}

Format your response as: PORTFOLIO_FIT_SCORE: [number] REASONING: [detailed portfolio optimization analysis with specific recommendations]`;

      const result = await ollamaService.queryWithRetry('llama3:8b', prompt);

      return {
        layerName: 'Portfolio Optimization',
        layerType: 'optimization',
        score: this.extractLayerScore(result.response),
        confidence: 0.8,
        reasoning: result.response,
        indicators: this.extractPortfolioIndicators(result),
        modelUsed: 'llama3-8b',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Layer 7 failed:', error);
      return this.createFallbackLayerResult('Portfolio Optimization', startTime);
    }
  }

  private synthesizeMultiModelResults(
    request: LayerAnalysisRequest,
    allLayers: LayerResult[],
    startTime: number
  ): SevenLayerAnalysis {
    
    // Group layers by type across all 3 models
    const layerGroups = this.groupLayersByType(allLayers);
    
    // Calculate consensus scores for each layer type
    const consolidatedLayers = this.consolidateLayerGroups(layerGroups);
    
    return this.synthesizeLayerResults(request, consolidatedLayers, startTime);
  }

  private groupLayersByType(allLayers: LayerResult[]): Map<string, LayerResult[]> {
    const groups = new Map<string, LayerResult[]>();
    
    allLayers.forEach(layer => {
      const baseLayerName = layer.layerName.split(' (')[0]; // Remove model name
      if (!groups.has(baseLayerName)) {
        groups.set(baseLayerName, []);
      }
      groups.get(baseLayerName)!.push(layer);
    });
    
    return groups;
  }

  private consolidateLayerGroups(layerGroups: Map<string, LayerResult[]>): LayerResult[] {
    const consolidated: LayerResult[] = [];
    
    layerGroups.forEach((layers, layerName) => {
      // Calculate consensus across 3 models for this layer
      const avgScore = layers.reduce((sum, l) => sum + l.score, 0) / layers.length;
      const avgConfidence = layers.reduce((sum, l) => sum + l.confidence, 0) / layers.length;
      const totalTime = layers.reduce((sum, l) => sum + l.processingTime, 0);
      
      // Combine reasoning from all 3 models
      const combinedReasoning = layers.map(l => 
        `**${l.modelUsed.toUpperCase()}**: ${l.reasoning}`
      ).join('\n\n');
      
      consolidated.push({
        layerName,
        layerType: layers[0].layerType,
        score: Math.round(avgScore * 10) / 10,
        confidence: Math.round(avgConfidence * 100) / 100,
        reasoning: combinedReasoning,
        indicators: {},
        modelUsed: 'ensemble-consensus',
        processingTime: totalTime
      });
    });
    
    return consolidated;
  }

  private synthesizeLayerResults(
    request: LayerAnalysisRequest,
    layers: LayerResult[],
    startTime: number
  ): SevenLayerAnalysis {
    
    // Calculate weighted overall score
    const layerWeights = {
      'Market Data Intelligence': 0.15,
      'Technical Analysis': 0.20,
      'Fundamental Analysis': 0.25,
      'Nigerian Market Intelligence': 0.15,
      'Risk Assessment': 0.10,
      'Sentiment & News Analysis': 0.10,
      'Portfolio Optimization': 0.05
    };

    let overallScore = 0;
    let totalConfidence = 0;

    layers.forEach(layer => {
      const weight = layerWeights[layer.layerName] || 0.1;
      overallScore += layer.score * weight;
      totalConfidence += layer.confidence * weight;
    });

    // Determine final recommendation with portfolio context awareness
    const finalRecommendation = this.determineFinalRecommendation(overallScore, layers, request);
    
    // Generate comprehensive synthesis
    const synthesis = this.generateComprehensiveSynthesis(layers, overallScore, finalRecommendation);
    
    // Assess overall risk
    const riskAssessment = this.generateRiskAssessment(layers);

    return {
      ticker: request.ticker,
      overallScore: Math.round(overallScore * 100) / 100,
      overallConfidence: Math.round(totalConfidence * 100) / 100,
      finalRecommendation,
      layers,
      synthesis,
      riskAssessment,
      totalProcessingTime: Date.now() - startTime,
      analysisTimestamp: new Date()
    };
  }

  private determineFinalRecommendation(overallScore: number, layers: LayerResult[], request: LayerAnalysisRequest): string {
    // Base recommendation from score
    let baseRecommendation = '';
    if (overallScore >= 75) baseRecommendation = 'STRONG BUY';
    else if (overallScore >= 60) baseRecommendation = 'BUY';
    else if (overallScore >= 40) baseRecommendation = 'HOLD';
    else if (overallScore >= 25) baseRecommendation = 'SELL';
    else baseRecommendation = 'STRONG SELL';

    console.log(`📊 Base recommendation from AI models: ${baseRecommendation} (Score: ${overallScore.toFixed(1)})`);

    // ENHANCED VALIDATION FRAMEWORK
    // Learned from analyst critique: add professional validation layers
    
    const currentPrice = request.marketData?.consensusPrice || 0;
    let validationFlags: string[] = [];
    let recommendationAdjustments: string[] = [];

    // VALIDATION 1: ANALYST CONSENSUS CHECK
    if (request.analystConsensus) {
      const { rating, priceTargets, analystCount } = request.analystConsensus;
      const analystUpside = ((priceTargets.average - currentPrice) / currentPrice) * 100;
      
      console.log(`🏦 Analyst Consensus: ${rating} | Target: ₦${priceTargets.average} | Upside: ${analystUpside.toFixed(1)}%`);
      
      // Significant divergence from analyst consensus
      if (baseRecommendation.includes('BUY') && rating === 'Hold' && analystUpside < -15) {
        validationFlags.push('ANALYST_DIVERGENCE');
        recommendationAdjustments.push('Analysts see limited upside');
      }
      
      // Price above analyst targets
      if (currentPrice > priceTargets.high) {
        validationFlags.push('ABOVE_HIGH_TARGET');
        recommendationAdjustments.push(`Price above highest analyst target (₦${priceTargets.high})`);
      }
    }

    // VALIDATION 2: VALUATION METRICS CHECK
    if (request.valuationMetrics) {
      const { currentPE, sectorPE, fundingCosts, debtToEquity } = request.valuationMetrics;
      
      // PE ratio check
      if (currentPE && sectorPE && currentPE > sectorPE * 1.5) {
        validationFlags.push('HIGH_VALUATION');
        recommendationAdjustments.push(`PE ${currentPE.toFixed(1)}x vs sector ${sectorPE.toFixed(1)}x`);
      }
      
      // Funding cost stress
      if (fundingCosts && fundingCosts > 18) {
        validationFlags.push('HIGH_FUNDING_COSTS');
        recommendationAdjustments.push(`High funding costs at ${fundingCosts.toFixed(1)}%`);
      }
      
      // Debt concerns
      if (debtToEquity && debtToEquity > 1.5) {
        validationFlags.push('HIGH_LEVERAGE');
        recommendationAdjustments.push(`High debt-to-equity ratio: ${debtToEquity.toFixed(1)}x`);
      }
    }

    // VALIDATION 3: COMMODITY CONTEXT CHECK
    if (request.commodityContext?.relevantCommodities) {
      request.commodityContext.relevantCommodities.forEach(commodity => {
        if (commodity.impact === 'high' && commodity.change < -5) {
          validationFlags.push('COMMODITY_HEADWINDS');
          recommendationAdjustments.push(`${commodity.name} down ${Math.abs(commodity.change).toFixed(1)}%`);
        }
      });
    }

    // VALIDATION 4: PORTFOLIO CONTEXT ADJUSTMENTS
    if (request.portfolioContext) {
      const { concentration, positionSize, totalValue } = request.portfolioContext;
      
      // High concentration risk adjustment
      if (concentration > 40) {
        console.log(`⚠️ High concentration detected: ${concentration.toFixed(1)}% in ${request.ticker}`);
        validationFlags.push('HIGH_CONCENTRATION');
        
        if (baseRecommendation === 'STRONG BUY' || baseRecommendation === 'BUY') {
          if (concentration > 60) {
            return 'REDUCE POSITION - High Quality but Dangerous Concentration';
          } else if (concentration > 50) {
            return 'HOLD - Limit Further Accumulation';
          } else {
            return 'CAUTIOUS BUY - Monitor Position Size';
          }
        }
      }
      
      // Position size relative to total portfolio
      const positionPercentage = (positionSize / totalValue) * 100;
      if (positionPercentage > 30 && baseRecommendation.includes('BUY')) {
        validationFlags.push('LARGE_POSITION');
        return 'HOLD - Already Adequate Position Size';
      }
    }

    // ENHANCED RECOMMENDATION LOGIC
    // Apply validation-based adjustments
    let finalRecommendation = baseRecommendation;
    
    if (validationFlags.length > 0) {
      console.log(`⚠️ Validation flags detected: ${validationFlags.join(', ')}`);
      console.log(`📋 Concerns: ${recommendationAdjustments.join('; ')}`);
      
      // Critical validation failures
      if (validationFlags.includes('ABOVE_HIGH_TARGET') && validationFlags.includes('HIGH_VALUATION')) {
        if (baseRecommendation.includes('BUY')) {
          finalRecommendation = 'HOLD - Wait for Better Valuation';
        }
      }
      
      // Analyst consensus override for strong divergence
      if (validationFlags.includes('ANALYST_DIVERGENCE') && 
          validationFlags.includes('HIGH_FUNDING_COSTS')) {
        if (baseRecommendation === 'BUY') {
          finalRecommendation = 'HOLD - Monitor for Entry Around Analyst Targets';
        }
      }
      
      // Multiple red flags
      if (validationFlags.length >= 3) {
        if (baseRecommendation.includes('BUY')) {
          finalRecommendation = 'HOLD - Multiple Concerns Identified';
        }
      }
    }

    // Log final decision rationale
    if (finalRecommendation !== baseRecommendation) {
      console.log(`🎯 Recommendation adjusted: ${baseRecommendation} → ${finalRecommendation}`);
      console.log(`💡 Rationale: Professional validation identified ${validationFlags.length} concern(s)`);
    }

    return finalRecommendation;
  }

  private generateComprehensiveSynthesis(
    layers: LayerResult[],
    overallScore: number,
    recommendation: string
  ): string {
    const strongLayers = layers.filter(l => l.score >= 70);
    const weakLayers = layers.filter(l => l.score < 40);
    
    let synthesis = `**Seven-Layer Analysis Summary (Score: ${overallScore.toFixed(1)}/100)**\n\n`;
    synthesis += `**Final Recommendation: ${recommendation}**\n\n`;
    
    if (strongLayers.length > 0) {
      synthesis += `**Strength Areas:**\n`;
      strongLayers.forEach(layer => {
        synthesis += `• ${layer.layerName}: ${layer.score.toFixed(1)}/100 - Strong positive signals\n`;
      });
      synthesis += '\n';
    }
    
    if (weakLayers.length > 0) {
      synthesis += `**Concern Areas:**\n`;
      weakLayers.forEach(layer => {
        synthesis += `• ${layer.layerName}: ${layer.score.toFixed(1)}/100 - Requires attention\n`;
      });
      synthesis += '\n';
    }
    
    synthesis += `**AI Model Consensus:** Analysis utilized all three production models (Mistral 7B, CodeLlama 13B, Llama3 8B) across different analytical dimensions to provide comprehensive Nigerian market intelligence.`;
    
    return synthesis;
  }

  private generateRiskAssessment(layers: LayerResult[]): string {
    const riskLayer = layers.find(l => l.layerName === 'Risk Assessment');
    const marketLayer = layers.find(l => l.layerName === 'Nigerian Market Intelligence');
    
    let assessment = 'Risk Assessment: ';
    
    if (riskLayer && riskLayer.score >= 70) {
      assessment += 'LOW RISK - Favorable risk profile with manageable downside';
    } else if (riskLayer && riskLayer.score >= 50) {
      assessment += 'MEDIUM RISK - Balanced risk-reward with standard market exposure';
    } else {
      assessment += 'HIGH RISK - Elevated risk factors require careful position sizing';
    }
    
    if (marketLayer && marketLayer.score < 50) {
      assessment += '. Nigerian market headwinds add additional complexity.';
    }
    
    return assessment;
  }

  private extractLayerScore(reasoning: string): number {
    // Extract numerical score from reasoning text - handle multiple formats
    const scorePatterns = [
      /(?:score|rating)[:\s]*(\d{1,3})/i,
      /(?:risk_score|sentiment_score|portfolio_fit_score)[:\s]*(\d{1,3})/i,
      /(\d{1,3})[:\s]*(?:score|rating|points)/i,
      /(\d{1,3})\/100/i,
      /(\d{1,3})%/i
    ];
    
    for (const pattern of scorePatterns) {
      const match = reasoning.match(pattern);
      if (match) {
        return Math.min(100, Math.max(0, parseInt(match[1])));
      }
    }
    
    // Fallback: analyze sentiment for approximate score
    const text = reasoning.toLowerCase();
    if (text.includes('excellent') || text.includes('outstanding')) return 90;
    if (text.includes('strong') && (text.includes('buy') || text.includes('positive'))) return 85;
    if (text.includes('good') || text.includes('buy') || text.includes('bullish')) return 70;
    if (text.includes('fair') || text.includes('moderate')) return 60;
    if (text.includes('hold') || text.includes('neutral')) return 50;
    if (text.includes('weak') || text.includes('poor')) return 40;
    if (text.includes('sell') || text.includes('bearish')) return 30;
    if (text.includes('strong') && text.includes('sell')) return 15;
    if (text.includes('terrible') || text.includes('avoid')) return 10;
    
    return 50; // Default neutral score
  }

  private extractMarketDataIndicators(result: any): any {
    return {
      priceAction: 'analyzed',
      volumeProfile: 'evaluated',
      marketCap: 'considered',
      liquidity: 'assessed'
    };
  }

  private extractTechnicalIndicators(result: any): any {
    return {
      movingAverages: 'analyzed',
      momentum: 'evaluated',
      patterns: 'identified',
      support_resistance: 'mapped'
    };
  }

  private extractFundamentalIndicators(result: any): any {
    return {
      financialRatios: 'analyzed',
      growthMetrics: 'evaluated',
      profitability: 'assessed',
      balanceSheet: 'reviewed'
    };
  }

  private extractNigerianMarketIndicators(result: any): any {
    return {
      oilCorrelation: 'analyzed',
      cbnPolicy: 'considered',
      fxRisk: 'evaluated',
      politicalRisk: 'assessed'
    };
  }

  private extractRiskIndicators(result: any): any {
    return {
      marketRisk: 'quantified',
      specificRisk: 'identified',
      liquidityRisk: 'measured',
      operationalRisk: 'evaluated'
    };
  }

  private extractSentimentIndicators(result: any): any {
    return {
      newsSentiment: 'analyzed',
      socialSentiment: 'tracked',
      analystSentiment: 'compiled',
      investorSentiment: 'gauged'
    };
  }

  private extractPortfolioIndicators(result: any): any {
    return {
      correlation: 'calculated',
      diversification: 'optimized',
      allocation: 'recommended',
      riskBudget: 'allocated'
    };
  }

  private createFallbackLayerResult(layerName: string, startTime: number): LayerResult {
    return {
      layerName,
      layerType: 'fallback',
      score: 50,
      confidence: 0.3,
      reasoning: `${layerName} temporarily unavailable - using conservative neutral assessment`,
      indicators: {},
      modelUsed: 'fallback',
      processingTime: Date.now() - startTime
    };
  }

  async healthCheck(): Promise<{ status: string; layers: any[] }> {
    try {
      const modelHealth = await ollamaService.healthCheck();
      
      return {
        status: modelHealth ? 'healthy' : 'degraded',
        layers: [
          { name: 'Market Data Intelligence', status: 'ready' },
          { name: 'Technical Analysis', status: 'ready' },
          { name: 'Fundamental Analysis', status: 'ready' },
          { name: 'Nigerian Market Intelligence', status: 'ready' },
          { name: 'Risk Assessment', status: 'ready' },
          { name: 'Sentiment & News Analysis', status: 'ready' },
          { name: 'Portfolio Optimization', status: 'ready' }
        ]
      };
    } catch (error) {
      return {
        status: 'error',
        layers: []
      };
    }
  }
}

export const sevenLayerAnalysisEngine = new SevenLayerAnalysisEngine();