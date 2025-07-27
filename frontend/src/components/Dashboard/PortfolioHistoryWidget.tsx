import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  History,
  TrendingUp,
  TrendingDown,
  ShowChart,
  ExpandMore,
  ExpandLess,
  AutoAwesome,
  Schedule,
  Assessment,
} from '@mui/icons-material';
import { portfolioAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  totalValue: number;
  stocks: any[];
  recommendations?: Recommendation[];
}

interface Recommendation {
  id: string;
  ticker: string;
  action: string;
  confidence: string;
  targetPrice: number;
  potentialReturn: number;
  reasoning: string;
  createdAt: string;
}

interface AnalysisEvent {
  createdAt: string;
  eventData: {
    portfolioId: string;
    stockCount: number;
    successfulAnalyses: number;
    failedAnalyses?: number;
    analysisResults?: any[];
  };
}

const PortfolioHistoryWidget: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch portfolios and analysis history in parallel
      const [portfoliosResponse, historyResponse] = await Promise.all([
        portfolioAPI.getUserPortfolios(),
        portfolioAPI.getAnalysisHistory()
      ]);

      if (portfoliosResponse.success) {
        setPortfolios(portfoliosResponse.data);
      }

      if (historyResponse.success) {
        setAnalysisHistory(historyResponse.data.analysisHistory.filter(
          (event: any) => event.eventName === 'analysis_completed'
        ));
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setError('Failed to load portfolio history');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (portfolioId: string) => {
    setExpandedPortfolio(
      expandedPortfolio === portfolioId ? null : portfolioId
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'BUY':
        return 'success';
      case 'SELL':
        return 'error';
      case 'HOLD':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence.toUpperCase()) {
      case 'HIGH':
        return <TrendingUp color="success" />;
      case 'LOW':
        return <TrendingDown color="error" />;
      default:
        return <ShowChart color="warning" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading portfolio history...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={fetchPortfolioData}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <History sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Portfolio History & Analysis
          </Typography>
        </Box>

        {portfolios.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Portfolio History
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload your first portfolio to start tracking your investment journey.
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.href = '/'}
            >
              Upload Portfolio
            </Button>
          </Box>
        ) : (
          <Box>
            {/* Portfolio List */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Saved Portfolios ({portfolios.length})
            </Typography>
            
            <List sx={{ mb: 3 }}>
              {portfolios.map((portfolio) => (
                <React.Fragment key={portfolio.id}>
                  <ListItem
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <ListItemIcon>
                      <ShowChart color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {portfolio.name}
                          </Typography>
                          <Chip
                            label={`${portfolio.stocks.length} stocks`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(portfolio.createdAt)}
                          </Typography>
                          {portfolio.updatedAt !== portfolio.createdAt && (
                            <>
                              {' • '}
                              <Typography variant="caption" color="text.secondary">
                                Last analyzed: {formatDate(portfolio.updatedAt)}
                              </Typography>
                            </>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        ₦{Number(portfolio.totalValue).toLocaleString()}
                      </Typography>
                      <IconButton
                        onClick={() => handleToggleExpand(portfolio.id)}
                        size="small"
                      >
                        {expandedPortfolio === portfolio.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </ListItem>

                  <Collapse in={expandedPortfolio === portfolio.id}>
                    <Box sx={{ ml: 4, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {/* Stock Holdings */}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Holdings:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {portfolio.stocks.map((stock: any, index: number) => (
                          <Chip
                            key={index}
                            label={`${stock.ticker} (${stock.quantity.toLocaleString()})`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>

                      {/* Recent Recommendations */}
                      {portfolio.recommendations && portfolio.recommendations.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Recent AI Recommendations:
                          </Typography>
                          <List dense>
                            {portfolio.recommendations.slice(0, 3).map((rec) => (
                              <ListItem key={rec.id} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  {getConfidenceIcon(rec.confidence)}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {rec.ticker}
                                      </Typography>
                                      <Chip
                                        label={rec.action}
                                        size="small"
                                        color={getActionColor(rec.action) as any}
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                      <Typography variant="caption">
                                        Target: ₦{rec.targetPrice.toFixed(2)}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.secondary">
                                      {rec.reasoning.substring(0, 80)}...
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>

            <Divider sx={{ my: 3 }} />

            {/* Analysis History */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Analysis History ({analysisHistory.length})
            </Typography>

            {analysisHistory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <AutoAwesome sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No AI analysis completed yet. Upload a portfolio to get started.
                </Typography>
              </Box>
            ) : (
              <List dense>
                {analysisHistory.slice(0, 5).map((event, index) => (
                  <ListItem key={index} sx={{ py: 1 }}>
                    <ListItemIcon>
                      <Schedule color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            Analyzed {event.eventData.stockCount} stocks
                          </Typography>
                          <Chip
                            label={`${event.eventData.successfulAnalyses} successful`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          {event.eventData.failedAnalyses && event.eventData.failedAnalyses > 0 && (
                            <Chip
                              label={`${event.eventData.failedAnalyses} failed`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={formatDate(event.createdAt)}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<AutoAwesome />}
                onClick={() => window.location.href = '/'}
              >
                Analyze New Portfolio
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioHistoryWidget;