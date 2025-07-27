import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  CheckCircle,
  Star,
  TrendingUp,
  NotificationsActive,
  Analytics,
  Download,
  QuestionAnswer,
  History,
  Close,
} from '@mui/icons-material';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onSubscribe: (plan: 'monthly' | 'annual' | 'daily') => void;
  currentLimitations?: string[]; // What user is missing right now
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onClose,
  onSubscribe,
  currentLimitations = [],
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'daily'>('monthly');

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Pro',
      price: '₦2,500',
      period: 'per month',
      savings: null,
      popular: true,
      description: 'Perfect for active investors',
    },
    {
      id: 'annual',
      name: 'Annual Pro',
      price: '₦20,000',
      period: 'per year',
      savings: 'Save ₦10,000',
      popular: false,
      description: 'Best value - 33% savings',
    },
    {
      id: 'daily',
      name: 'Daily Pass',
      price: '₦400',
      period: 'for today',
      savings: null,
      popular: false,
      description: 'Perfect for quick decisions',
    },
  ];

  const proFeatures = [
    {
      icon: <TrendingUp />,
      title: 'Unlimited Portfolio Analysis',
      description: 'Analyze portfolios of any size, any time',
    },
    {
      icon: <Analytics />,
      title: 'Full AI Explanations',
      description: 'Complete reasoning for every recommendation',
    },
    {
      icon: <NotificationsActive />,
      title: 'Smart Email Alerts',
      description: 'Get notified when stocks hit target prices',
    },
    {
      icon: <History />,
      title: 'Portfolio History & ROI',
      description: 'Track your portfolio performance over time',
    },
    {
      icon: <QuestionAnswer />,
      title: 'Follow-up Questions',
      description: 'Ask your Personal Assistant anything',
    },
    {
      icon: <Download />,
      title: 'Data Export',
      description: 'Export your analysis to Excel/PDF',
    },
  ];

  const handleSubscribe = () => {
    onSubscribe(selectedPlan as 'monthly' | 'annual' | 'daily');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Upgrade to StockPA Pro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unlock the full power of your Personal Investment Assistant
            </Typography>
          </Box>
          <Button
            onClick={onClose}
            sx={{ minWidth: 'auto', p: 1 }}
            color="inherit"
          >
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Current Limitations Alert */}
        {currentLimitations.length > 0 && (
          <Card sx={{ mb: 3, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                🔒 You're currently missing:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentLimitations.map((limitation, index) => (
                  <Chip
                    key={index}
                    label={limitation}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Choose Your Plan
        </Typography>
        
        <RadioGroup
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value as any)}
        >
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {plans.map((plan) => (
              <Grid item xs={12} sm={4} key={plan.id}>
                <Card
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    border: selectedPlan === plan.id ? '2px solid #2ecc71' : '1px solid #e0e0e0',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => setSelectedPlan(plan.id as any)}
                >
                  {plan.popular && (
                    <Chip
                      label="Most Popular"
                      color="success"
                      size="small"
                      icon={<Star />}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <FormControlLabel
                      value={plan.id}
                      control={<Radio />}
                      label=""
                      sx={{ position: 'absolute', top: 8, right: 8, m: 0 }}
                    />
                    
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {plan.name}
                    </Typography>
                    
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2ecc71', mb: 0.5 }}>
                      {plan.price}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {plan.period}
                    </Typography>
                    
                    {plan.savings && (
                      <Chip
                        label={plan.savings}
                        color="success"
                        size="small"
                        sx={{ mb: 2 }}
                      />
                    )}
                    
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {plan.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </RadioGroup>

        <Divider sx={{ my: 3 }} />

        {/* Pro Features */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          What You Get with Pro
        </Typography>
        
        <Grid container spacing={2}>
          {proFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box
                  sx={{
                    mr: 2,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: '#e8f5e8',
                    color: '#2ecc71',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {feature.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Value Proposition */}
        <Card sx={{ mt: 3, bgcolor: '#e8f5e8', border: '1px solid #c6f6d5' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ textAlign: 'center', mb: 1 }}>
              <strong>💡 Smart Investment:</strong> ₦2,500/month is less than your daily lunch money
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', fontSize: '0.875rem', color: 'text.secondary' }}>
              One good recommendation can save you ₦50,000+ • Cheaper than hiring a financial advisor (₦100,000+/year)
            </Typography>
          </CardContent>
        </Card>

        {/* Social Proof */}
        <Card sx={{ mt: 2, bgcolor: '#f8f9fa' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
              "StockPA Pro helped me catch GTCO's 25% gain and avoid DANGCEM's decline. Paid for itself in one week!"
              <br />
              <strong>— Adebayo O., Lagos Investor</strong>
            </Typography>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none' }}
        >
          Maybe Later
        </Button>
        <Button
          variant="contained"
          onClick={handleSubscribe}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            bgcolor: '#2ecc71',
            '&:hover': { bgcolor: '#27ae60' },
          }}
        >
          {selectedPlan === 'daily' ? 'Get Daily Pass' : 'Start Pro Subscription'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpgradeModal;