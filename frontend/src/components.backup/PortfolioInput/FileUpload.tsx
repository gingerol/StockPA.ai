import React, { useRef, useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { CloudUpload, InsertDriveFile } from '@mui/icons-material';

interface FileUploadProps {
  onFileSelect?: (file: File) => void;
  onFileUpload?: (stocks: Array<{ticker: string; quantity: number; purchasePrice?: number}>) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const stocks = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const [ticker, quantity, purchasePrice] = line.split(',').map(s => s.trim());
        if (ticker && quantity) {
          stocks.push({
            ticker: ticker.toUpperCase(),
            quantity: parseInt(quantity),
            purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          });
        }
      }
    }
    
    return stocks;
  };

  const handleUpload = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!selectedFile || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const text = await selectedFile.text();
      const stocks = parseCSV(text);
      
      console.log('Parsed stocks:', stocks);
      
      if (onFileUpload) {
        onFileUpload(stocks);
      }
      
      // Reset the file input after a short delay
      setTimeout(() => {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100);
      
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    } finally {
      setTimeout(() => setIsProcessing(false), 100);
    }
  };

  const handleDownloadSample = () => {
    const sampleCSV = `Ticker,Quantity,Purchase Price
GTCO,1000,25.50
MTNN,5309,400.00
NB,1500,45.80
DANGCEM,750,280.00
ZENITHBANK,2500,32.20
FBNH,3000,18.75
AIRTELAFRI,800,1450.00
UBA,1200,14.90
OANDO,500,8.45
NESTLE,300,1625.00`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-portfolio.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography 
        variant="subtitle2" 
        sx={{ 
          fontWeight: 600, 
          mb: 1.5,
          color: 'text.primary',
        }}
      >
        Upload CSV File
      </Typography>
      
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderStyle: 'dashed',
          borderColor: 'divider',
          borderWidth: 2,
          borderRadius: 2,
          bgcolor: 'grey.50',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50',
          },
        }}
        onClick={handleClick}
      >
        <Button
          variant="outlined"
          size="small"
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            minWidth: 100,
          }}
        >
          Choose File
        </Button>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ flex: 1 }}
        >
          {selectedFile ? selectedFile.name : 'no file selected'}
        </Typography>
        
        {selectedFile && (
          <Button
            variant="contained"
            size="small"
            onClick={handleUpload}
            disabled={isProcessing}
            sx={{
              mr: 1,
              textTransform: 'none',
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            {isProcessing ? 'Processing...' : 'Upload'}
          </Button>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {selectedFile ? (
            <InsertDriveFile sx={{ color: 'primary.main', fontSize: 24 }} />
          ) : (
            <CloudUpload sx={{ color: 'text.secondary', fontSize: 24 }} />
          )}
        </Box>
      </Paper>
      
      <Box sx={{ mt: 2 }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block',
            fontSize: '0.75rem',
            mb: 1,
          }}
        >
          <strong>CSV Format Required:</strong>
        </Typography>
        
        <Box 
          component="pre"
          sx={{ 
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            color: 'text.secondary',
            bgcolor: 'grey.100',
            p: 1,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300',
            overflow: 'auto',
            mb: 1,
          }}
        >
{`Ticker,Quantity,Purchase Price
GTCO,1000,25.50
MTNN,5309,400.00
NB,1500,45.80`}
        </Box>
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            fontSize: '0.7rem',
            display: 'block',
          }}
        >
          • First row must be headers: <strong>Ticker,Quantity,Purchase Price</strong><br/>
          • Use NGX stock tickers (GTCO, MTNN, NB, etc.)<br/>
          • Purchase Price is optional (leave empty if unknown)<br/>
          • No spaces around commas
        </Typography>
        
        <Box sx={{ mt: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={handleDownloadSample}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              color: 'primary.main',
              p: 0,
              minWidth: 'auto',
            }}
          >
            📥 Download Sample CSV
          </Button>
        </Box>
      </Box>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </Box>
  );
};

export default FileUpload;