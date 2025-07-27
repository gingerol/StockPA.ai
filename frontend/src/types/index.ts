// Core types for StockPA.ai production application

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  
  // Trial and subscription status
  status: 'TRIAL' | 'FREE' | 'PRO_MONTHLY' | 'PRO_ANNUAL' | 'EXPIRED';
  
  // Trial tracking
  trialStartDate: Date;
  trialEndDate: Date;
  totalTrialDays: number;
  hasUsedTrial: boolean;
  
  // Extension tracking
  requestExtensionUsed: boolean;
  referralExtensions: number;
  extensionsUsed: number;
  
  // Referral system
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  freeMonthsEarned: number;
  
  // Timestamps
  createdAt: Date;
  lastLogin: Date;
}

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  purchasePrice?: number;
  currentPrice: number;
  marketCap?: number;
  sector?: string;
  exchange: 'NGX';
}

export interface Portfolio {
  id: string;
  userId: string;
  stocks: Stock[];
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  unrealizedGains: number;
  lastUpdated: Date;
}

export interface Recommendation {
  id: string;
  portfolioId: string;
  stock: Stock;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number; // 50-100
  targetPrice?: number;
  quantity?: number;
  reason: string;
  detailedReason?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Alert {
  id: string;
  userId: string;
  type: 'PRICE_TARGET' | 'PORTFOLIO_INSIGHT' | 'RECOMMENDATION';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  actionable: boolean;
  relatedStock?: string;
  targetPrice?: number;
  createdAt: Date;
  read: boolean;
}

export interface MarketData {
  ticker: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52Week?: number;
  low52Week?: number;
  lastUpdated: Date;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface PortfolioUploadForm {
  file?: File;
  manualStocks: ManualStockInput[];
}

export interface ManualStockInput {
  ticker: string;
  quantity: number;
  purchasePrice?: number;
}

export interface UserPreferencesForm {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  emailAlerts: boolean;
  priceAlertThreshold: number;
}

// API endpoints types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GoogleOAuthProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}