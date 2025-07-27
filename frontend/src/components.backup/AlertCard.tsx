import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { TrendingUp, Info } from '@mui/icons-material';

interface AlertCardProps {
  message: string;
  type: 'warning' | 'success' | 'info';
  amount?: string;
  description?: string;
}

const AlertCard: React.FC<AlertCardProps> = ({ 
  message, 
  type, 
  amount, 
  description 
}) => {
  const getColorConfig = () => {
    switch (type) {
      case 'warning':
        return {
          bgcolor: '#fff3cd',
          borderColor: '#ffeaa7',
          textColor: '#856404',
          icon: Info,
          iconColor: '#f39c12',
        };
      case 'success':
        return {
          bgcolor: '#d4f6dc',
          borderColor: '#b3e5c2',
          textColor: '#155724',
          icon: TrendingUp,
          iconColor: '#2ecc71',
        };
      default:
        return {
          bgcolor: '#e3f2fd',
          borderColor: '#bbdefb',
          textColor: '#0d47a1',
          icon: Info,
          iconColor: '#1976d2',
        };
    }
  };

  const config = getColorConfig();
  const IconComponent = config.icon;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        bgcolor: config.bgcolor,
        border: 1,
        borderColor: config.borderColor,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
      }}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 40,
          height: 40,
        }}
      >
        <IconComponent sx={{ color: config.iconColor, fontSize: 20 }} />
      </Box>

      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: config.textColor,
            lineHeight: 1.4,
            mb: description ? 0.5 : 0,
          }}
        >
          {message}
        </Typography>
        
        {description && (
          <Typography
            variant="body2"
            sx={{
              color: config.textColor,
              opacity: 0.8,
              lineHeight: 1.4,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default AlertCard;