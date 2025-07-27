import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tooltip,
  IconButton,
  Grid,
} from '@mui/material';
import {
  HealthAndSafety,
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  PieChart,
  WaterDrop,
  Info,
} from '@mui/icons-material';

interface PortfolioHealthData {
  healthScore: number;
  metrics: {
    concentrationRisk: number;
    sectorDiversity: number;
    liquidityScore: number;
    totalStocks: number;
    topHoldings: Array<{
      ticker: string;
      percentage: number;
    }>;
  };
  recommendations: string[];
}

interface PortfolioHealthWidgetProps {
  portfolioId: string;
}

const PortfolioHealthWidget: React.FC<PortfolioHealthWidgetProps> = ({ portfolioId }) => {
  const [data, setData] = useState<PortfolioHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolioHealth();
    }
  }, [portfolioId]);

  const fetchPortfolioHealth = async () => {
    try {
      const response = await fetch(`/api/dashboard/portfolio-health/${portfolioId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching portfolio health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle />;
    if (score >= 60) return <Warning />;
    return <Error />;
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent Health';
    if (score >= 60) return 'Good Health';
    if (score >= 40) return 'Fair Health';
    return 'Needs Attention';
  };

  const getRiskLabel = (risk: number) => {
    if (risk <= 30) return 'Low Risk';
    if (risk <= 60) return 'Moderate Risk';
    return 'High Risk';
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 30) return 'success.main';
    if (risk <= 60) return 'warning.main';
    return 'error.main';
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Portfolio Health Score
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Portfolio Health Score
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a portfolio to see your health score and recommendations.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Portfolio Health Score
          </Typography>
          <Tooltip title="Analysis of your portfolio's risk, diversification, and overall health">
            <IconButton size="small">
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Health Score Display */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
            <CircularProgress
              variant="determinate"
              value={data.healthScore}
              size={80}
              thickness={6}
              sx={{
                color: theme => 
                  data.healthScore >= 80 ? theme.palette.success.main :
                  data.healthScore >= 60 ? theme.palette.warning.main :
                  theme.palette.error.main
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                {data.healthScore}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            {React.cloneElement(getHealthIcon(data.healthScore), {
              sx: { 
                color: theme => 
                  data.healthScore >= 80 ? theme.palette.success.main :
                  data.healthScore >= 60 ? theme.palette.warning.main :
                  theme.palette.error.main,
                mr: 1
              }
            })}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {getHealthLabel(data.healthScore)}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {data.metrics.totalStocks} stocks in portfolio
          </Typography>
        </Box>

        {/* Metrics Breakdown */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Concentration Risk */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PieChart sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Concentration Risk
                  </Typography>
                </Box>
                <Chip
                  label={getRiskLabel(data.metrics.concentrationRisk)}
                  size="small"
                  sx={{ 
                    bgcolor: getRiskColor(data.metrics.concentrationRisk) + '20',
                    color: getRiskColor(data.metrics.concentrationRisk),
                  }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(data.metrics.concentrationRisk, 100)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getRiskColor(data.metrics.concentrationRisk),
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Top 3 holdings: {data.metrics.concentrationRisk.toFixed(0)}% of portfolio
              </Typography>
            </Box>
          </Grid>

          {/* Sector Diversity */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ color: 'info.main', fontSize: 24, mb: 0.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                {data.metrics.sectorDiversity.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sector Diversity
              </Typography>
            </Box>
          </Grid>

          {/* Liquidity Score */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <WaterDrop sx={{ color: 'primary.main', fontSize: 24, mb: 0.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {data.metrics.liquidityScore.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Liquidity Score
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Top Holdings */}
        {data.metrics.topHoldings.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Top Holdings
            </Typography>
            {data.metrics.topHoldings.map((holding, index) => (
              <Box key={holding.ticker} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {index + 1}. {holding.ticker}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {holding.percentage.toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Improvement Recommendations
            </Typography>
            <List dense sx={{ p: 0 }}>
              {data.recommendations.map((recommendation, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.secondary">
                        {recommendation}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Health Summary */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
            {data.healthScore >= 80 
              ? "🎉 Your portfolio is well-diversified and healthy!"
              : data.healthScore >= 60
              ? "👍 Good portfolio structure with room for improvement."
              : "⚠️ Consider rebalancing to reduce risk and improve returns."
            }
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PortfolioHealthWidget;