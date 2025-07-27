import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Alert,
  Button,
} from '@mui/material';
import {
  AdminPanelSettings,
  Dashboard,
  People,
  TrendingUp,
  MonetizationOn,
  HealthAndSafety,
} from '@mui/icons-material';
import Header from '@/components/Header';
import PlatformOverviewWidget from '@/components/Admin/PlatformOverviewWidget';
import ValuationDashboard from '@/components/ValuationDashboard';
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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
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

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Check if user is admin (you may want to implement proper admin role checking)
  const isAdmin = user?.email === 'admin@stockpa.ai';

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body2">
              You don't have permission to access the admin dashboard.
            </Typography>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Admin Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AdminPanelSettings sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              StockPA Admin Dashboard
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Monitor platform performance, user analytics, and business metrics.
          </Typography>
        </Box>

        {/* Admin Navigation Tabs */}
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
                label="Platform Overview" 
                id="admin-tab-0"
                aria-controls="admin-tabpanel-0"
              />
              <Tab 
                icon={<People />} 
                label="User Analytics" 
                id="admin-tab-1"
                aria-controls="admin-tabpanel-1"
              />
              <Tab 
                icon={<TrendingUp />} 
                label="Recommendations" 
                id="admin-tab-2"
                aria-controls="admin-tabpanel-2"
              />
              <Tab 
                icon={<MonetizationOn />} 
                label="Financial" 
                id="admin-tab-3"
                aria-controls="admin-tabpanel-3"
              />
              <Tab 
                icon={<HealthAndSafety />} 
                label="System Health" 
                id="admin-tab-4"
                aria-controls="admin-tabpanel-4"
              />
              <Tab 
                icon={<TrendingUp />} 
                label="$25M Valuation" 
                id="admin-tab-5"
                aria-controls="admin-tabpanel-5"
                sx={{ 
                  bgcolor: 'success.light',
                  '&.Mui-selected': {
                    bgcolor: 'success.main',
                    color: 'white',
                  }
                }}
              />
            </Tabs>
          </Box>

          {/* Platform Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PlatformOverviewWidget />
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* User Analytics Tab */}
          <TabPanel value={activeTab} index={1}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <People sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      📊 User Growth Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Coming soon: User registration trends, cohort analysis, retention metrics, and geographic distribution.
                    </Typography>
                    <Button variant="outlined" disabled>
                      View User Analytics
                    </Button>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* Recommendations Tab */}
          <TabPanel value={activeTab} index={2}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <TrendingUp sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      🎯 Recommendation Performance
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Coming soon: AI accuracy trends, most successful recommendations, user follow rates, and improvement suggestions.
                    </Typography>
                    <Button variant="outlined" disabled>
                      View Recommendation Analytics
                    </Button>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* Financial Tab */}
          <TabPanel value={activeTab} index={3}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <MonetizationOn sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      💰 Revenue & Financial Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Coming soon: Revenue tracking, subscription metrics, conversion funnels, and financial forecasting.
                    </Typography>
                    <Button variant="outlined" disabled>
                      View Financial Analytics
                    </Button>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* System Health Tab */}
          <TabPanel value={activeTab} index={4}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <HealthAndSafety sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      🔧 System Health & Performance
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Coming soon: Server performance, database health, API response times, and error monitoring.
                    </Typography>
                    <Button variant="outlined" disabled>
                      View System Health
                    </Button>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* $25M Valuation Tab */}
          <TabPanel value={activeTab} index={5}>
            <CardContent>
              <ValuationDashboard />
            </CardContent>
          </TabPanel>
        </Card>

        {/* Quick Actions */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  🚀 Platform Actions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Quick administrative actions
                </Typography>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Broadcast Message
                </Button>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  System Maintenance
                </Button>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  📈 Business Intelligence
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Advanced analytics and insights
                </Typography>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Export Data
                </Button>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Custom Query
                </Button>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Prediction Model
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  ⚙️ System Control
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  System configuration and control
                </Typography>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Cron Jobs
                </Button>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  Database Tools
                </Button>
                <Button variant="outlined" size="small" sx={{ m: 0.5 }} disabled>
                  API Monitor
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Admin Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            StockPA.ai Admin Dashboard • {new Date().getFullYear()} • Built with ❤️ for Nigerian investors
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminDashboardPage;