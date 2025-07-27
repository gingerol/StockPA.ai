import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import AlertCard from './AlertCard';

// Mock data - in production this would come from the portfolio store
const mockAlerts = [
  {
    id: '1',
    message: '₦850K idle in NB',
    description: 'Consider rebalancing',
    type: 'warning' as const,
  },
  {
    id: '2', 
    message: '₦90,000 profit unrealized in GTCO',
    description: 'Strong performance',
    type: 'success' as const,
  },
];

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
          mb: 3,
          fontSize: '1rem',
          lineHeight: 1.5,
        }}
      >
        Upload your Nigerian stocks and get AI-powered Buy/Hold/Sell recommendations
      </Typography>

      <Grid container spacing={2}>
        {mockAlerts.map((alert) => (
          <Grid item xs={12} md={6} key={alert.id}>
            <AlertCard
              message={alert.message}
              description={alert.description}
              type={alert.type}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default WelcomeSection;