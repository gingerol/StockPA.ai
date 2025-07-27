import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + error);
        return;
      }

      if (!token || !refreshToken) {
        console.error('Missing tokens in OAuth callback');
        navigate('/login?error=missing_tokens');
        return;
      }

      try {
        // Fetch user data using the access token
        const response = await fetch('http://localhost:8001/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();

        if (userData.success && userData.data) {
          const user = userData.data;
          const tokens = {
            accessToken: token,
            refreshToken: refreshToken,
            expiresIn: 24 * 60 * 60, // 24 hours
          };

          // Log the user in
          login(user, tokens);
          navigate('/dashboard');
        } else {
          throw new Error('Invalid user data response');
        }
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, login]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="h6" color="text.secondary">
        Completing sign in...
      </Typography>
    </Box>
  );
};

export default OAuthCallback;