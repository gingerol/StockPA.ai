import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { APIResponse } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://stockpa.ai/api' 
    : 'http://localhost:8001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expired - attempt refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const tokens = useAuthStore.getState().tokens;
      if (tokens?.refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', {
            refreshToken: tokens.refreshToken,
          });
          
          const newTokens = response.data.data;
          useAuthStore.getState().login(
            useAuthStore.getState().user!,
            newTokens
          );
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API wrapper functions
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> =>
    api.get(url, config).then(res => res.data),
    
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> =>
    api.post(url, data, config).then(res => res.data),
    
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> =>
    api.put(url, data, config).then(res => res.data),
    
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> =>
    api.delete(url, config).then(res => res.data),
    
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> =>
    api.patch(url, data, config).then(res => res.data),
};

// Portfolio API functions
export const portfolioAPI = {
  // Save portfolio
  savePortfolio: (stocks: any[], portfolioName?: string) =>
    apiClient.post('/portfolios', { stocks, portfolioName }),
    
  // Get user portfolios
  getUserPortfolios: () =>
    apiClient.get('/portfolios'),
    
  // Analyze portfolio with AI
  analyzePortfolio: (portfolioId: string, analysisType: string = 'full') =>
    apiClient.post('/portfolios/analyze', { portfolioId, analysisType }),
    
  // Get analysis results
  getAnalysisResults: (portfolioId: string) =>
    apiClient.get(`/portfolios/${portfolioId}/analysis`),
    
  // Get analysis history
  getAnalysisHistory: () =>
    apiClient.get('/portfolios/history/analysis'),
};

// User API functions
export const userAPI = {
  // Get user performance
  getUserPerformance: () =>
    apiClient.get('/dashboard/performance'),
    
  // Get peer comparison
  getPeerComparison: () =>
    apiClient.get('/dashboard/peer-comparison'),
    
  // Track user action
  trackUserAction: (recommendationId: string, followed: boolean, actionPrice?: number) =>
    apiClient.post('/dashboard/track-action', { recommendationId, followed, actionPrice }),
};

export default api;