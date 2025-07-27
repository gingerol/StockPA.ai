import React from 'react';
import { Box } from '@mui/material';

const Logo: React.FC = () => {
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'white',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
      }}
    />
  );
};

export default Logo;