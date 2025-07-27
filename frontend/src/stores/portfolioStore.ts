import { create } from 'zustand';
import { Portfolio, Stock, Recommendation, Alert } from '@/types';

interface PortfolioState {
  portfolio: Portfolio | null;
  recommendations: Recommendation[];
  alerts: Alert[];
  isLoading: boolean;
  isAnalyzing: boolean;
  lastUpdated: Date | null;

  // Actions
  setPortfolio: (portfolio: Portfolio) => void;
  updateStock: (stockId: string, updates: Partial<Stock>) => void;
  addStock: (stock: Stock) => void;
  removeStock: (stockId: string) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  markAlertAsRead: (alertId: string) => void;
  setLoading: (loading: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  clearPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolio: null,
  recommendations: [],
  alerts: [],
  isLoading: false,
  isAnalyzing: false,
  lastUpdated: null,

  setPortfolio: (portfolio: Portfolio) => {
    set({
      portfolio,
      lastUpdated: new Date(),
      isLoading: false,
    });
  },

  updateStock: (stockId: string, updates: Partial<Stock>) => {
    const currentPortfolio = get().portfolio;
    if (currentPortfolio) {
      const updatedStocks = currentPortfolio.stocks.map(stock =>
        stock.id === stockId ? { ...stock, ...updates } : stock
      );
      
      set({
        portfolio: {
          ...currentPortfolio,
          stocks: updatedStocks,
        },
      });
    }
  },

  addStock: (stock: Stock) => {
    const currentPortfolio = get().portfolio;
    if (currentPortfolio) {
      set({
        portfolio: {
          ...currentPortfolio,
          stocks: [...currentPortfolio.stocks, stock],
        },
      });
    }
  },

  removeStock: (stockId: string) => {
    const currentPortfolio = get().portfolio;
    if (currentPortfolio) {
      const filteredStocks = currentPortfolio.stocks.filter(
        stock => stock.id !== stockId
      );
      
      set({
        portfolio: {
          ...currentPortfolio,
          stocks: filteredStocks,
        },
      });
    }
  },

  setRecommendations: (recommendations: Recommendation[]) => {
    set({ recommendations });
  },

  setAlerts: (alerts: Alert[]) => {
    set({ alerts });
  },

  markAlertAsRead: (alertId: string) => {
    const currentAlerts = get().alerts;
    const updatedAlerts = currentAlerts.map(alert =>
      alert.id === alertId ? { ...alert, read: true } : alert
    );
    set({ alerts: updatedAlerts });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setAnalyzing: (analyzing: boolean) => {
    set({ isAnalyzing: analyzing });
  },

  clearPortfolio: () => {
    set({
      portfolio: null,
      recommendations: [],
      alerts: [],
      lastUpdated: null,
      isLoading: false,
      isAnalyzing: false,
    });
  },
}));