import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import { 
  TrendingUp,
  Psychology,
  Speed,
  Security,
  Analytics,
  NotificationsActive,
} from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuthStore } from '@/stores/authStore';

const LoginPage: React.FC = () => {
  const { login } = useAuthStore();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = 'http://localhost:8001/api/auth/google';
  };

  const getErrorMessage = (errorType: string) => {
    switch (errorType) {
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      case 'auth_cancelled':
        return 'Authentication was cancelled. Please try again.';
      case 'missing_tokens':
        return 'Authentication tokens were missing. Please try again.';
      case 'callback_failed':
        return 'Authentication callback failed. Please try again.';
      default:
        return 'An authentication error occurred. Please try again.';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: '3rem',
              fontWeight: 700,
              color: '#2c3e50',
              mb: 2,
            }}
          >
            StockPA.ai
          </Typography>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 400,
              color: '#34495e',
              mb: 3,
            }}
          >
            Your Personal Assistant for Smarter Investing
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.1rem',
              color: '#6c757d',
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Get precise, actionable investment recommendations for Nigerian stocks. 
            Your dedicated assistant analyzes market conditions, company fundamentals, 
            and your portfolio to deliver professional-grade investment insights.
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Alert 
              severity="error" 
              sx={{ maxWidth: 600, width: '100%' }}
            >
              {getErrorMessage(error)}
            </Alert>
          </Box>
        )}

        <Grid container spacing={4} mb={6}>
          {/* Main Login Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e9ecef',
              }}
            >
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  component="h3"
                  sx={{
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    mb: 3,
                    color: '#2c3e50',
                  }}
                >
                  Start Your Investment Journey
                </Typography>
                
                <Typography
                  variant="body1"
                  sx={{
                    mb: 4,
                    color: '#6c757d',
                    lineHeight: 1.6,
                  }}
                >
                  Join thousands of Nigerian investors who rely on StockPA for 
                  intelligent portfolio management. Get started in seconds with 
                  your Google account.
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
                  sx={{
                    py: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    bgcolor: '#2ecc71',
                    '&:hover': {
                      bgcolor: '#27ae60',
                    },
                  }}
                >
                  Get Started - Sign in with Google
                </Button>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 2,
                    color: '#6c757d',
                  }}
                >
                  Start Your Investment Journey
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Features Overview */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  mb: 3,
                  color: '#2c3e50',
                }}
              >
                What Your Personal Assistant Does
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper sx={{ p: 3, border: '1px solid #e9ecef' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUp sx={{ color: '#2ecc71', mr: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Precise Recommendations
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Get specific Buy/Hold/Sell decisions with exact price targets and confidence levels for every Nigerian stock in your portfolio.
                  </Typography>
                </Paper>

                <Paper sx={{ p: 3, border: '1px solid #e9ecef' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Psychology sx={{ color: '#3498db', mr: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Intelligent Analysis
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Advanced algorithms analyze company fundamentals, market conditions, and your risk profile for personalized insights.
                  </Typography>
                </Paper>

                <Paper sx={{ p: 3, border: '1px solid #e9ecef' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <NotificationsActive sx={{ color: '#e74c3c', mr: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Smart Alerts
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Never miss an opportunity. Get notified when your stocks hit target prices or when market conditions change.
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Value Proposition */}
        <Box 
          sx={{ 
            textAlign: 'center', 
            bgcolor: '#f8f9fa', 
            p: 4, 
            borderRadius: 2,
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontSize: '1.75rem',
              fontWeight: 600,
              mb: 3,
              color: '#2c3e50',
            }}
          >
            Why Nigerian Investors Choose StockPA
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Speed sx={{ fontSize: 48, color: '#2ecc71', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Save Time
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Hours of research condensed into instant, actionable recommendations
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Analytics sx={{ fontSize: 48, color: '#3498db', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Investment Intelligence
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Institutional-quality analysis accessible to individual investors
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Security sx={{ fontSize: 48, color: '#e74c3c', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Nigerian Focus
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Deep understanding of NGX dynamics, local market factors, and regulations
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Psychology sx={{ fontSize: 48, color: '#9b59b6', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Personalized
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Recommendations tailored to your portfolio, risk tolerance, and goals
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Social Proof */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="body1"
            sx={{
              color: '#6c757d',
              mb: 2,
            }}
          >
            Trusted by Nigerian investors to optimize their portfolios
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip label="NGX Specialists" variant="outlined" />
            <Chip label="Real-time Analysis" variant="outlined" />
            <Chip label="Secure & Private" variant="outlined" />
            <Chip label="Smart Insights" variant="outlined" />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;