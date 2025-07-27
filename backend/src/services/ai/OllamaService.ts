import axios, { AxiosInstance } from 'axios';

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export class OllamaService {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number = 600000; // 10 minutes for comprehensive seven-layer analysis
  private retryAttempts: number = 3;

  constructor() {
    // In production, this will be the Hetzner server IP
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🤖 Ollama Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Ollama Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Ollama Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Ollama Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Query a specific model with a prompt
   */
  async query(model: string, prompt: string, options?: any): Promise<OllamaResponse> {
    const requestData = {
      model,
      prompt,
      stream: false, // We want complete responses, not streaming
      options: {
        temperature: options?.temperature || 0.7,
        top_p: options?.top_p || 0.9,
        top_k: options?.top_k || 40,
        repeat_penalty: options?.repeat_penalty || 1.1,
        ...options
      }
    };

    try {
      console.log(`🔄 Querying ${model} with prompt length: ${prompt.length} chars`);
      
      const response = await this.client.post('/api/generate', requestData);
      
      if (!response.data.done) {
        throw new Error('Incomplete response from Ollama');
      }

      console.log(`✅ ${model} responded with ${response.data.response.length} chars`);
      
      return response.data;
    } catch (error) {
      console.error(`❌ Error querying ${model}:`, error);
      throw error;
    }
  }

  /**
   * Query with retry logic and fallback
   */
  async queryWithRetry(model: string, prompt: string, options?: any): Promise<OllamaResponse> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.query(model, prompt, options);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt}/${this.retryAttempts} failed for ${model}:`, error.message);
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error) {
      console.error('❌ Error listing models:', error);
      throw error;
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(model: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(m => m.name === model || m.name.startsWith(model));
    } catch (error) {
      console.error(`❌ Error checking model ${model}:`, error);
      return false;
    }
  }

  /**
   * Pull/download a model if not available
   */
  async pullModel(model: string): Promise<void> {
    try {
      console.log(`📥 Pulling model: ${model}`);
      
      // Note: This is a streaming endpoint, but we'll wait for completion
      const response = await this.client.post('/api/pull', {
        name: model
      }, {
        timeout: 600000 // 10 minutes for model download
      });
      
      console.log(`✅ Model ${model} pulled successfully`);
    } catch (error) {
      console.error(`❌ Error pulling model ${model}:`, error);
      throw error;
    }
  }

  /**
   * Health check for Ollama service
   */
  async healthCheck(model?: string): Promise<boolean> {
    try {
      // First check if Ollama is running
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      
      if (model) {
        // Check specific model availability
        return await this.isModelAvailable(model);
      }
      
      return response.status === 200;
    } catch (error) {
      console.error('❌ Ollama health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get model info and performance stats
   */
  async getModelInfo(model: string): Promise<ModelInfo | null> {
    try {
      const models = await this.listModels();
      return models.find(m => m.name === model || m.name.startsWith(model)) || null;
    } catch (error) {
      console.error(`❌ Error getting model info for ${model}:`, error);
      return null;
    }
  }

  /**
   * Benchmark a model with a test prompt
   */
  async benchmarkModel(model: string): Promise<{
    model: string;
    available: boolean;
    responseTime: number;
    tokensPerSecond: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Check if model exists first
      const available = await this.isModelAvailable(model);
      if (!available) {
        return {
          model,
          available: false,
          responseTime: 0,
          tokensPerSecond: 0,
          error: 'Model not available'
        };
      }

      // Run a simple test query
      const testPrompt = 'Analyze the Nigerian stock market outlook. Provide a brief 50-word analysis.';
      const response = await this.query(model, testPrompt, { temperature: 0.1 });
      
      const responseTime = Date.now() - startTime;
      const tokensPerSecond = response.eval_count && response.eval_duration
        ? (response.eval_count / (response.eval_duration / 1000000000))
        : 0;

      return {
        model,
        available: true,
        responseTime,
        tokensPerSecond,
      };
    } catch (error) {
      return {
        model,
        available: false,
        responseTime: Date.now() - startTime,
        tokensPerSecond: 0,
        error: error.message
      };
    }
  }

  /**
   * Initialize required models for the AI ensemble
   */
  async initializeModels(): Promise<void> {
    const requiredModels = [
      'llama3:8b',
      'mistral:7b-instruct',
      'codellama:13b'
    ];

    console.log('🚀 Initializing AI models...');

    for (const model of requiredModels) {
      try {
        const available = await this.isModelAvailable(model);
        
        if (!available) {
          console.log(`📥 Model ${model} not found, attempting to pull...`);
          await this.pullModel(model);
        } else {
          console.log(`✅ Model ${model} already available`);
        }
        
        // Run a quick benchmark
        const benchmark = await this.benchmarkModel(model);
        console.log(`📊 ${model} benchmark:`, benchmark);
        
      } catch (error) {
        console.error(`❌ Failed to initialize ${model}:`, error.message);
        // Continue with other models
      }
    }

    console.log('✅ Model initialization complete');
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics(): Promise<{
    models: any[];
    systemHealth: boolean;
    uptime: string;
    lastCheck: Date;
  }> {
    try {
      const models = await this.listModels();
      const systemHealth = await this.healthCheck();
      
      // Get benchmarks for all models
      const modelBenchmarks = await Promise.all(
        models.map(model => this.benchmarkModel(model.name))
      );

      return {
        models: modelBenchmarks,
        systemHealth,
        uptime: 'Unknown', // Would need system API to get actual uptime
        lastCheck: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting system metrics:', error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Any cleanup needed for Ollama connections
    console.log('🧹 OllamaService cleanup complete');
  }
}

export const ollamaService = new OllamaService();