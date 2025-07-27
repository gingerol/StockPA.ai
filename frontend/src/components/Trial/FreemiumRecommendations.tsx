import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Card,
  CardContent,
  Blur,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  TrendingUp, 
  TrendingDown, 
  Remove,
  Info,
  Lock,
  Upgrade,
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

interface FreemiumRecommendationsProps {
  data: RecommendationData[];
  userStatus: 'TRIAL' | 'FREE' | 'PRO_MONTHLY' | 'PRO_ANNUAL';
  freeLimit: number; // How many stocks to show for free users
  onUpgrade: () => void;
}

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

const BlurredCell: React.FC<{ children: React.ReactNode; onUpgrade: () => void }> = ({ 
  children, 
  onUpgrade 
}) => (
  <Box
    sx={{
      position: 'relative',
      filter: 'blur(4px)',
      cursor: 'pointer',
    }}
    onClick={onUpgrade}
  >
    {children}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
      }}
    >
      <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
    </Box>
  </Box>
);

const FreemiumRecommendations: React.FC<FreemiumRecommendationsProps> = ({
  data,
  userStatus,
  freeLimit,
  onUpgrade,
}) => {
  const isPaidUser = userStatus === 'PRO_MONTHLY' || userStatus === 'PRO_ANNUAL';
  const isTrialUser = userStatus === 'TRIAL';
  const isFreeUser = userStatus === 'FREE';
  
  const visibleData = isFreeUser ? data.slice(0, freeLimit) : data;
  const hiddenCount = isFreeUser ? Math.max(0, data.length - freeLimit) : 0;

  const columns: GridColDef[] = [
    {
      field: 'ticker',
      headerName: 'Stock',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const shouldBlur = isFreeUser && params.api.getAllRowIds().indexOf(params.id) >= freeLimit;
        const content = (
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
        );
        return shouldBlur ? <BlurredCell onUpgrade={onUpgrade}>{content}</BlurredCell> : content;
      },
    },
    {
      field: 'companyName',
      headerName: 'Company',
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const shouldBlur = isFreeUser && params.api.getAllRowIds().indexOf(params.id) >= freeLimit;
        const content = (
          <Typography variant="body2" color="text.secondary">
            {params.value}
          </Typography>
        );
        return shouldBlur ? <BlurredCell onUpgrade={onUpgrade}>{content}</BlurredCell> : content;
      },
    },
    {
      field: 'currentPrice',
      headerName: 'Current Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const shouldBlur = isFreeUser && params.api.getAllRowIds().indexOf(params.id) >= freeLimit;
        const content = (
          <Typography variant="body2">
            ₦{params.value.toFixed(2)}
          </Typography>
        );
        return shouldBlur ? <BlurredCell onUpgrade={onUpgrade}>{content}</BlurredCell> : content;
      },
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const shouldBlur = isFreeUser && params.api.getAllRowIds().indexOf(params.id) >= freeLimit;
        const content = (
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
        );
        return shouldBlur ? <BlurredCell onUpgrade={onUpgrade}>{content}</BlurredCell> : content;
      },
    },
    {
      field: 'reasoning',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const rowIndex = params.api.getAllRowIds().indexOf(params.id);
        const shouldBlur = isFreeUser && rowIndex >= freeLimit;
        const shouldShowLimitedTooltip = isFreeUser && rowIndex < freeLimit;
        
        if (shouldBlur) {
          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Lock />}
              onClick={onUpgrade}
              sx={{
                textTransform: 'none',
                fontSize: '0.7rem',
                py: 0.5,
                px: 1,
              }}
            >
              Unlock
            </Button>
          );
        }
        
        if (shouldShowLimitedTooltip) {
          // Show truncated reasoning for free users
          const truncatedReasoning = params.row.reasoning.substring(0, 100) + '...';
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip 
                title={
                  <Box sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {truncatedReasoning}
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={onUpgrade}
                      sx={{ 
                        bgcolor: '#2ecc71',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                      }}
                    >
                      Upgrade for Full Analysis
                    </Button>
                  </Box>
                }
                arrow
                placement="left"
              >
                <IconButton size="small">
                  <Info fontSize="small" />
                </IconButton>
              </Tooltip>
              {isFreeUser && (
                <Chip
                  label="Limited"
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.65rem' }}
                />
              )}
            </Box>
          );
        }
        
        // Full tooltip for paid/trial users
        return (
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
          >
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
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
        
        {isFreeUser && (
          <Box sx={{ mt: 2 }}>
            <Chip
              label={`Showing ${freeLimit} of ${data.length} recommendations`}
              color="warning"
              size="small"
              sx={{ mr: 1 }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<Upgrade />}
              onClick={onUpgrade}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Unlock All {data.length} Recommendations
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={visibleData}
          columns={columns}
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

      {hiddenCount > 0 && (
        <Card sx={{ mt: 3, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>{hiddenCount} more recommendations</strong> available with StockPA Pro
            </Typography>
            <Button
              variant="contained"
              startIcon={<Upgrade />}
              onClick={onUpgrade}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#2ecc71',
                '&:hover': { bgcolor: '#27ae60' },
              }}
            >
              Upgrade to See All Recommendations
            </Button>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
};

export default FreemiumRecommendations;