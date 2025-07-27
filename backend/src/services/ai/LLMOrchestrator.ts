import { AIModel, AnalysisRequest } from './AIEnsembleService';

export interface PromptTemplate {
  system: string;
  user: string;
  context?: string;
}

export class LLMOrchestrator {
  
  selectModels(request: AnalysisRequest, availableModels: AIModel[]): AIModel[] {
    const activeModels = availableModels.filter(m => m.isActive);
    
    switch (request.type) {
      case 'stock_analysis':
        // Use all models for comprehensive stock analysis
        return activeModels;
        
      case 'portfolio_optimization':
        // Focus on reasoning and fundamental analysis models
        return activeModels.filter(m => 
          m.type === 'reasoning' || m.type === 'fundamental' || m.type === 'code'
        );
        
      case 'market_prediction':
        // Use sentiment and technical models primarily
        return activeModels.filter(m => 
          m.type === 'sentiment' || m.type === 'technical' || m.type === 'reasoning'
        );
        
      case 'risk_assessment':
        // Use all models with emphasis on reasoning
        return activeModels;
        
      default:
        return activeModels;
    }
  }

  buildPrompt(request: AnalysisRequest, model: AIModel): string {
    const template = this.getPromptTemplate(request.type, model.type);
    
    // Build context-specific prompt
    let systemPrompt = template.system;
    let userPrompt = template.user;
    
    // Inject request-specific data
    if (request.ticker) {
      userPrompt = userPrompt.replace('{TICKER}', request.ticker);
    }
    
    if (request.portfolio) {
      userPrompt = userPrompt.replace('{PORTFOLIO}', JSON.stringify(request.portfolio));
    }
    
    if (request.timeHorizon) {
      userPrompt = userPrompt.replace('{TIME_HORIZON}', request.timeHorizon);
    }
    
    if (request.riskTolerance) {
      userPrompt = userPrompt.replace('{RISK_TOLERANCE}', request.riskTolerance);
    }
    
    if (request.marketData) {
      userPrompt = userPrompt.replace('{MARKET_DATA}', JSON.stringify(request.marketData));
    }
    
    // Combine system and user prompts
    return `${systemPrompt}\n\nUser Request: ${userPrompt}`;
  }

  private getPromptTemplate(requestType: string, modelType: string): PromptTemplate {
    const baseContext = this.getNigerianMarketContext();
    
    switch (requestType) {
      case 'stock_analysis':
        return this.getStockAnalysisTemplate(modelType, baseContext);
        
      case 'portfolio_optimization':
        return this.getPortfolioOptimizationTemplate(modelType, baseContext);
        
      case 'market_prediction':
        return this.getMarketPredictionTemplate(modelType, baseContext);
        
      case 'risk_assessment':
        return this.getRiskAssessmentTemplate(modelType, baseContext);
        
      default:
        return this.getDefaultTemplate(modelType, baseContext);
    }
  }

  private getNigerianMarketContext(): string {
    return `
NIGERIAN MARKET CONTEXT:
- Nigerian Stock Exchange (NGX) operates Mon-Fri, 10:00-14:30 WAT
- Currency: Nigerian Naira (NGN), often volatile against USD
- Key sectors: Banking, Oil & Gas, Consumer Goods, Insurance, Industrial
- Major indices: NGX ASI (All Share Index), NGX 30 (top 30 companies)
- Oil price heavily influences market (Nigeria is oil-dependent economy)
- Central Bank of Nigeria (CBN) monetary policy impacts significantly
- Political stability and elections affect market sentiment
- Foreign exchange challenges impact import-dependent companies
- Banking sector regulation changes frequently
- Infrastructure challenges affect logistics companies
- Rising inflation affects consumer purchasing power
    `;
  }

  private getStockAnalysisTemplate(modelType: string, context: string): PromptTemplate {
    const baseSystem = `You are an expert Nigerian stock market analyst with deep knowledge of local market dynamics. ${context}`;
    
    switch (modelType) {
      case 'fundamental':
        return {
          system: `${baseSystem}
Focus on fundamental analysis including:
- Financial ratios (P/E, P/B, ROE, ROA, Debt/Equity)
- Revenue and profit growth trends
- Balance sheet strength
- Cash flow analysis
- Competitive position in Nigerian market
- Management quality and corporate governance
- Currency exposure and hedging strategies`,
          user: `Analyze {TICKER} from a fundamental perspective. Consider Nigerian market dynamics, oil price impact, currency risks, and provide a BUY/SELL/HOLD recommendation with confidence level.`
        };
        
      case 'technical':
        return {
          system: `${baseSystem}
Focus on technical analysis including:
- Price trends and chart patterns
- Support and resistance levels
- Volume analysis
- Moving averages and momentum indicators
- Nigerian market seasonality patterns
- Correlation with oil prices and NGX ASI`,
          user: `Perform technical analysis on {TICKER}. Analyze price action, volume patterns, and technical indicators. Provide BUY/SELL/HOLD recommendation.`
        };
        
      case 'sentiment':
        return {
          system: `${baseSystem}
Focus on market sentiment analysis including:
- News sentiment and media coverage
- Social media discussions
- Analyst opinions and upgrades/downgrades
- Foreign investor sentiment
- Local investor behavior patterns
- Political and economic sentiment impact`,
          user: `Analyze market sentiment for {TICKER}. Consider news flow, social sentiment, and overall market mood. Provide sentiment-based recommendation.`
        };
        
      case 'reasoning':
        return {
          system: `${baseSystem}
You excel at complex reasoning and synthesis. Consider:
- Multiple data sources and perspectives
- Risk-reward analysis
- Scenario planning (bull/base/bear cases)
- Long-term vs short-term outlook
- Nigerian economic environment impact
- Global market correlations`,
          user: `Provide comprehensive analysis of {TICKER} considering all available information. Synthesize fundamental, technical, and sentiment factors for Nigerian market context.`
        };
        
      default:
        return this.getDefaultTemplate(modelType, context);
    }
  }

  private getPortfolioOptimizationTemplate(modelType: string, context: string): PromptTemplate {
    const baseSystem = `You are a portfolio optimization expert specializing in Nigerian equities. ${context}`;
    
    switch (modelType) {
      case 'reasoning':
        return {
          system: `${baseSystem}
Focus on portfolio construction principles:
- Risk diversification across Nigerian sectors
- Correlation analysis between holdings
- Risk-adjusted return optimization
- Nigerian market-specific risk factors
- Currency exposure management
- Liquidity considerations`,
          user: `Optimize this portfolio: {PORTFOLIO}. Consider diversification, risk levels, and Nigerian market dynamics. Risk tolerance: {RISK_TOLERANCE}. Time horizon: {TIME_HORIZON}.`
        };
        
      case 'fundamental':
        return {
          system: `${baseSystem}
Analyze portfolio from fundamental perspective:
- Quality of underlying companies
- Sector allocation balance
- Financial strength distribution
- Growth vs value balance
- Dividend yield optimization`,
          user: `Review portfolio {PORTFOLIO} fundamentals. Suggest rebalancing based on company quality and sector exposure.`
        };
        
      default:
        return this.getDefaultTemplate(modelType, context);
    }
  }

  private getMarketPredictionTemplate(modelType: string, context: string): PromptTemplate {
    const baseSystem = `You are a Nigerian market forecasting specialist. ${context}`;
    
    switch (modelType) {
      case 'sentiment':
        return {
          system: `${baseSystem}
Focus on sentiment-driven market predictions:
- Political climate impact
- Economic policy changes
- Foreign investor flows
- Oil price sentiment correlation
- Social and economic stability indicators`,
          user: `Predict Nigerian market direction based on current sentiment indicators. Consider political, economic, and social factors.`
        };
        
      case 'reasoning':
        return {
          system: `${baseSystem}
Provide systematic market outlook considering:
- Macroeconomic trends
- Sector rotation patterns
- Seasonal market behaviors
- Global market correlations
- Nigerian-specific catalysts`,
          user: `Forecast Nigerian stock market direction for {TIME_HORIZON}. Consider all relevant factors and provide probability-weighted scenarios.`
        };
        
      default:
        return this.getDefaultTemplate(modelType, context);
    }
  }

  private getRiskAssessmentTemplate(modelType: string, context: string): PromptTemplate {
    const baseSystem = `You are a risk management expert for Nigerian equities. ${context}`;
    
    return {
      system: `${baseSystem}
Focus on comprehensive risk analysis:
- Market risk (volatility, correlation)
- Currency risk (NGN fluctuations)
- Political risk (policy changes, elections)
- Liquidity risk (trading volumes)
- Sector-specific risks
- Counterparty risk (broker, custodian)
- Operational risk (infrastructure, technology)`,
      user: `Assess risks for {TICKER} or portfolio {PORTFOLIO}. Provide detailed risk breakdown and mitigation strategies for Nigerian market context.`
    };
  }

  private getDefaultTemplate(modelType: string, context: string): PromptTemplate {
    return {
      system: `You are a Nigerian financial market expert. ${context}
Provide analysis appropriate for your specialization: ${modelType}`,
      user: `Analyze the request and provide professional financial advice with clear reasoning and confidence level.`
    };
  }

  /**
   * Adjust model weights based on performance history
   */
  adjustModelWeights(models: AIModel[], performanceHistory: any[]): AIModel[] {
    return models.map(model => {
      const modelHistory = performanceHistory.filter(h => h.modelName === model.name);
      
      if (modelHistory.length === 0) return model;
      
      // Calculate average accuracy over last 30 days
      const recentHistory = modelHistory.filter(h => 
        Date.now() - h.timestamp < 30 * 24 * 60 * 60 * 1000
      );
      
      if (recentHistory.length === 0) return model;
      
      const avgAccuracy = recentHistory.reduce((sum, h) => sum + h.accuracy, 0) / recentHistory.length;
      
      // Adjust weight based on performance (±20% max adjustment)
      const performanceMultiplier = 0.8 + (avgAccuracy * 0.4);
      const adjustedWeight = Math.max(0.05, Math.min(0.5, model.weight * performanceMultiplier));
      
      return {
        ...model,
        weight: adjustedWeight
      };
    });
  }

  /**
   * Generate fallback response when models fail
   */
  generateFallbackResponse(request: AnalysisRequest): any {
    const conservativeResponse = {
      recommendation: 'HOLD',
      confidence: 0.3,
      reasoning: 'AI models temporarily unavailable. Conservative HOLD recommendation suggested pending detailed analysis.',
      riskLevel: 'MEDIUM',
      fallback: true
    };

    switch (request.type) {
      case 'portfolio_optimization':
        return {
          ...conservativeResponse,
          reasoning: 'Portfolio analysis requires manual review. Consider diversification across Nigerian sectors and maintain current positions until AI systems restore.'
        };
        
      case 'risk_assessment':
        return {
          ...conservativeResponse,
          riskLevel: 'HIGH',
          reasoning: 'Risk assessment unavailable. Exercise maximum caution and consider reducing position sizes until analysis capability restored.'
        };
        
      default:
        return conservativeResponse;
    }
  }
}

export const llmOrchestrator = new LLMOrchestrator();