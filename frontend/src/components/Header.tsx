import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Chip,
} from '@mui/material';
import { 
  AccessTime, 
  Logout, 
  Dashboard, 
  Analytics, 
  AdminPanelSettings 
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
  };

  const isAdmin = user?.email === 'admin@stockpa.ai';
  const currentPath = location.pathname;

  // Format timestamp for "Last updated" - for now using static text matching screenshot
  const lastUpdated = "2 hours ago";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 } }}>
        {/* Logo Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Logo />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: '1.125rem', md: '1.25rem' },
            }}
          >
            StockPA.ai
          </Typography>
        </Box>

        {/* Navigation Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Dashboard Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Button
              variant={currentPath === '/dashboard' ? 'contained' : 'text'}
              size="small"
              startIcon={<Dashboard />}
              onClick={() => navigate('/dashboard')}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
                ...(currentPath === '/dashboard' && {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                })
              }}
            >
              Portfolio
            </Button>
            
            <Button
              variant={currentPath === '/analytics' ? 'contained' : 'text'}
              size="small"
              startIcon={<Analytics />}
              onClick={() => navigate('/analytics')}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
                ...(currentPath === '/analytics' && {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                })
              }}
            >
              Analytics
            </Button>
            
            {isAdmin && (
              <Button
                variant={currentPath === '/admin' ? 'contained' : 'text'}
                size="small"
                startIcon={<AdminPanelSettings />}
                onClick={() => navigate('/admin')}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  color: currentPath === '/admin' ? 'white' : 'error.main',
                  ...(currentPath === '/admin' && {
                    bgcolor: 'error.main',
                    '&:hover': { bgcolor: 'error.dark' }
                  })
                }}
              >
                Admin
              </Button>
            )}
          </Box>

          {/* Last Updated */}
          <Box 
            sx={{ 
              display: { xs: 'none', sm: 'flex' }, 
              alignItems: 'center', 
              gap: 1 
            }}
          >
            <AccessTime sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.875rem' }}
            >
              Last updated: {lastUpdated}
            </Typography>
          </Box>

          <Button
            variant="text"
            endIcon={<Logout sx={{ fontSize: 18 }} />}
            onClick={handleSignOut}
            sx={{
              color: 'text.primary',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              px: 2,
              py: 0.75,
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;