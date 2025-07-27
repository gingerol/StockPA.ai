import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
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

const mockData: RecommendationData[] = [
  {
    id: '1',
    ticker: 'GTCO',
    companyName: 'Guaranty Trust Holding Company Plc',
    currentPrice: 25.50,
    targetPrice: 32.00,
    action: 'BUY',
    confidence: 'HIGH',
    potentialReturn: 25.49,
    riskLevel: 'LOW',
    timeHorizon: '6-12 months',
    reasoning: 'Strong fundamentals, consistent dividend payments, digital banking growth'
  },
  {
    id: '2',
    ticker: 'MTNN',
    companyName: 'MTN Nigeria Communications Plc',
    currentPrice: 400.00,
    targetPrice: 380.00,
    action: 'HOLD',
    confidence: 'MEDIUM',
    potentialReturn: -5.00,
    riskLevel: 'MEDIUM',
    timeHorizon: '3-6 months',
    reasoning: 'Regulatory pressures, but strong market position and 5G rollout potential'
  },
  {
    id: '3',
    ticker: 'DANGCEM',
    companyName: 'Dangote Cement Plc',
    currentPrice: 280.00,
    targetPrice: 260.00,
    action: 'SELL',
    confidence: 'MEDIUM',
    potentialReturn: -7.14,
    riskLevel: 'HIGH',
    timeHorizon: '1-3 months',
    reasoning: 'High energy costs, increased competition, cement demand slowdown'
  },
  {
    id: '4',
    ticker: 'ZENITHBANK',
    companyName: 'Zenith Bank Plc',
    currentPrice: 32.20,
    targetPrice: 38.50,
    action: 'BUY',
    confidence: 'HIGH',
    potentialReturn: 19.57,
    riskLevel: 'LOW',
    timeHorizon: '6-12 months',
    reasoning: 'Strong asset quality, international expansion, digital transformation'
  },
  {
    id: '5',
    ticker: 'AIRTELAFRI',
    companyName: 'Airtel Africa Plc',
    currentPrice: 1450.00,
    targetPrice: 1600.00,
    action: 'BUY',
    confidence: 'MEDIUM',
    potentialReturn: 10.34,
    riskLevel: 'MEDIUM',
    timeHorizon: '12-18 months',
    reasoning: 'Growing mobile money services, 4G expansion across African markets'
  }
];

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
    case 'BUY': return <TrendingUp sx={{ fontSize: 16 }} />;
    case 'SELL': return <TrendingDown sx={{ fontSize: 16 }} />;
    case 'HOLD': return <Remove sx={{ fontSize: 16 }} />;
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
  data = mockData, 
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
        <Tooltip title={params.row.reasoning}>
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
          AI Recommendations
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          Based on current market conditions and fundamental analysis
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