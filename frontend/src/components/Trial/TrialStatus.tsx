import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  AccessTime,
  PersonAdd,
  Share,
  ContentCopy,
  CheckCircle,
  TrendingUp,
  EmojiEvents,
} from '@mui/icons-material';

interface TrialStatusProps {
  user: {
    status: 'TRIAL' | 'FREE' | 'PRO_MONTHLY' | 'PRO_ANNUAL';
    trialEndDate: Date;
    totalTrialDays: number;
    requestExtensionUsed: boolean;
    referralCode: string;
    referralCount: number;
    extensionsUsed: number;
  };
  onRequestExtension: () => void;
  onUpgrade: () => void;
}

const TrialStatus: React.FC<TrialStatusProps> = ({
  user,
  onRequestExtension,
  onUpgrade,
}) => {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const trialEnd = new Date(user.trialEndDate);
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000 * 60 * 60); // Update hourly

    return () => clearInterval(interval);
  }, [user.trialEndDate]);

  const trialProgress = ((user.totalTrialDays - daysRemaining) / user.totalTrialDays) * 100;

  const referralLink = `https://stockpa.ai/signup?ref=${user.referralCode}`;

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setReferralLinkCopied(true);
      setTimeout(() => setReferralLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'StockPA.ai - Your Personal Investment Assistant',
      text: 'Get intelligent Buy/Sell/Hold recommendations for Nigerian stocks. Join me on StockPA!',
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      // Fallback to copying link
      handleCopyReferralLink();
    }
  };

  if (user.status !== 'TRIAL' && user.status !== 'FREE') {
    return null; // Don't show for paid users
  }

  const isTrialExpired = user.status === 'FREE';

  return (
    <>
      {/* Subtle top bar - only shows when trial is active */}
      {!isTrialExpired && (
        <Box
          sx={{
            bgcolor: 'rgba(46, 204, 113, 0.08)',
            border: '1px solid rgba(46, 204, 113, 0.2)',
            borderRadius: 2,
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <TrendingUp sx={{ color: '#2ecc71', mr: 1.5, fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                You're exploring StockPA Pro
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={trialProgress}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    width: 120,
                    mr: 2,
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2ecc71',
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                </Typography>
                {user.totalTrialDays > 7 && (
                  <Chip
                    label={`Extended to ${user.totalTrialDays} days`}
                    size="small"
                    color="success"
                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {daysRemaining <= 3 && (
              <>
                {!user.requestExtensionUsed && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AccessTime />}
                    onClick={onRequestExtension}
                    sx={{ 
                      textTransform: 'none',
                      color: '#2ecc71',
                      fontSize: '0.8rem',
                      minWidth: 'auto',
                      px: 1.5,
                    }}
                  >
                    +7 days
                  </Button>
                )}
                <Button
                  size="small"
                  variant="text"
                  startIcon={<PersonAdd />}
                  onClick={() => setShowReferralDialog(true)}
                  sx={{ 
                    textTransform: 'none',
                    color: '#2ecc71',
                    fontSize: '0.8rem',
                    minWidth: 'auto',
                    px: 1.5,
                  }}
                >
                  Invite friend
                </Button>
                <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />
              </>
            )}
            <Button
              size="small"
              variant="outlined"
              onClick={onUpgrade}
              sx={{
                textTransform: 'none',
                fontSize: '0.8rem',
                borderColor: '#2ecc71',
                color: '#2ecc71',
                '&:hover': { 
                  borderColor: '#27ae60',
                  bgcolor: 'rgba(46, 204, 113, 0.08)',
                },
                px: 2,
              }}
            >
              Continue with Pro
            </Button>
          </Box>
        </Box>
      )}

      {/* More prominent card when trial expires */}
      {isTrialExpired && (
        <Card
          sx={{
            mb: 3,
            border: '1px solid rgba(52, 152, 219, 0.3)',
            bgcolor: 'rgba(52, 152, 219, 0.05)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmojiEvents sx={{ color: '#3498db', mr: 1.5 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Thanks for exploring StockPA Pro!
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Continue with limited features or upgrade for full access
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<PersonAdd />}
                  onClick={() => setShowReferralDialog(true)}
                  sx={{ 
                    textTransform: 'none',
                    color: '#3498db',
                  }}
                >
                  Get more time
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onUpgrade}
                  sx={{
                    textTransform: 'none',
                    bgcolor: '#3498db',
                    '&:hover': { bgcolor: '#2980b9' },
                  }}
                >
                  Upgrade to Pro
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Referral Dialog */}
      <Dialog
        open={showReferralDialog}
        onClose={() => setShowReferralDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonAdd sx={{ mr: 1, color: 'primary.main' }} />
            Grow the StockPA Community
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Help fellow Nigerian investors discover smarter investing. When someone joins with your link, 
            you both get 7 extra days of Pro access!
          </Typography>

          {/* Achievement Stats */}
          <Card sx={{ mb: 3, bgcolor: 'rgba(46, 204, 113, 0.05)', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <EmojiEvents sx={{ mr: 1, color: '#2ecc71', fontSize: 20 }} />
                Your Impact
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2ecc71' }}>
                    {user.referralCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Friends joined
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#3498db' }}>
                    {user.extensionsUsed}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Extra days earned
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#e67e22' }}>
                    {user.referralCount * 7}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Days given to others
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Share Your Referral Link
          </Typography>
          <TextField
            fullWidth
            value={referralLink}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    startIcon={referralLinkCopied ? <CheckCircle /> : <ContentCopy />}
                    onClick={handleCopyReferralLink}
                    color={referralLinkCopied ? 'success' : 'primary'}
                    sx={{ textTransform: 'none' }}
                  >
                    {referralLinkCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Button
            variant="outlined"
            startIcon={<Share />}
            onClick={handleShare}
            sx={{ textTransform: 'none' }}
          >
            Share with Friends
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReferralDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TrialStatus;