import React, { useState, useEffect } from 'react';
import {
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  InputAdornment,
  FormHelperText,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import {
  CompareArrows as TransferIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';

const TransferFundsForm = ({ accounts, onSubmit, onCancel }) => {
  const initialFormState = {
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10) // Current date in YYYY-MM-DD format
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [fromAccount, setFromAccount] = useState(null);
  const [toAccount, setToAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  // Update accounts when selection changes
  useEffect(() => {
    if (formData.fromAccountId) {
      const selected = accounts.find(a => a._id === formData.fromAccountId);
      setFromAccount(selected);
    } else {
      setFromAccount(null);
    }
    
    if (formData.toAccountId) {
      const selected = accounts.find(a => a._id === formData.toAccountId);
      setToAccount(selected);
    } else {
      setToAccount(null);
    }
  }, [formData.fromAccountId, formData.toAccountId, accounts]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field when changed
    setErrors({
      ...errors,
      [name]: undefined
    });
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle account swap
  const handleSwapAccounts = () => {
    setFormData({
      ...formData,
      fromAccountId: formData.toAccountId,
      toAccountId: formData.fromAccountId
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fromAccountId) {
      newErrors.fromAccountId = 'Source account is required';
    }
    
    if (!formData.toAccountId) {
      newErrors.toAccountId = 'Destination account is required';
    }
    
    if (formData.fromAccountId === formData.toAccountId) {
      newErrors.toAccountId = 'Source and destination accounts must be different';
    }
    
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount greater than zero is required';
    } else if (fromAccount && Number(formData.amount) > fromAccount.currentBalance) {
      newErrors.amount = 'Amount exceeds source account balance';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        setLoading(true);
        // Convert amount to number
        const submissionData = {
          ...formData,
          amount: Number(formData.amount)
        };
        
        await onSubmit(submissionData);
      } catch (error) {
        console.error('Error submitting transfer:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          <TransferIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Transfer funds between your bank accounts
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Source Account */}
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              select
              label="From Account"
              name="fromAccountId"
              value={formData.fromAccountId}
              onChange={handleChange}
              error={!!errors.fromAccountId}
              helperText={errors.fromAccountId}
              required
              variant="outlined"
            >
              {accounts
                .filter(account => account.isActive)
                .map((account) => (
                  <MenuItem key={account._id} value={account._id}>
                    {account.accountName} ({account.bankName})
                  </MenuItem>
                ))}
            </TextField>
            {fromAccount && (
              <FormHelperText>
                Available Balance: {formatCurrency(fromAccount.currentBalance)}
              </FormHelperText>
            )}
          </Grid>
          
          {/* Swap Button */}
          <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleSwapAccounts}
              disabled={!formData.fromAccountId || !formData.toAccountId}
              sx={{ minWidth: 40, minHeight: 40 }}
            >
              <SwapIcon />
            </Button>
          </Grid>
          
          {/* Destination Account */}
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              select
              label="To Account"
              name="toAccountId"
              value={formData.toAccountId}
              onChange={handleChange}
              error={!!errors.toAccountId}
              helperText={errors.toAccountId}
              required
              variant="outlined"
            >
              {accounts
                .filter(account => account.isActive && account._id !== formData.fromAccountId)
                .map((account) => (
                  <MenuItem key={account._id} value={account._id}>
                    {account.accountName} ({account.bankName})
                  </MenuItem>
                ))}
            </TextField>
            {toAccount && (
              <FormHelperText>
                Current Balance: {formatCurrency(toAccount.currentBalance)}
              </FormHelperText>
            )}
          </Grid>
          
          {/* Amount */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              error={!!errors.amount}
              helperText={errors.amount}
              required
              variant="outlined"
              InputProps={{
                startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
              }}
            />
          </Grid>
          
          {/* Date */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Transfer Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              error={!!errors.date}
              helperText={errors.date || 'Date of the transfer'}
              required
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              error={!!errors.description}
              helperText={errors.description}
              required
              variant="outlined"
              placeholder="Transfer purpose or reference"
            />
          </Grid>
        </Grid>
        
        {/* Summary Alert */}
        {formData.fromAccountId && formData.toAccountId && formData.amount && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info">
              <Typography variant="body2">
                You are about to transfer {formData.amount ? formatCurrency(Number(formData.amount)) : 'LKR 0.00'} from{' '}
                {fromAccount?.accountName || 'source account'} to {toAccount?.accountName || 'destination account'}.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Transfer Funds'}
        </Button>
      </DialogActions>
    </form>
  );
};

export default TransferFundsForm;