import { createTheme } from '@mui/material/styles';

// StockPA.ai production theme matching screenshot design
export const stockPATheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2ecc71', // Green for Buy actions and CTAs
      light: '#58d68d',
      dark: '#27ae60',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e74c3c', // Red for Sell actions
      light: '#ec7063',
      dark: '#c0392b',
      contrastText: '#ffffff',
    },
    error: {
      main: '#e74c3c',
    },
    warning: {
      main: '#f39c12',
    },
    info: {
      main: '#3498db',
    },
    success: {
      main: '#2ecc71',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#34495e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    body1: {
      fontSize: '1rem',
      color: '#2c3e50',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#34495e',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f0f0f0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#fafafa',
            borderBottom: '2px solid #e0e0e0',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#2c3e50',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

// Action-specific colors for chips and badges
export const actionColors = {
  BUY: {
    main: '#2ecc71',
    light: '#d5f4e6',
    dark: '#27ae60',
  },
  SELL: {
    main: '#e74c3c',
    light: '#fdeaea',
    dark: '#c0392b',
  },
  HOLD: {
    main: '#95a5a6',
    light: '#ecf0f1',
    dark: '#7f8c8d',
  },
};

// Confidence level colors
export const confidenceColors = {
  High: '#2ecc71',
  Medium: '#f39c12',
  Low: '#e74c3c',
};