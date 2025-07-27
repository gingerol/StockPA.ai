import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  MoneyOff,
  Info,
} from '@mui/icons-material';

interface PerformanceData {
  performance: {
    totalRecommendations: number;
    followedCount: number;
    correctPredictions: number;
    incorrectPredictions: number;
    pendingPredictions: number;
    averageReturn: number;
    totalReturn: number;
    bestReturn: number;
    worstReturn: number;
    accuracyRate: number;
    buyAccuracy: number;
    sellAccuracy: number;
    holdAccuracy: number;
    missedOpportunities: number;
  };
  recentRecommendations: any[];
  missedOpportunities: {
    count: number;
    totalValue: number;
    recommendations: any[];
  };
}

interface PerformanceWidgetProps {
  userId: string;
}

const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ userId }) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [userId]);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/dashboard/performance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your StockPA Performance
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
            Your StockPA Performance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No performance data available yet. Start following recommendations to see your stats!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { performance, missedOpportunities } = data;
  const followRate = performance.totalRecommendations > 0 
    ? (performance.followedCount / performance.totalRecommendations) * 100 
    : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Your StockPA Performance
          </Typography>
          <Tooltip title="Your investment performance tracking based on StockPA recommendations">
            <IconButton size="small">
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={2}>
          {/* Total Recommendations */}
          <Grid item xs={6} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {performance.totalRecommendations}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Recommendations
              </Typography>
            </Box>
          </Grid>

          {/* Follow Rate */}
          <Grid item xs={6} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                {followRate.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Follow Rate
              </Typography>
            </Box>
          </Grid>

          {/* Accuracy Rate */}
          <Grid item xs={6} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600, 
                  color: performance.accuracyRate >= 70 ? 'success.main' : 
                         performance.accuracyRate >= 50 ? 'warning.main' : 'error.main'
                }}
              >
                {performance.accuracyRate.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accuracy Rate
              </Typography>
            </Box>
          </Grid>

          {/* Average Return */}
          <Grid item xs={6} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {performance.averageReturn >= 0 ? (
                  <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
                )}
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 600, 
                    color: performance.averageReturn >= 0 ? 'success.main' : 'error.main'
                  }}
                >
                  {performance.averageReturn >= 0 ? '+' : ''}{performance.averageReturn.toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Average Return
              </Typography>
            </Box>
          </Grid>

          {/* Best Return */}
          <Grid item xs={6} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                +{(performance.bestReturn || 0).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Best Return
              </Typography>
            </Box>
          </Grid>

          {/* Money Left on Table */}
          <Grid item xs={6} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoneyOff sx={{ color: 'warning.main', mr: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  ₦{Math.abs(performance.missedOpportunities).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Money Left on Table
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Action Accuracy Breakdown */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Accuracy by Action Type
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Chip
                label={`BUY: ${(performance.buyAccuracy || 0).toFixed(0)}%`}
                color="success"
                size="small"
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid item xs={4}>
              <Chip
                label={`SELL: ${(performance.sellAccuracy || 0).toFixed(0)}%`}
                color="error"
                size="small"
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid item xs={4}>
              <Chip
                label={`HOLD: ${(performance.holdAccuracy || 0).toFixed(0)}%`}
                color="default"
                size="small"
                sx={{ width: '100%' }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Correct
              </Typography>
              <Typography variant="h6" color="success.main">
                {performance.correctPredictions}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Incorrect
              </Typography>
              <Typography variant="h6" color="error.main">
                {performance.incorrectPredictions}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
              <Typography variant="h6" color="warning.main">
                {performance.pendingPredictions}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Missed Opportunities Alert */}
        {missedOpportunities.count > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.800' }}>
              💡 You missed {missedOpportunities.count} profitable opportunities worth ₦{missedOpportunities.totalValue.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Consider following more recommendations to maximize your returns!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceWidget;