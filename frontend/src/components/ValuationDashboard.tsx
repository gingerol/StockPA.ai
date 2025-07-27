import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
} from '@mui/material';
import {
  People,
  Analytics,
  AttachMoney,
  CheckCircle,
  RadioButtonUnchecked,
  Speed,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

const ValuationDashboard: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['valuation-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/valuation/metrics');
      return response.data.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !metrics) {
    return <Box>Loading valuation metrics...</Box>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const milestones = [
    { 
      label: 'User Base (100K target)', 
      current: metrics.userMetrics.totalUsers,
      target: 100000,
      completed: metrics.userMetrics.totalUsers >= 100000 
    },
    { 
      label: 'Monthly Active Users (70K)', 
      current: metrics.userMetrics.monthlyActiveUsers,
      target: 70000,
      completed: metrics.userMetrics.monthlyActiveUsers >= 70000 
    },
    { 
      label: 'Engagement Rate (70%)', 
      current: metrics.userMetrics.engagementRate,
      target: 70,
      completed: metrics.userMetrics.engagementRate >= 70,
      suffix: '%'
    },
    { 
      label: 'AI Accuracy (80%)', 
      current: metrics.aiPerformance.accuracy,
      target: 80,
      completed: metrics.aiPerformance.accuracy >= 80,
      suffix: '%'
    },
    { 
      label: 'Data Points (1M)', 
      current: metrics.dataAsset.totalRecommendations,
      target: 1000000,
      completed: metrics.dataAsset.totalRecommendations >= 1000000 
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        $25M Valuation Dashboard
      </Typography>

      {/* Progress to Target */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Progress to $25M Valuation
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={metrics.valuationIndicators.progressToTarget} 
              sx={{ 
                flexGrow: 1, 
                height: 20, 
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white',
                }
              }}
            />
            <Typography variant="h5" sx={{ ml: 2, color: 'white', fontWeight: 700 }}>
              {metrics.valuationIndicators.progressToTarget}%
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: 'white', opacity: 0.9 }}>
            Current Estimated Valuation: {formatCurrency(metrics.valuationIndicators.estimatedValuation)}
          </Typography>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People sx={{ color: '#3498db', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Users
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics.userMetrics.totalUsers.toLocaleString()}
              </Typography>
              <Chip 
                label={`${metrics.keyMilestones.currentProgress}% to 100K`}
                size="small" 
                sx={{ mt: 1 }}
                color={metrics.keyMilestones.currentProgress >= 100 ? 'success' : 'default'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ color: '#e74c3c', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Engagement Rate
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics.userMetrics.engagementRate}%
              </Typography>
              <Chip 
                label={`Target: 70%`}
                size="small" 
                sx={{ mt: 1 }}
                color={metrics.userMetrics.engagementRate >= 70 ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Analytics sx={{ color: '#9b59b6', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  AI Accuracy
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics.aiPerformance.accuracy}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.aiPerformance.correctPredictions} correct / {metrics.aiPerformance.totalPredictions} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: '#2ecc71', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  B2B Revenue Potential
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(metrics.valuationIndicators.potentialB2BRevenue)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Annual recurring revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Milestones */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Key Milestones for $25M Valuation
            </Typography>
            <List>
              {milestones.map((milestone, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {milestone.completed ? (
                      <CheckCircle sx={{ color: '#2ecc71' }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ color: '#95a5a6' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={milestone.label}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (milestone.current / milestone.target) * 100)}
                          sx={{ flexGrow: 1, mr: 2, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {milestone.current.toLocaleString()}{milestone.suffix || ''} / {milestone.target.toLocaleString()}{milestone.suffix || ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Growth & Virality Metrics
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  User Growth Rate
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {metrics.growthMetrics.userGrowthRate}% MoM
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Viral Coefficient
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {metrics.growthMetrics.viralCoefficient}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Each user brings {metrics.growthMetrics.viralCoefficient} new users
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Weekly Retention
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {metrics.userMetrics.weeklyRetention}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Data Asset Value */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Data Asset Value
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Unique Nigerian Stocks Analyzed
              </Typography>
              <Typography variant="h5">{metrics.dataAsset.uniqueStocksAnalyzed}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Recommendations
              </Typography>
              <Typography variant="h5">{metrics.dataAsset.totalRecommendations.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Data Asset Valuation
              </Typography>
              <Typography variant="h5">{formatCurrency(metrics.valuationIndicators.dataAssetValue)}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ValuationDashboard;