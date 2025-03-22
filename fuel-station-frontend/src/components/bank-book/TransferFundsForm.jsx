import React from 'react';
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
import useTransferFundsValidation from '../../hooks/useTransferFundsValidation';

const TransferFundsForm = ({ accounts, onSubmit, onCancel }) => {
  const initialFormState = {
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10) // Current date in YYYY-MM-DD format
  };

  // Initialize the validation hook
  const {
    formData,
    errors,
    isSubmitting,
    fromAccount,
    toAccount,
    handleChange,
    handleBlur,
    handleSubmit,
    handleSwapAccounts,
    hasError,
    getError
  } = useTransferFundsValidation(
    initialFormState,
    accounts,
    async (validatedData) => {
      try {
        await onSubmit(validatedData);
      } catch (error) {
        console.error('Error submitting transfer form:', error);
        throw error;
      }
    }
  );

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
              onBlur={handleBlur}
              error={hasError('fromAccountId')}
              helperText={getError('fromAccountId')}
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
              disabled={!formData.fromAccountId || !formData.toAccountId || isSubmitting}
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
              onBlur={handleBlur}
              error={hasError('toAccountId')}
              helperText={getError('toAccountId')}
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
              onBlur={handleBlur}
              error={hasError('amount')}
              helperText={getError('amount')}
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
              onBlur={handleBlur}
              error={hasError('date')}
              helperText={getError('date') || 'Date of the transfer'}
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
              onBlur={handleBlur}
              error={hasError('description')}
              helperText={getError('description')}
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
        <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Transfer Funds'}
        </Button>
      </DialogActions>
    </form>
  );
};

export default TransferFundsForm;