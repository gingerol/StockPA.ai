import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  TrendingUp, 
  TrendingDown, 
  Remove,
  Info,
} from '@mui/icons-material';

interface RecommendationData {
  id: string;
  ticker: string;
  companyName: string;
  currentPrice: number;
  targetPrice: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  potentialReturn: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeHorizon: string;
  reasoning: string;
}

interface RecommendationsProps {
  data?: RecommendationData[];
  isLoading?: boolean;
}

// Helper functions for styling
const getActionColor = (action: string) => {
  switch (action) {
    case 'BUY': return 'success';
    case 'SELL': return 'error';
    case 'HOLD': return 'warning';
    default: return 'default';
  }
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'BUY': return <TrendingUp />;
    case 'SELL': return <TrendingDown />;
    case 'HOLD': return <Remove />;
    default: return null;
  }
};

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'HIGH': return 'success';
    case 'MEDIUM': return 'warning';
    case 'LOW': return 'error';
    default: return 'default';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'LOW': return 'success';
    case 'MEDIUM': return 'warning';
    case 'HIGH': return 'error';
    default: return 'default';
  }
};

const Recommendations: React.FC<RecommendationsProps> = ({ 
  data = [], 
  isLoading = false 
}) => {
  const columns: GridColDef[] = [
    {
      field: 'ticker',
      headerName: 'Stock',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'companyName',
      headerName: 'Company',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'currentPrice',
      headerName: 'Current Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          ₦{params.value.toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'targetPrice',
      headerName: 'Target Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          ₦{params.value.toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getActionColor(params.value) as any}
          size="small"
          icon={getActionIcon(params.value)}
          sx={{ 
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    {
      field: 'confidence',
      headerName: 'Confidence',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getConfidenceColor(params.value) as any}
          size="small"
          variant="outlined"
          sx={{ 
            fontWeight: 500,
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    {
      field: 'potentialReturn',
      headerName: 'Potential Return',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const value = params.value as number;
        const color = value >= 0 ? 'success.main' : 'error.main';
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              color,
              fontWeight: 600,
            }}
          >
            {value >= 0 ? '+' : ''}{value.toFixed(1)}%
          </Typography>
        );
      },
    },
    {
      field: 'riskLevel',
      headerName: 'Risk',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getRiskColor(params.value) as any}
          size="small"
          variant="outlined"
          sx={{ 
            fontWeight: 500,
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    {
      field: 'timeHorizon',
      headerName: 'Time Horizon',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip 
          title={
            <Box sx={{ maxWidth: 400, p: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Why {params.row.action} {params.row.ticker}?
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  whiteSpace: 'pre-line',
                  fontSize: '0.75rem',
                  lineHeight: 1.4
                }}
              >
                {params.row.reasoning}
              </Typography>
            </Box>
          }
          arrow
          placement="left"
          sx={{
            '& .MuiTooltip-tooltip': {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              maxWidth: 450,
            }
          }}
        >
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <Info fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

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
          Your Personal Assistant Recommends
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          Based on comprehensive analysis of market conditions, company fundamentals, and your investment profile
        </Typography>
      </Box>

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'grey.50',
              borderBottom: '1px solid',
              borderBottomColor: 'divider',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid',
              borderBottomColor: 'divider',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default Recommendations;