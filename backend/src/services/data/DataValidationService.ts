interface ValidationRule {
  name: string;
  description: string;
  critical: boolean;
  validator: (data: any) => ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
  score: number; // 0-100
}

interface DataValidationReport {
  symbol: string;
  timestamp: Date;
  overallScore: number;
  overallStatus: 'valid' | 'warning' | 'invalid';
  rules: Array<{
    rule: string;
    result: ValidationResult;
  }>;
  recommendations: string[];
  dataQuality: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
}

interface HealthMetrics {
  systemHealth: number; // 0-100
  dataSourceHealth: Record<string, number>;
  cacheHealth: number;
  updateHealth: number;
  alertCount: number;
  lastHealthCheck: Date;
  issues: Array<{
    component: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    suggestions: string[];
  }>;
}

export class DataValidationService {
  private validationRules: ValidationRule[] = [];
  private validationHistory: Map<string, DataValidationReport[]> = new Map();

  constructor() {
    this.initializeValidationRules();
    console.log('🔍 Data validation service initialized');
  }

  // Initialize validation rules
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        name: 'price_validity',
        description: 'Price must be positive and within reasonable bounds',
        critical: true,
        validator: (data) => this.validatePrice(data)
      },
      {
        name: 'price_consistency',
        description: 'Multiple price sources should agree within reasonable range',
        critical: true,
        validator: (data) => this.validatePriceConsistency(data)
      },
      {
        name: 'data_freshness',
        description: 'Data should be recent and not stale',
        critical: true,
        validator: (data) => this.validateDataFreshness(data)
      },
      {
        name: 'confidence_threshold',
        description: 'Data confidence should meet minimum standards',
        critical: false,
        validator: (data) => this.validateConfidence(data)
      },
      {
        name: 'source_diversity',
        description: 'Data should come from multiple independent sources',
        critical: false,
        validator: (data) => this.validateSourceDiversity(data)
      },
      {
        name: 'volume_reasonableness',
        description: 'Trading volume should be within expected ranges',
        critical: false,
        validator: (data) => this.validateVolume(data)
      },
      {
        name: 'change_reasonableness',
        description: 'Price changes should be within reasonable market bounds',
        critical: false,
        validator: (data) => this.validatePriceChange(data)
      },
      {
        name: 'metadata_completeness',
        description: 'Required metadata fields should be present',
        critical: false,
        validator: (data) => this.validateMetadata(data)
      }
    ];

    console.log(`📋 Loaded ${this.validationRules.length} validation rules`);
  }

  // Validate stock quote data
  async validateStockData(symbol: string, data: any): Promise<DataValidationReport> {
    console.log(`🔍 Validating data for ${symbol}...`);
    
    const results: Array<{ rule: string; result: ValidationResult }> = [];
    let totalScore = 0;
    let criticalFailures = 0;

    // Run all validation rules
    for (const rule of this.validationRules) {
      try {
        const result = rule.validator(data);
        results.push({ rule: rule.name, result });
        
        totalScore += result.score;
        
        if (rule.critical && !result.passed) {
          criticalFailures++;
        }
        
      } catch (error) {
        console.error(`❌ Validation rule ${rule.name} failed:`, error.message);
        
        results.push({
          rule: rule.name,
          result: {
            passed: false,
            message: `Validation error: ${error.message}`,
            score: 0
          }
        });
        
        if (rule.critical) criticalFailures++;
      }
    }

    // Calculate overall metrics
    const overallScore = Math.round(totalScore / this.validationRules.length);
    const overallStatus = this.determineOverallStatus(overallScore, criticalFailures);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(results);
    
    // Calculate data quality dimensions
    const dataQuality = this.calculateDataQuality(data, results);

    const report: DataValidationReport = {
      symbol,
      timestamp: new Date(),
      overallScore,
      overallStatus,
      rules: results,
      recommendations,
      dataQuality
    };

    // Store in history
    this.storeValidationHistory(symbol, report);
    
    // Log results
    const status = overallStatus.toUpperCase();
    console.log(`🔍 Validation complete for ${symbol}: ${status} (${overallScore}/100)`);
    
    if (criticalFailures > 0) {
      console.warn(`⚠️ ${criticalFailures} critical validation failures for ${symbol}`);
    }

    return report;
  }

  // Individual validation methods
  private validatePrice(data: any): ValidationResult {
    const price = data.consensusPrice || data.price;
    
    if (!price || typeof price !== 'number') {
      return {
        passed: false,
        message: 'Price is missing or not a number',
        score: 0
      };
    }

    if (price <= 0) {
      return {
        passed: false,
        message: 'Price must be positive',
        score: 0
      };
    }

    // Nigerian stock price reasonableness (₦0.01 to ₦10,000)
    if (price < 0.01 || price > 10000) {
      return {
        passed: false,
        message: `Price ₦${price} outside reasonable range (₦0.01 - ₦10,000)`,
        score: 20
      };
    }

    return {
      passed: true,
      message: `Valid price: ₦${price}`,
      score: 100
    };
  }

  private validatePriceConsistency(data: any): ValidationResult {
    if (!data.prices || !Array.isArray(data.prices) || data.prices.length < 2) {
      return {
        passed: true,
        message: 'Single source data - consistency check skipped',
        score: 50
      };
    }

    const prices = data.prices.map((p: any) => p.price).filter((p: number) => p > 0);
    
    if (prices.length < 2) {
      return {
        passed: false,
        message: 'Insufficient valid prices for consistency check',
        score: 20
      };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const avgPrice = (min + max) / 2;
    const deviation = (range / avgPrice) * 100;

    // Consider consistent if deviation is less than 5%
    if (deviation <= 5) {
      return {
        passed: true,
        message: `Good price consistency: ${deviation.toFixed(2)}% deviation`,
        score: 100
      };
    } else if (deviation <= 10) {
      return {
        passed: true,
        message: `Acceptable price consistency: ${deviation.toFixed(2)}% deviation`,
        score: 75
      };
    } else if (deviation <= 20) {
      return {
        passed: false,
        message: `Poor price consistency: ${deviation.toFixed(2)}% deviation`,
        score: 40
      };
    } else {
      return {
        passed: false,
        message: `Very poor price consistency: ${deviation.toFixed(2)}% deviation`,
        score: 10
      };
    }
  }

  private validateDataFreshness(data: any): ValidationResult {
    const now = Date.now();
    const dataTime = data.timestamp ? new Date(data.timestamp).getTime() : now;
    const age = now - dataTime;

    // Convert age to minutes
    const ageMinutes = age / (60 * 1000);

    if (ageMinutes <= 2) {
      return {
        passed: true,
        message: `Fresh data: ${Math.round(ageMinutes * 60)}s old`,
        score: 100
      };
    } else if (ageMinutes <= 5) {
      return {
        passed: true,
        message: `Recent data: ${Math.round(ageMinutes)}m old`,
        score: 80
      };
    } else if (ageMinutes <= 15) {
      return {
        passed: false,
        message: `Aging data: ${Math.round(ageMinutes)}m old`,
        score: 50
      };
    } else if (ageMinutes <= 60) {
      return {
        passed: false,
        message: `Stale data: ${Math.round(ageMinutes)}m old`,
        score: 20
      };
    } else {
      return {
        passed: false,
        message: `Very stale data: ${Math.round(ageMinutes / 60)}h old`,
        score: 0
      };
    }
  }

  private validateConfidence(data: any): ValidationResult {
    const confidence = data.confidence || 0;

    if (confidence >= 0.8) {
      return {
        passed: true,
        message: `High confidence: ${(confidence * 100).toFixed(1)}%`,
        score: 100
      };
    } else if (confidence >= 0.6) {
      return {
        passed: true,
        message: `Good confidence: ${(confidence * 100).toFixed(1)}%`,
        score: 80
      };
    } else if (confidence >= 0.4) {
      return {
        passed: false,
        message: `Low confidence: ${(confidence * 100).toFixed(1)}%`,
        score: 50
      };
    } else {
      return {
        passed: false,
        message: `Very low confidence: ${(confidence * 100).toFixed(1)}%`,
        score: 20
      };
    }
  }

  private validateSourceDiversity(data: any): ValidationResult {
    const sources = data.metadata?.sources || [];
    const uniqueSources = new Set(sources).size;

    if (uniqueSources >= 3) {
      return {
        passed: true,
        message: `Good source diversity: ${uniqueSources} sources`,
        score: 100
      };
    } else if (uniqueSources >= 2) {
      return {
        passed: true,
        message: `Acceptable source diversity: ${uniqueSources} sources`,
        score: 70
      };
    } else if (uniqueSources === 1) {
      return {
        passed: false,
        message: `Poor source diversity: ${uniqueSources} source`,
        score: 40
      };
    } else {
      return {
        passed: false,
        message: 'No source information available',
        score: 0
      };
    }
  }

  private validateVolume(data: any): ValidationResult {
    // This is a placeholder - would need historical volume data for proper validation
    const hasVolumeData = data.prices?.some((p: any) => p.volume && p.volume > 0);
    
    if (hasVolumeData) {
      return {
        passed: true,
        message: 'Volume data available',
        score: 100
      };
    } else {
      return {
        passed: false,
        message: 'No volume data available',
        score: 30
      };
    }
  }

  private validatePriceChange(data: any): ValidationResult {
    // This would require historical price data for proper validation
    // For now, just check if change data is available
    const hasChangeData = data.prices?.some((p: any) => 
      p.change !== undefined || p.changePercent !== undefined
    );
    
    if (hasChangeData) {
      return {
        passed: true,
        message: 'Price change data available',
        score: 100
      };
    } else {
      return {
        passed: false,
        message: 'No price change data available',
        score: 50
      };
    }
  }

  private validateMetadata(data: any): ValidationResult {
    const metadata = data.metadata || {};
    const requiredFields = ['sources', 'priceRange', 'dataAge'];
    const missingFields = requiredFields.filter(field => !metadata[field]);

    if (missingFields.length === 0) {
      return {
        passed: true,
        message: 'All required metadata present',
        score: 100
      };
    } else {
      return {
        passed: false,
        message: `Missing metadata: ${missingFields.join(', ')}`,
        score: Math.max(0, 100 - (missingFields.length * 25))
      };
    }
  }

  // Determine overall validation status
  private determineOverallStatus(score: number, criticalFailures: number): 'valid' | 'warning' | 'invalid' {
    if (criticalFailures > 0) return 'invalid';
    if (score >= 80) return 'valid';
    if (score >= 60) return 'warning';
    return 'invalid';
  }

  // Generate recommendations based on validation results
  private generateRecommendations(results: Array<{ rule: string; result: ValidationResult }>): string[] {
    const recommendations: string[] = [];

    for (const { rule, result } of results) {
      if (!result.passed) {
        switch (rule) {
          case 'price_validity':
            recommendations.push('Verify data source integrity and price calculation logic');
            break;
          case 'price_consistency':
            recommendations.push('Review price sources for accuracy or add more sources');
            break;
          case 'data_freshness':
            recommendations.push('Increase update frequency or check data source connectivity');
            break;
          case 'confidence_threshold':
            recommendations.push('Improve data quality or use additional confirmation sources');
            break;
          case 'source_diversity':
            recommendations.push('Add more data sources for better reliability');
            break;
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Data quality is good - continue monitoring');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Calculate data quality dimensions
  private calculateDataQuality(data: any, results: Array<{ rule: string; result: ValidationResult }>): any {
    const getScore = (ruleName: string) => {
      const result = results.find(r => r.rule === ruleName);
      return result ? result.result.score : 50;
    };

    return {
      completeness: Math.round((getScore('metadata_completeness') + getScore('source_diversity')) / 2),
      accuracy: Math.round((getScore('price_validity') + getScore('price_consistency')) / 2),
      consistency: getScore('price_consistency'),
      timeliness: getScore('data_freshness')
    };
  }

  // Store validation history
  private storeValidationHistory(symbol: string, report: DataValidationReport): void {
    const history = this.validationHistory.get(symbol) || [];
    history.push(report);
    
    // Keep only last 50 reports per symbol
    if (history.length > 50) {
      history.shift();
    }
    
    this.validationHistory.set(symbol, history);
  }

  // System health check
  async performSystemHealthCheck(): Promise<HealthMetrics> {
    console.log('🏥 Performing system health check...');
    
    const issues: HealthMetrics['issues'] = [];
    let systemHealth = 100;

    // Check data source health
    const dataSourceHealth: Record<string, number> = {};
    try {
      const { nigerianStockDataAggregator } = await import('./NigerianStockDataAggregator');
      const sourceHealth = await nigerianStockDataAggregator.checkSourceHealth();
      
      for (const [source, isHealthy] of Object.entries(sourceHealth)) {
        dataSourceHealth[source] = isHealthy ? 100 : 0;
        if (!isHealthy) {
          systemHealth -= 15;
          issues.push({
            component: `data_source_${source}`,
            severity: 'high',
            message: `Data source ${source} is not responding`,
            suggestions: ['Check network connectivity', 'Verify source endpoint', 'Consider fallback sources']
          });
        }
      }
    } catch (error) {
      systemHealth -= 30;
      issues.push({
        component: 'data_sources',
        severity: 'critical',
        message: 'Unable to check data source health',
        suggestions: ['Check data aggregator service', 'Verify system dependencies']
      });
    }

    // Check cache health
    let cacheHealth = 100;
    try {
      const { stockDataCache } = await import('./IntelligentCacheManager');
      const cacheStats = stockDataCache.getCacheStats();
      
      if (cacheStats.size === 0) {
        cacheHealth = 50;
        issues.push({
          component: 'cache',
          severity: 'medium',
          message: 'Cache is empty',
          suggestions: ['Trigger initial data load', 'Check cache configuration']
        });
      }
    } catch (error) {
      cacheHealth = 0;
      systemHealth -= 20;
      issues.push({
        component: 'cache',
        severity: 'high',
        message: 'Cache system error',
        suggestions: ['Restart cache service', 'Check memory availability']
      });
    }

    // Check update service health
    let updateHealth = 100;
    try {
      const { realTimeUpdateManager } = await import('./RealTimeUpdateManager');
      const updateStatus = realTimeUpdateManager.getStatus();
      
      if (!updateStatus.isRunning) {
        updateHealth = 0;
        systemHealth -= 25;
        issues.push({
          component: 'update_manager',
          severity: 'critical',
          message: 'Real-time update manager is not running',
          suggestions: ['Start update manager', 'Check system resources']
        });
      }
    } catch (error) {
      updateHealth = 0;
      systemHealth -= 25;
      issues.push({
        component: 'update_manager',
        severity: 'critical',
        message: 'Update manager service error',
        suggestions: ['Restart update service', 'Check service dependencies']
      });
    }

    // Get alert count
    let alertCount = 0;
    try {
      const { dataFreshnessMonitor } = await import('./DataFreshnessMonitor');
      alertCount = dataFreshnessMonitor.getActiveAlerts().length;
      
      if (alertCount > 5) {
        systemHealth -= 10;
        issues.push({
          component: 'alerts',
          severity: 'medium',
          message: `High number of active alerts: ${alertCount}`,
          suggestions: ['Review alert conditions', 'Address underlying issues']
        });
      }
    } catch (error) {
      issues.push({
        component: 'monitoring',
        severity: 'low',
        message: 'Unable to check alert status',
        suggestions: ['Check monitoring service']
      });
    }

    return {
      systemHealth: Math.max(0, systemHealth),
      dataSourceHealth,
      cacheHealth,
      updateHealth,
      alertCount,
      lastHealthCheck: new Date(),
      issues
    };
  }

  // Public interface methods
  getValidationHistory(symbol: string, limit = 10): DataValidationReport[] {
    const history = this.validationHistory.get(symbol) || [];
    return history.slice(-limit);
  }

  getOverallDataQuality(): { symbols: number; avgScore: number; validSymbols: number } {
    let totalScore = 0;
    let validCount = 0;
    const symbolCount = this.validationHistory.size;

    for (const reports of this.validationHistory.values()) {
      if (reports.length > 0) {
        const latestReport = reports[reports.length - 1];
        totalScore += latestReport.overallScore;
        if (latestReport.overallStatus === 'valid') {
          validCount++;
        }
      }
    }

    return {
      symbols: symbolCount,
      avgScore: symbolCount > 0 ? Math.round(totalScore / symbolCount) : 0,
      validSymbols: validCount
    };
  }

  // Clear validation history
  clearHistory(symbol?: string): void {
    if (symbol) {
      this.validationHistory.delete(symbol);
      console.log(`🗑️ Cleared validation history for ${symbol}`);
    } else {
      this.validationHistory.clear();
      console.log('🗑️ Cleared all validation history');
    }
  }
}

// Singleton instance
export const dataValidationService = new DataValidationService();