import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Box, Divider, LinearProgress, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert
} from '@mui/material';
import { Settings, CreditScore, Assignment } from '@mui/icons-material';
import pettyCashAPI from '../../services/petty-cash.service';

const PettyCashBalance = ({ balanceData, isManagerOrAdmin, onUpdateSettings }) => {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    maxLimit: 0,
    minLimit: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Debug method - log what data we received
  useEffect(() => {
    console.log('[PettyCashBalance] Balance data:', balanceData);
  }, [balanceData]);

  // Handle settings dialog open
  const handleOpenSettingsDialog = () => {
    if (balanceData?.balance) {
      setSettingsForm({
        maxLimit: balanceData.balance.maxLimit,
        minLimit: balanceData.balance.minLimit
      });
    }
    setSettingsDialogOpen(true);
  };

  // Handle settings form change
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle settings form submit
  const handleSettingsSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stationId = balanceData?.balance?.stationId || '';
      console.log(`[PettyCashBalance] Updating settings for station ${stationId}:`, settingsForm);
      
      const response = await pettyCashAPI.updateBalanceSettings(stationId, settingsForm);
      
      if (response.data && response.data.success) {
        console.log('[PettyCashBalance] Settings updated successfully:', response.data);
        setSettingsDialogOpen(false);
        onUpdateSettings();
      } else {
        console.error('[PettyCashBalance] Failed to update settings:', response.data);
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      console.error('[PettyCashBalance] Error updating settings:', err);
      setError('Error updating settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress value for the balance progress bar
  const getProgressValue = () => {
    if (!balanceData?.balance) return 0;
    
    const { currentBalance, maxLimit } = balanceData.balance;
    return Math.min(100, (currentBalance / maxLimit) * 100);
  };

  // Determine the progress color based on balance
  const getProgressColor = () => {
    if (!balanceData?.balance) return 'primary';
    
    const { currentBalance, minLimit } = balanceData.balance;
    
    if (currentBalance < minLimit) {
      return 'error';
    } else if (currentBalance < minLimit * 1.5) {
      return 'warning';
    } else {
      return 'success';
    }
  };

  if (!balanceData) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CircularProgress size={30} sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading balance data...</Typography>
      </Box>
    );
  }

  // Safe access to balance data
  const balance = balanceData?.balance || {
    currentBalance: 0,
    maxLimit: 10000,
    minLimit: 2000
  };

  const needsReplenishment = balanceData?.needsReplenishment || false;
  const latestTransactions = balanceData?.latestTransactions || [];

  return (
    <>
      <Grid container spacing={3}>
        {/* Current Balance Card */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Current Balance
            </Typography>
            
            <Box sx={{ my: 1 }}>
              <Typography variant="h3" color={getProgressColor()}>
                {formatCurrency(balance.currentBalance)}
              </Typography>
            </Box>
            
            <Box sx={{ mt: 2, mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue()} 
                color={getProgressColor()}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Minimum Limit
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(balance.minLimit)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Maximum Limit
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(balance.maxLimit)}
                </Typography>
              </Grid>
            </Grid>
            
            {needsReplenishment && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Balance is below minimum threshold!
              </Alert>
            )}
            
            {isManagerOrAdmin && (
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Button 
                  startIcon={<Settings />}
                  onClick={handleOpenSettingsDialog}
                  size="small"
                >
                  Update Balance Settings
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Last Replenishment & Pending Requests */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Activity Summary
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Last Replenishment
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(balance.lastReplenishmentDate)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1">
                    {balance.lastReplenishmentAmount ? 
                      formatCurrency(balance.lastReplenishmentAmount) : 
                      'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Pending Requests
              </Typography>
              {latestTransactions && latestTransactions.filter(tx => 
                tx.approvalStatus === 'Pending' && tx.transactionType === 'withdrawal'
              ).length > 0 ? (
                <Box>
                  {latestTransactions.filter(tx => 
                    tx.approvalStatus === 'Pending' && tx.transactionType === 'withdrawal'
                  ).slice(0, 3).map(tx => (
                    <Box key={tx._id} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <CreditScore color="warning" sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="body2">{tx.description}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(tx.date)}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(tx.amount)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No pending requests
                </Typography>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Recent Transactions
              </Typography>
              {latestTransactions && latestTransactions.length > 0 ? (
                <Box>
                  {latestTransactions.filter(tx => 
                    tx.approvalStatus === 'Approved'
                  ).slice(0, 3).map(tx => (
                    <Box key={tx._id} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <Assignment 
                        color={tx.transactionType === 'withdrawal' ? 'error' : 'success'} 
                        sx={{ mr: 1 }} 
                      />
                      <Box>
                        <Typography variant="body2">{tx.description}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(tx.date)}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={tx.transactionType === 'withdrawal' ? 'error.main' : 'success.main'}
                          >
                            {tx.transactionType === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent transactions
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)}>
        <DialogTitle>Update Balance Settings</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            name="maxLimit"
            label="Maximum Limit (LKR)"
            type="number"
            fullWidth
            value={settingsForm.maxLimit}
            onChange={handleSettingsChange}
            inputProps={{ min: 0 }}
            helperText="The maximum amount the petty cash box should hold"
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="minLimit"
            label="Minimum Limit (LKR)"
            type="number"
            fullWidth
            value={settingsForm.minLimit}
            onChange={handleSettingsChange}
            inputProps={{ min: 0 }}
            helperText="The minimum threshold for replenishment requests"
            error={settingsForm.minLimit > settingsForm.maxLimit}
            sx={{ mb: 1 }}
          />
          
          {settingsForm.minLimit > settingsForm.maxLimit && (
            <Typography color="error" variant="caption">
              Minimum limit cannot be greater than maximum limit
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSettingsSubmit} 
            variant="contained" 
            disabled={loading || settingsForm.minLimit > settingsForm.maxLimit}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PettyCashBalance;