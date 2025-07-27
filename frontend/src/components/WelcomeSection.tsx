import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import AlertCard from './AlertCard';

// This will be populated from real portfolio data
const alerts: Array<{
  id: string;
  message: string;
  description: string;
  type: 'warning' | 'success' | 'error';
}> = [];

const WelcomeSection: React.FC = () => {
  const { user } = useAuthStore();
  
  // Get user name from auth store, fallback to Eugene for demo
  const userName = user?.name?.split(' ')[0] || 'Eugene';

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '1.75rem', md: '2rem' },
          fontWeight: 600,
          color: 'text.primary',
          mb: 1,
          lineHeight: 1.2,
        }}
      >
        Hi {userName}, let's optimize your portfolio.
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
          mb: 2,
          fontSize: '1.1rem',
          lineHeight: 1.6,
        }}
      >
        Your assistant has analyzed current market conditions and is ready to provide personalized recommendations for your Nigerian stock portfolio. 
        Share your holdings below to get precise Buy/Hold/Sell decisions with confidence levels and target prices.
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 3,
          fontSize: '0.95rem',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        🎯 <strong>Professional Insights:</strong> Each recommendation includes detailed analysis of company fundamentals, 
        market trends, and risk factors - the same quality research that institutional investors rely on.
      </Typography>

      {alerts.length > 0 && (
        <Grid container spacing={2}>
          {alerts.map((alert) => (
            <Grid item xs={12} md={6} key={alert.id}>
              <AlertCard
                message={alert.message}
                description={alert.description}
                type={alert.type}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default WelcomeSection;