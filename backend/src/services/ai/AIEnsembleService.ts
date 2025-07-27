import { OllamaService } from './OllamaService';
import { LLMOrchestrator } from './LLMOrchestrator';

export interface AIModel {
  name: string;
  type: 'fundamental' | 'technical' | 'sentiment' | 'reasoning' | 'code';
  weight: number;
  endpoint: string;
  isActive: boolean;
}

export interface AnalysisRequest {
  type: 'stock_analysis' | 'portfolio_optimization' | 'market_prediction' | 'risk_assessment';
  ticker?: string;
  portfolio?: any;
  timeHorizon?: string;
  riskTolerance?: string;
  marketData?: any;
  context?: string;
}

export interface ModelResponse {
  modelName: string;
  confidence: number;
  recommendation: string;
  reasoning: string;
  dataPoints: any;
  processingTime: number;
}

export interface EnsembleResult {
  finalRecommendation: string;
  confidence: number;
  consensusLevel: number;
  modelResponses: ModelResponse[];
  reasoning: string;
  riskAssessment: string;
  timeToProcess: number;
}

export class AIEnsembleService {
  private models: AIModel[];
  private ollamaService: OllamaService;
  private orchestrator: LLMOrchestrator;

  constructor() {
    this.ollamaService = new OllamaService();
    this.orchestrator = new LLMOrchestrator();
    this.models = this.initializeModels();
  }

  private initializeModels(): AIModel[] {
    return [
      {
        name: 'llama3-8b',
        type: 'reasoning',
        weight: 0.35,
        endpoint: 'llama3:8b',
        isActive: true
      },
      {
        name: 'mistral-7b-instruct',
        type: 'fundamental',
        weight: 0.35,
        endpoint: 'mistral:7b-instruct',
        isActive: true
      },
      {
        name: 'codellama-13b',
        type: 'technical',
        weight: 0.30,
        endpoint: 'codellama:13b',
        isActive: true
      }
    ];
  }

  async analyzeStock(request: AnalysisRequest): Promise<EnsembleResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Starting AI ensemble analysis for ${request.ticker || 'portfolio'}`);
      
      // Route request to appropriate models based on analysis type
      const selectedModels = this.orchestrator.selectModels(request, this.models);
      
      // Run parallel analysis across selected models
      const modelPromises = selectedModels.map(async (model) => {
        try {
          const prompt = this.orchestrator.buildPrompt(request, model);
          const response = await this.ollamaService.query(model.endpoint, prompt);
          
          return this.parseModelResponse(model, response);
        } catch (error) {
          console.error(`❌ Error with model ${model.name}:`, error);
          return this.createFallbackResponse(model);
        }
      });

      const modelResponses = await Promise.all(modelPromises);
      
      // Synthesize ensemble result
      const ensembleResult = this.synthesizeResponses(modelResponses, request);
      
      const totalTime = Date.now() - startTime;
      ensembleResult.timeToProcess = totalTime;
      
      console.log(`✅ AI ensemble analysis completed in ${totalTime}ms`);
      
      // Log performance metrics
      await this.logPerformanceMetrics(ensembleResult, request);
      
      return ensembleResult;
      
    } catch (error) {
      console.error('❌ AI Ensemble analysis failed:', error);
      throw error;
    }
  }

  private parseModelResponse(model: AIModel, rawResponse: any): ModelResponse {
    try {
      // Parse the model's response and extract key information
      const confidence = this.extractConfidence(rawResponse);
      const recommendation = this.extractRecommendation(rawResponse);
      const reasoning = this.extractReasoning(rawResponse);
      const dataPoints = this.extractDataPoints(rawResponse);
      
      return {
        modelName: model.name,
        confidence,
        recommendation,
        reasoning,
        dataPoints,
        processingTime: rawResponse.processingTime || 0
      };
    } catch (error) {
      console.error(`Error parsing response from ${model.name}:`, error);
      return this.createFallbackResponse(model);
    }
  }

  private createFallbackResponse(model: AIModel): ModelResponse {
    return {
      modelName: model.name,
      confidence: 0.1,
      recommendation: 'HOLD',
      reasoning: `Model ${model.name} unavailable - using fallback`,
      dataPoints: {},
      processingTime: 0
    };
  }

  private synthesizeResponses(responses: ModelResponse[], request: AnalysisRequest): EnsembleResult {
    // Calculate weighted consensus
    const weightedVotes = this.calculateWeightedVotes(responses);
    const consensusLevel = this.calculateConsensusLevel(responses);
    
    // Determine final recommendation based on voting
    const finalRecommendation = this.determineFinalRecommendation(weightedVotes);
    
    // Calculate ensemble confidence
    const confidence = this.calculateEnsembleConfidence(responses, consensusLevel);
    
    // Generate comprehensive reasoning
    const reasoning = this.generateEnsembleReasoning(responses, finalRecommendation);
    
    // Assess risk based on model disagreement and individual assessments
    const riskAssessment = this.assessEnsembleRisk(responses, consensusLevel);
    
    return {
      finalRecommendation,
      confidence,
      consensusLevel,
      modelResponses: responses,
      reasoning,
      riskAssessment,
      timeToProcess: 0 // Will be set by caller
    };
  }

  private calculateWeightedVotes(responses: ModelResponse[]): Map<string, number> {
    const votes = new Map<string, number>();
    
    responses.forEach(response => {
      const model = this.models.find(m => m.name === response.modelName);
      const weight = model ? model.weight : 0.1;
      const adjustedWeight = weight * response.confidence;
      
      const currentVotes = votes.get(response.recommendation) || 0;
      votes.set(response.recommendation, currentVotes + adjustedWeight);
    });
    
    return votes;
  }

  private calculateConsensusLevel(responses: ModelResponse[]): number {
    const recommendations = responses.map(r => r.recommendation);
    const uniqueRecs = new Set(recommendations);
    
    if (uniqueRecs.size === 1) return 1.0; // Perfect consensus
    if (uniqueRecs.size === 2) return 0.7; // Moderate consensus
    return 0.3; // Low consensus
  }

  private determineFinalRecommendation(weightedVotes: Map<string, number>): string {
    let maxVotes = 0;
    let winner = 'HOLD';
    
    for (const [recommendation, votes] of weightedVotes) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = recommendation;
      }
    }
    
    return winner;
  }

  private calculateEnsembleConfidence(responses: ModelResponse[], consensusLevel: number): number {
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    
    // Confidence is boosted by consensus but capped
    return Math.min(0.95, avgConfidence * (0.7 + 0.3 * consensusLevel));
  }

  private generateEnsembleReasoning(responses: ModelResponse[], finalRec: string): string {
    const supportingReasons = responses
      .filter(r => r.recommendation === finalRec)
      .map(r => `• ${r.modelName}: ${r.reasoning}`)
      .join('\n');
    
    const opposingReasons = responses
      .filter(r => r.recommendation !== finalRec)
      .map(r => `• ${r.modelName} (${r.recommendation}): ${r.reasoning}`)
      .join('\n');
    
    let reasoning = `**Ensemble Recommendation: ${finalRec}**\n\n`;
    reasoning += `**Supporting Analysis:**\n${supportingReasons}\n\n`;
    
    if (opposingReasons) {
      reasoning += `**Alternative Perspectives:**\n${opposingReasons}\n\n`;
    }
    
    reasoning += `**Consensus Assessment:** Multiple AI models analyzed this opportunity using different methodologies including fundamental analysis, technical indicators, sentiment analysis, and Nigerian market specifics.`;
    
    return reasoning;
  }

  private assessEnsembleRisk(responses: ModelResponse[], consensusLevel: number): string {
    if (consensusLevel >= 0.8) {
      return 'LOW - High model consensus indicates strong directional conviction';
    } else if (consensusLevel >= 0.5) {
      return 'MEDIUM - Moderate model agreement with some uncertainty';
    } else {
      return 'HIGH - Low model consensus indicates significant uncertainty';
    }
  }

  private extractConfidence(response: any): number {
    // Extract confidence from model response (implementation depends on model output format)
    if (response.confidence !== undefined) return response.confidence;
    if (response.certainty !== undefined) return response.certainty;
    
    // Parse from text if numerical confidence is mentioned
    const text = response.text || response.content || '';
    const confidenceMatch = text.match(/confidence[:\s]+(\d+)%?/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]) / 100;
    }
    
    return 0.7; // Default confidence
  }

  private extractRecommendation(response: any): string {
    const text = response.text || response.content || '';
    
    // Look for explicit recommendations
    if (text.match(/\b(BUY|STRONG BUY)\b/i)) return 'BUY';
    if (text.match(/\b(SELL|STRONG SELL)\b/i)) return 'SELL';
    if (text.match(/\bHOLD\b/i)) return 'HOLD';
    
    // Default to HOLD if unclear
    return 'HOLD';
  }

  private extractReasoning(response: any): string {
    const text = response.text || response.content || '';
    
    // Extract the main reasoning section
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).join('. ').trim() + '.';
  }

  private extractDataPoints(response: any): any {
    // Extract structured data points mentioned in the response
    return {
      timestamp: Date.now(),
      modelType: response.modelType || 'unknown',
      keyMetrics: response.metrics || {},
      technicalIndicators: response.technical || {},
      fundamentalRatios: response.fundamental || {}
    };
  }

  private async logPerformanceMetrics(result: EnsembleResult, request: AnalysisRequest): Promise<void> {
    try {
      // Log to database for monitoring and improvement
      const metrics = {
        requestType: request.type,
        ticker: request.ticker,
        totalProcessingTime: result.timeToProcess,
        consensusLevel: result.consensusLevel,
        finalConfidence: result.confidence,
        modelsUsed: result.modelResponses.length,
        timestamp: new Date()
      };
      
      console.log('📊 AI Performance Metrics:', metrics);
      
      // TODO: Store in ai_model_performance table
      // await prisma.aiModelPerformance.create({ data: metrics });
      
    } catch (error) {
      console.error('Error logging AI performance metrics:', error);
    }
  }

  async healthCheck(): Promise<{ status: string; models: any[] }> {
    const modelStatuses = await Promise.all(
      this.models.map(async (model) => {
        try {
          const isHealthy = await this.ollamaService.healthCheck(model.endpoint);
          return {
            name: model.name,
            status: isHealthy ? 'healthy' : 'unhealthy',
            weight: model.weight,
            isActive: model.isActive
          };
        } catch (error) {
          return {
            name: model.name,
            status: 'error',
            weight: model.weight,
            isActive: false,
            error: error.message
          };
        }
      })
    );

    const healthyModels = modelStatuses.filter(m => m.status === 'healthy').length;
    const overallStatus = healthyModels >= 2 ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      models: modelStatuses
    };
  }
}

export const aiEnsembleService = new AIEnsembleService();