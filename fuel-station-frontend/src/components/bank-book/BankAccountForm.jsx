import React, { useEffect } from 'react';
import {
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  InputAdornment,
  FormControlLabel,
  Switch,
  FormHelperText,
  Box,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import { AccountBalance as AccountIcon } from '@mui/icons-material';
import useBankAccountValidation from '../../hooks/useBankAccountValidation';

const BankAccountForm = ({ account, onSubmit, onCancel }) => {
  const initialFormState = {
    accountName: '',
    accountNumber: '',
    bankName: '',
    branchName: '',
    routingNumber: '',
    accountType: 'Checking',
    openingBalance: 0,
    isActive: true,
    notes: ''
  };

  // Initialize the validation hook
  const {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    hasError,
    getError
  } = useBankAccountValidation(
    initialFormState,
    async (validatedData) => {
      try {
        await onSubmit(validatedData);
      } catch (error) {
        console.error('Error submitting bank account form:', error);
        throw error;
      }
    }
  );

  // Populate form with account data when editing
  useEffect(() => {
    if (account) {
      Object.keys(initialFormState).forEach(key => {
        if (account[key] !== undefined) {
          setFieldValue(key, account[key]);
        }
      });
    }
  }, [account]);

  // Account types options
  const accountTypes = [
    { value: 'Checking', label: 'Checking Account' },
    { value: 'Savings', label: 'Savings Account' },
    { value: 'Credit Card', label: 'Credit Card Account' },
    { value: 'Loan', label: 'Loan Account' },
    { value: 'Investment', label: 'Investment Account' },
    { value: 'Other', label: 'Other Account Type' }
  ];

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Account Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Account Name"
              name="accountName"
              value={formData.accountName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('accountName')}
              helperText={getError('accountName')}
              required
              variant="outlined"
              placeholder="e.g. Main Operating Account"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          {/* Bank Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('bankName')}
              helperText={getError('bankName')}
              required
              variant="outlined"
              placeholder="e.g. Bank of Ceylon"
            />
          </Grid>
          
          {/* Branch Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Branch Name"
              name="branchName"
              value={formData.branchName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('branchName')}
              helperText={getError('branchName')}
              required
              variant="outlined"
              placeholder="e.g. Main Branch"
            />
          </Grid>
          
          {/* Account Number */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('accountNumber')}
              helperText={getError('accountNumber')}
              required
              variant="outlined"
              placeholder="e.g. 1234567890"
            />
          </Grid>
          
          {/* Routing Number */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Routing Number"
              name="routingNumber"
              value={formData.routingNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('routingNumber')}
              helperText={getError('routingNumber')}
              variant="outlined"
              placeholder="e.g. 987654321"
            />
          </Grid>
          
          {/* Account Type */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Account Type"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('accountType')}
              helperText={getError('accountType')}
              variant="outlined"
              required
            >
              {accountTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {/* Opening Balance */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Opening Balance"
              name="openingBalance"
              type="number"
              value={formData.openingBalance}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('openingBalance')}
              helperText={getError('openingBalance')}
              variant="outlined"
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
              }}
            />
          </Grid>
          
          {/* Status */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange}
                  name="isActive"
                  color="primary"
                />
              }
              label="Account is active"
            />
            <FormHelperText>Inactive accounts won't appear in transaction forms</FormHelperText>
          </Grid>
          
          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={4}
              variant="outlined"
              placeholder="Additional details about this account"
            />
          </Grid>
        </Grid>
        
        {account && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(account.createdAt).toLocaleString()} • 
              Last Updated: {new Date(account.updatedAt).toLocaleString()}
            </Typography>
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
          {isSubmitting ? (
            <CircularProgress size={24} />
          ) : account ? (
            'Update Account'
          ) : (
            'Create Account'
          )}
        </Button>
      </DialogActions>
    </form>
  );
};

export default BankAccountForm;