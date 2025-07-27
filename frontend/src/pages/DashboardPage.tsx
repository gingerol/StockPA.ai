import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
} from '@mui/material';
import Header from '@/components/Header';
import WelcomeSection from '@/components/WelcomeSection';
import PortfolioInput from '@/components/PortfolioInput/PortfolioInput';
import Recommendations from '@/components/Recommendations/Recommendations';
import PortfolioHistoryWidget from '@/components/Dashboard/PortfolioHistoryWidget';
import { useAuthStore } from '@/stores/authStore';
import { useEngagementTracking } from '@/hooks/useEngagementTracking';

interface StockEntry {
  ticker: string;
  quantity: number;
  purchasePrice?: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { trackPortfolioAction, trackFeatureUsage } = useEngagementTracking();
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [portfolioStocks, setPortfolioStocks] = useState<StockEntry[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const handleGetRecommendations = async (stocks: StockEntry[], portfolioId?: string) => {
    setPortfolioStocks(stocks);
    setIsLoadingRecommendations(true);
    
    // Track engagement for valuation
    trackPortfolioAction('analyze_portfolio', stocks.length);
    trackFeatureUsage('ai_recommendations');
    
    // No longer simulating - the PortfolioInput component handles real API calls
    setShowRecommendations(true);
    setIsLoadingRecommendations(false);
  };

  const handleAnalysisComplete = (results: any) => {
    console.log('📊 Analysis results received:', results);
    setAnalysisResults(results);
    setShowRecommendations(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <WelcomeSection />
        
        <Grid container spacing={3}>
          {/* Main Portfolio Input */}
          <Grid item xs={12} lg={8}>
            <PortfolioInput 
              onGetRecommendations={handleGetRecommendations}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* Show recommendations/analysis results */}
            {(showRecommendations || analysisResults) && (
              <Recommendations
                data={analysisResults || portfolioStocks}
                isLoading={isLoadingRecommendations}
              />
            )}
          </Grid>

          {/* Portfolio History Sidebar - Only show for logged in users */}
          {user && (
            <Grid item xs={12} lg={4}>
              <PortfolioHistoryWidget />
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default DashboardPage;