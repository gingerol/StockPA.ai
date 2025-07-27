import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Tab,
  Tabs,
  Button,
  Alert,
} from '@mui/material';
import {
  Dashboard,
  ShowChart,
  Assessment,
  TrendingUp,
} from '@mui/icons-material';
import Header from '@/components/Header';
import PerformanceWidget from '@/components/Dashboard/PerformanceWidget';
import PeerComparisonWidget from '@/components/Dashboard/PeerComparisonWidget';
import PortfolioHealthWidget from '@/components/Dashboard/PortfolioHealthWidget';
import AdvancedPerformanceCharts from '@/components/Dashboard/AdvancedPerformanceCharts';
import { useAuthStore } from '@/stores/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user's active portfolio ID
    fetchActivePortfolio();
  }, []);

  const fetchActivePortfolio = async () => {
    try {
      const response = await fetch('/api/portfolios', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const portfolios = await response.json();
        const activePortfolio = portfolios.find((p: any) => p.isActive);
        if (activePortfolio) {
          setActivePortfolioId(activePortfolio.id);
        }
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!user) {
    return null;
  }

  const hasActivePortfolio = activePortfolioId !== null;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Welcome back, {user.name?.split(' ')[0] || 'Investor'}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's how your investments are performing with StockPA insights.
          </Typography>
        </Box>


        {/* Portfolio Required Alert */}
        {!hasActivePortfolio && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              📊 <strong>Get Started:</strong> Upload your portfolio to unlock powerful analytics and personalized insights!
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => window.location.href = '/'}
            >
              Upload Portfolio
            </Button>
          </Alert>
        )}

        {/* Dashboard Tabs */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                icon={<Dashboard />} 
                label="Overview" 
                id="dashboard-tab-0"
                aria-controls="dashboard-tabpanel-0"
              />
              <Tab 
                icon={<ShowChart />} 
                label="Performance" 
                id="dashboard-tab-1"
                aria-controls="dashboard-tabpanel-1"
              />
              <Tab 
                icon={<Assessment />} 
                label="Portfolio Health" 
                id="dashboard-tab-2"
                aria-controls="dashboard-tabpanel-2"
              />
              <Tab 
                icon={<TrendingUp />} 
                label="Peer Comparison" 
                id="dashboard-tab-3"
                aria-controls="dashboard-tabpanel-3"
              />
            </Tabs>
          </Box>

          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <CardContent>
              <Grid container spacing={3}>
                {/* Performance Summary */}
                <Grid item xs={12} md={6}>
                  <PerformanceWidget userId={user.id} />
                </Grid>

                {/* Peer Comparison Summary */}
                <Grid item xs={12} md={6}>
                  <PeerComparisonWidget userId={user.id} />
                </Grid>

                {/* Portfolio Health Summary */}
                {hasActivePortfolio && (
                  <Grid item xs={12}>
                    <PortfolioHealthWidget portfolioId={activePortfolioId} />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel value={activeTab} index={1}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PerformanceWidget userId={user.id} />
                </Grid>
                
                {/* Advanced Performance Charts with Real Data */}
                <Grid item xs={12}>
                  <AdvancedPerformanceCharts userId={user.id} />
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* Portfolio Health Tab */}
          <TabPanel value={activeTab} index={2}>
            <CardContent>
              {hasActivePortfolio ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <PortfolioHealthWidget portfolioId={activePortfolioId} />
                  </Grid>
                  
                  {/* Future: Add detailed allocation charts, sector breakdown, etc. */}
                  <Grid item xs={12}>
                    <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        📊 Detailed Portfolio Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Coming soon: Sector allocation charts, correlation analysis, and rebalancing suggestions.
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    📁 No Portfolio Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload your portfolio to see detailed health analysis and improvement recommendations.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => window.location.href = '/'}
                  >
                    Upload Portfolio
                  </Button>
                </Box>
              )}
            </CardContent>
          </TabPanel>

          {/* Peer Comparison Tab */}
          <TabPanel value={activeTab} index={3}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PeerComparisonWidget userId={user.id} />
                </Grid>
                
                {/* Future: Add detailed peer analysis, leaderboards, etc. */}
                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      🏆 Detailed Peer Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Coming soon: Leaderboards, peer portfolio comparisons, and community insights.
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>
        </Card>

      </Container>
    </Box>
  );
};

export default UserDashboardPage;