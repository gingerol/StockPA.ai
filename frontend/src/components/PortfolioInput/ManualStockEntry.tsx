import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  InputAdornment,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';

interface StockEntry {
  ticker: string;
  quantity: number;
  purchasePrice?: number;
}

interface ManualStockEntryProps {
  onAddStock?: (stock: StockEntry) => void;
}

const ManualStockEntry: React.FC<ManualStockEntryProps> = ({ onAddStock }) => {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [error, setError] = useState('');

  const handleAddStock = () => {
    // Basic validation
    if (!ticker.trim()) {
      setError('Please enter a stock ticker');
      return;
    }
    
    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    // Clear error
    setError('');

    // Create stock entry
    const stock: StockEntry = {
      ticker: ticker.toUpperCase().trim(),
      quantity: Number(quantity),
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
    };

    // Call parent handler
    onAddStock?.(stock);

    // Reset form
    setTicker('');
    setQuantity('');
    setPurchasePrice('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddStock();
    }
  };

  return (
    <Box>
      <Typography 
        variant="subtitle2" 
        sx={{ 
          fontWeight: 600, 
          mb: 2,
          color: 'text.primary',
        }}
      >
        Add Stock Manually
      </Typography>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'flex-start',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}
      >
        <TextField
          placeholder="Ticker (e.g., GTCO)"
          size="small"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ 
            flex: { xs: '1 1 100%', md: '1 1 auto' },
            minWidth: 120,
          }}
          inputProps={{
            style: { textTransform: 'uppercase' },
          }}
        />
        
        <TextField
          placeholder="Quantity"
          size="small"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ 
            width: { xs: '48%', md: 120 },
          }}
          inputProps={{
            min: 1,
            step: 1,
          }}
        />
        
        <TextField
          placeholder="Purchase Price"
          size="small"
          type="number"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ 
            width: { xs: '48%', md: 160 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">₦</InputAdornment>
            ),
          }}
          inputProps={{
            min: 0,
            step: 0.01,
          }}
        />
        
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={handleAddStock}
          sx={{
            bgcolor: 'success.main',
            color: 'white',
            textTransform: 'none',
            px: 3,
            py: 1,
            fontWeight: 500,
            minWidth: { xs: '100%', md: 'auto' },
            '&:hover': {
              bgcolor: 'success.dark',
            },
          }}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
};

export default ManualStockEntry;