import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  People,
  TrendingUp,
  Assessment,
  AccountBalance,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

interface PlatformStats {
  users: {
    total: number;
    active: number;
    new: number;
    paid: number;
    trial: number;
    conversionRate: number;
  };
  recommendations: {
    total: number;
    recent: number;
    avgAccuracy: number;
  };
  portfolios: {
    total: number;
    active: number;
  };
  engagement: {
    activeUserRate: number;
    portfolioUploadRate: number;
  };
}

const PlatformOverviewWidget: React.FC = () => {
  const [data, setData] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Platform Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unable to load platform statistics.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (rate: number) => {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Assessment sx={{ mr: 1 }} />
          Platform Overview
        </Typography>

        <Grid container spacing={3}>
          {/* User Metrics */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                <People sx={{ mr: 1, color: 'primary.main' }} />
                User Metrics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {data.users.total.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {data.users.active.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active (30d)
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {data.users.new.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      New (30d)
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {data.users.paid.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paid Users
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Conversion & Engagement */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                Conversion & Engagement
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Conversion Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {data.users.conversionRate.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(data.users.conversionRate, 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: data.users.conversionRate >= 5 ? 'success.main' : 
                                     data.users.conversionRate >= 2 ? 'warning.main' : 'error.main',
                    },
                  }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Active User Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {data.engagement.activeUserRate.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(data.engagement.activeUserRate, 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: data.engagement.activeUserRate >= 60 ? 'success.main' : 
                                     data.engagement.activeUserRate >= 30 ? 'warning.main' : 'error.main',
                    },
                  }}
                />
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Portfolio Upload Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {data.engagement.portfolioUploadRate.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(data.engagement.portfolioUploadRate, 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: data.engagement.portfolioUploadRate >= 70 ? 'success.main' : 
                                     data.engagement.portfolioUploadRate >= 40 ? 'warning.main' : 'error.main',
                    },
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Recommendation Stats */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                <AccountBalance sx={{ mr: 1, color: 'warning.main' }} />
                Recommendations
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {data.recommendations.total.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                      {data.recommendations.recent.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent (30d)
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {data.recommendations.avgAccuracy.toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Health Indicators */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Health Indicators
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={data.users.conversionRate >= 3 ? <CheckCircle /> : <Warning />}
                  label={`Conversion: ${data.users.conversionRate.toFixed(1)}%`}
                  color={getHealthColor(data.users.conversionRate * 20)}
                  size="small"
                />
                
                <Chip
                  icon={data.engagement.activeUserRate >= 50 ? <CheckCircle /> : <Warning />}
                  label={`Engagement: ${data.engagement.activeUserRate.toFixed(0)}%`}
                  color={getHealthColor(data.engagement.activeUserRate)}
                  size="small"
                />
                
                <Chip
                  icon={data.recommendations.avgAccuracy >= 70 ? <CheckCircle /> : <Warning />}
                  label={`AI Accuracy: ${data.recommendations.avgAccuracy.toFixed(0)}%`}
                  color={getHealthColor(data.recommendations.avgAccuracy)}
                  size="small"
                />
                
                <Chip
                  icon={data.portfolios.active >= data.portfolios.total * 0.8 ? <CheckCircle /> : <Warning />}
                  label={`Active Portfolios: ${data.portfolios.active}/${data.portfolios.total}`}
                  color={data.portfolios.total > 0 && (data.portfolios.active / data.portfolios.total) >= 0.8 ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Quick Summary */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600 }}>
            📊 Platform Summary: {data.users.total} users • {data.users.paid} paid • {data.recommendations.total} recommendations • {data.recommendations.avgAccuracy.toFixed(0)}% accuracy
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PlatformOverviewWidget;