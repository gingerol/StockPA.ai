import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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
  recentRecommendations: Array<{
    id: string;
    ticker: string;
    action: string;
    confidence: string;
    recommendedAt: string;
    wasFollowed: boolean;
    actualReturn: number | null;
    missedReturn: number | null;
    accuracy: string;
  }>;
}

interface AdvancedPerformanceChartsProps {
  userId: string;
}

const AdvancedPerformanceCharts: React.FC<AdvancedPerformanceChartsProps> = ({ userId }) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [userId, timeframe]);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch(`/api/dashboard/performance?timeframe=${timeframe}`, {
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
            📈 Advanced Performance Charts
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.recentRecommendations.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📈 Advanced Performance Charts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No recommendation data available yet. Start following recommendations to see your performance charts!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Process data for charts
  const timelineData = data.recentRecommendations
    .sort((a, b) => new Date(a.recommendedAt).getTime() - new Date(b.recommendedAt).getTime())
    .map((rec, index) => ({
      date: new Date(rec.recommendedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cumulativeReturn: data.recentRecommendations
        .slice(0, index + 1)
        .filter(r => r.wasFollowed && r.actualReturn !== null)
        .reduce((sum, r) => sum + (r.actualReturn || 0), 0),
      recommendation: rec.ticker,
      return: rec.actualReturn || 0,
      followed: rec.wasFollowed,
    }));

  const actionPerformanceData = [
    {
      action: 'BUY',
      accuracy: data.performance.buyAccuracy || 0,
      count: data.recentRecommendations.filter(r => r.action === 'BUY').length,
      color: '#4caf50',
    },
    {
      action: 'SELL', 
      accuracy: data.performance.sellAccuracy || 0,
      count: data.recentRecommendations.filter(r => r.action === 'SELL').length,
      color: '#f44336',
    },
    {
      action: 'HOLD',
      accuracy: data.performance.holdAccuracy || 0,
      count: data.recentRecommendations.filter(r => r.action === 'HOLD').length,
      color: '#ff9800',
    },
  ];

  const followVsIgnoreData = [
    {
      name: 'Followed',
      value: data.performance.followedCount,
      color: '#4caf50',
    },
    {
      name: 'Ignored',
      value: data.performance.totalRecommendations - data.performance.followedCount,
      color: '#f44336',
    },
  ];

  const accuracyOverTimeData = data.recentRecommendations
    .filter(r => r.accuracy !== 'PENDING')
    .map((rec, index, arr) => {
      const upToThis = arr.slice(0, index + 1);
      const correct = upToThis.filter(r => r.accuracy === 'CORRECT').length;
      const total = upToThis.length;
      return {
        date: new Date(rec.recommendedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        accuracy: total > 0 ? (correct / total) * 100 : 0,
        ticker: rec.ticker,
      };
    });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            📈 Advanced Performance Charts
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              label="Timeframe"
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
              <MenuItem value="90d">90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {/* Cumulative Returns Timeline */}
          <Grid item xs={12} lg={8}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Cumulative Returns Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cumulative Return']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeReturn" 
                    stroke="#2196f3" 
                    strokeWidth={2}
                    dot={{ fill: '#2196f3', strokeWidth: 2, r: 4 }}
                    name="Cumulative Return (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Follow vs Ignore Pie Chart */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Recommendation Follow Rate
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={followVsIgnoreData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {followVsIgnoreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Action Type Performance */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Performance by Action Type
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={actionPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="action" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => 
                      name === 'accuracy' ? [`${value.toFixed(1)}%`, 'Accuracy'] : [value, 'Count']
                    }
                  />
                  <Legend />
                  <Bar dataKey="accuracy" fill="#4caf50" name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Accuracy Trend Over Time */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Accuracy Trend Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={accuracyOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#ff9800" 
                    strokeWidth={2}
                    dot={{ fill: '#ff9800', strokeWidth: 2, r: 3 }}
                    name="Running Accuracy (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Recent Recommendations Table */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Recent Recommendations Timeline
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {data.recentRecommendations.slice(0, 10).map((rec, index) => (
                  <Box 
                    key={rec.id} 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 2, 
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: rec.wasFollowed ? 'success.50' : 'grey.50',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {rec.ticker} - {rec.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rec.recommendedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: rec.wasFollowed ? 
                            (rec.actualReturn && rec.actualReturn > 0 ? 'success.main' : 'error.main') :
                            'text.secondary'
                        }}
                      >
                        {rec.wasFollowed ? 
                          (rec.actualReturn !== null ? `${rec.actualReturn > 0 ? '+' : ''}${rec.actualReturn.toFixed(2)}%` : 'Pending') :
                          'Not Followed'
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rec.confidence} confidence
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AdvancedPerformanceCharts;