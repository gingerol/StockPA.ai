import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  People,
  EmojiEvents,
  Info,
} from '@mui/icons-material';

interface PeerComparisonData {
  userRank: number;
  totalUsers: number;
  percentileRank: number;
  averageReturn: number;
  averageAccuracy: number;
  topPerformerReturn: number;
  userPerformance: {
    averageReturn: number;
    accuracyRate: number;
    totalRecommendations: number;
  };
}

interface PeerComparisonWidgetProps {
  userId: string;
}

const PeerComparisonWidget: React.FC<PeerComparisonWidgetProps> = ({ userId }) => {
  const [data, setData] = useState<PeerComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeerComparisonData();
  }, [userId]);

  const fetchPeerComparisonData = async () => {
    try {
      const response = await fetch('/api/dashboard/peer-comparison', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching peer comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How You Compare
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
            How You Compare
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Peer comparison data will be available once you have some recommendation history.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getRankColor = (percentile: number) => {
    if (percentile >= 80) return 'success.main';
    if (percentile >= 60) return 'info.main';
    if (percentile >= 40) return 'warning.main';
    return 'error.main';
  };

  const getRankLabel = (percentile: number) => {
    if (percentile >= 90) return 'Top Performer';
    if (percentile >= 80) return 'Excellent';
    if (percentile >= 60) return 'Above Average';
    if (percentile >= 40) return 'Average';
    return 'Below Average';
  };

  const getMotivationalMessage = (percentile: number) => {
    if (percentile >= 90) return "🎉 You're crushing it! Keep up the excellent work!";
    if (percentile >= 80) return "🚀 Great performance! You're in the top 20%!";
    if (percentile >= 60) return "📈 You're doing well! Keep following recommendations!";
    if (percentile >= 40) return "💪 Room for improvement! Try following more recommendations.";
    return "🎯 Let's get you moving up the ranks! Follow more recommendations to improve.";
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            How You Compare
          </Typography>
          <Tooltip title="Anonymous comparison against other StockPA users">
            <IconButton size="small">
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Rank Display */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <EmojiEvents sx={{ color: getRankColor(data.percentileRank), mr: 1, fontSize: 28 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, color: getRankColor(data.percentileRank) }}>
              #{data.userRank}
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {data.percentileRank}th Percentile
          </Typography>
          
          <Chip
            label={getRankLabel(data.percentileRank)}
            color={data.percentileRank >= 60 ? 'success' : data.percentileRank >= 40 ? 'warning' : 'error'}
            sx={{ mb: 1 }}
          />
          
          <Typography variant="body2" color="text.secondary">
            Out of {data.totalUsers.toLocaleString()} Nigerian investors
          </Typography>
        </Box>

        {/* Performance Comparison */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Your Return
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  color: data.userPerformance.averageReturn >= 0 ? 'success.main' : 'error.main'
                }}
              >
                {data.userPerformance.averageReturn >= 0 ? '+' : ''}{data.userPerformance.averageReturn.toFixed(1)}%
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Average Return
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {data.averageReturn >= 0 ? '+' : ''}{data.averageReturn.toFixed(1)}%
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Your Position
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Top {(100 - data.percentileRank).toFixed(0)}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={data.percentileRank}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getRankColor(data.percentileRank),
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Detailed Comparison */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Your Accuracy
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {data.userPerformance.accuracyRate.toFixed(0)}%
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Platform Average
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {data.averageAccuracy.toFixed(0)}%
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Top Performer Insight */}
        <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TrendingUp sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.800' }}>
              Top 10% Performance
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Best performers average <strong>+{data.topPerformerReturn.toFixed(1)}%</strong> returns
          </Typography>
        </Box>

        {/* Motivational Message */}
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'primary.800' }}>
            {getMotivationalMessage(data.percentileRank)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PeerComparisonWidget;