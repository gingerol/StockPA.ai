import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { AccessTime, Logout } from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import Logo from './Logo';

const Header: React.FC = () => {
  const { logout } = useAuthStore();

  const handleSignOut = () => {
    logout();
  };

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

        {/* Right Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
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