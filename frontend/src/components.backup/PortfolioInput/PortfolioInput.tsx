import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Divider,
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import FileUpload from './FileUpload';
import ManualStockEntry from './ManualStockEntry';

interface StockEntry {
  ticker: string;
  quantity: number;
  purchasePrice?: number;
}

interface PortfolioInputProps {
  onGetRecommendations?: (stocks: StockEntry[]) => void;
}

const PortfolioInput: React.FC<PortfolioInputProps> = ({ onGetRecommendations }) => {
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name);
  };

  const handleFileUpload = (uploadedStocks: StockEntry[]) => {
    try {
      console.log('CSV uploaded, stocks parsed:', uploadedStocks);
      if (uploadedStocks && uploadedStocks.length > 0) {
        setStocks(uploadedStocks);
        console.log(`Successfully added ${uploadedStocks.length} stocks from CSV`);
      } else {
        console.warn('No valid stocks found in CSV');
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
    }
  };

  const handleAddStock = (stock: StockEntry) => {
    setStocks(prev => [...prev, stock]);
    console.log('Stock added:', stock);
  };

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    console.log('Getting recommendations for stocks:', stocks);
    
    if (onGetRecommendations) {
      onGetRecommendations(stocks);
    }
    
    // Reset loading state after a brief moment
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const hasStocks = stocks.length > 0;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        mb: 4, 
        border: 1, 
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h2" 
          sx={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            mb: 1,
            color: 'text.primary',
          }}
        >
          Portfolio Input
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          Add your Nigerian stocks manually or upload a CSV file
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <FileUpload 
          onFileSelect={handleFileSelect} 
          onFileUpload={handleFileUpload}
        />
      </Box>

      <Divider sx={{ my: 3 }}>
        <Typography variant="body2" color="text.secondary">
          OR
        </Typography>
      </Divider>

      <Box sx={{ mb: 4 }}>
        <ManualStockEntry onAddStock={handleAddStock} />
      </Box>

      {hasStocks && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Added Stocks ({stocks.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {stocks.map((stock, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: 'grey.50',
                  fontSize: '0.875rem',
                }}
              >
                <Typography variant="body2">
                  <strong>{stock.ticker}</strong> ({stock.quantity.toLocaleString()})
                  {stock.purchasePrice && ` @ ₦${stock.purchasePrice}`}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={<AutoAwesome />}
        onClick={handleGetRecommendations}
        disabled={!hasStocks || isLoading}
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          borderRadius: 2,
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          '&:disabled': {
            bgcolor: 'grey.300',
            color: 'grey.500',
          },
        }}
      >
        {isLoading ? 'Analyzing Portfolio...' : 'Get AI Recommendations'}
      </Button>
    </Paper>
  );
};

export default PortfolioInput;