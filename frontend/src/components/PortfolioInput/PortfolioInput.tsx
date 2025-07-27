import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { AutoAwesome, CheckCircle } from '@mui/icons-material';
import FileUpload from './FileUpload';
import ManualStockEntry from './ManualStockEntry';
import { portfolioAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface StockEntry {
  ticker: string;
  quantity: number;
  purchasePrice?: number;
}

interface PortfolioInputProps {
  onGetRecommendations?: (stocks: StockEntry[], portfolioId?: string) => void;
  onAnalysisComplete?: (results: any) => void;
}

const PortfolioInput: React.FC<PortfolioInputProps> = ({ 
  onGetRecommendations, 
  onAnalysisComplete 
}) => {
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [portfolioSaved, setPortfolioSaved] = useState(false);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user } = useAuthStore();

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name);
  };

  const handleFileUpload = async (uploadedStocks: StockEntry[]) => {
    try {
      console.log('CSV uploaded, stocks parsed:', uploadedStocks);
      if (uploadedStocks && uploadedStocks.length > 0) {
        setStocks(uploadedStocks);
        setError(null);
        console.log(`Successfully added ${uploadedStocks.length} stocks from CSV`);
        
        // Auto-save portfolio after successful upload
        await savePortfolio(uploadedStocks);
      } else {
        setError('No valid stocks found in CSV file');
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      setError('Failed to process CSV file');
    }
  };

  const handleAddStock = async (stock: StockEntry) => {
    const newStocks = [...stocks, stock];
    setStocks(newStocks);
    setError(null);
    console.log('Stock added:', stock);
    
    // Auto-save when manually adding stocks
    if (newStocks.length > 0) {
      await savePortfolio(newStocks);
    }
  };

  const savePortfolio = async (stocksToSave: StockEntry[]) => {
    if (!user) {
      setError('Please log in to save your portfolio');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      console.log('💾 Saving portfolio to database...');
      const response = await portfolioAPI.savePortfolio(stocksToSave, 'My Portfolio');
      
      if (response.success) {
        setCurrentPortfolioId(response.data.portfolioId);
        setPortfolioSaved(true);
        setSuccess(`Portfolio saved! ${stocksToSave.length} stocks ready for analysis.`);
        console.log('✅ Portfolio saved:', response.data);
      } else {
        setError('Failed to save portfolio');
      }
    } catch (error) {
      console.error('❌ Failed to save portfolio:', error);
      setError('Failed to save portfolio. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!currentPortfolioId) {
      setError('Please save your portfolio first');
      return;
    }

    setIsLoading(true);
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('🤖 Starting AI analysis for portfolio:', currentPortfolioId);
      
      // Start analysis
      const analysisResponse = await portfolioAPI.analyzePortfolio(currentPortfolioId);
      
      if (analysisResponse.success) {
        setSuccess(`Analysis complete! Analyzed ${analysisResponse.data.summary.analyzed} stocks.`);
        console.log('✅ Analysis completed:', analysisResponse.data);
        
        // Get detailed results
        const resultsResponse = await portfolioAPI.getAnalysisResults(currentPortfolioId);
        
        if (resultsResponse.success && onAnalysisComplete) {
          onAnalysisComplete(resultsResponse.data);
        }
        
        if (onGetRecommendations) {
          onGetRecommendations(stocks, currentPortfolioId);
        }
      } else {
        setError('Analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setError('AI analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
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
          Your Portfolio
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          Upload your current holdings or add stocks manually to get personalized recommendations tailored to your investment goals.
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

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {isSaving && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            Saving portfolio...
          </Box>
        </Alert>
      )}

      {portfolioSaved && !isSaving && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle fontSize="small" />
            Portfolio saved successfully!
          </Box>
        </Alert>
      )}

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
        startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
        onClick={handleGetRecommendations}
        disabled={!hasStocks || isLoading || isSaving || !portfolioSaved}
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
        {isAnalyzing 
          ? 'Running AI Analysis...' 
          : isLoading 
          ? 'Processing...' 
          : portfolioSaved 
          ? 'Analyze with AI (3 Models)' 
          : 'Upload Portfolio First'
        }
      </Button>
    </Paper>
  );
};

export default PortfolioInput;