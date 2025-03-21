import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import { AccountBalance as AccountIcon } from '@mui/icons-material';

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

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  // Populate form with account data when editing
  useEffect(() => {
    if (account) {
      setFormData({
        accountName: account.accountName || '',
        accountNumber: account.accountNumber || '',
        bankName: account.bankName || '',
        branchName: account.branchName || '',
        routingNumber: account.routingNumber || '',
        accountType: account.accountType || 'Checking',
        openingBalance: account.openingBalance || 0,
        isActive: account.isActive !== undefined ? account.isActive : true,
        notes: account.notes || ''
      });
    } else {
      setFormData(initialFormState);
    }
  }, [account]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox/switch inputs
    const newValue = type === 'checkbox' ? checked : value;
    
    // Clear error for this field when changed
    setErrors({
      ...errors,
      [name]: undefined
    });
    
    setFormData({
      ...formData,
      [name]: newValue
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }
    
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }
    
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    
    if (formData.openingBalance < 0) {
      newErrors.openingBalance = 'Opening balance cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert openingBalance to number
      const submissionData = {
        ...formData,
        openingBalance: Number(formData.openingBalance)
      };
      
      onSubmit(submissionData);
    }
  };

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
              error={!!errors.accountName}
              helperText={errors.accountName}
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
              error={!!errors.bankName}
              helperText={errors.bankName}
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
              error={!!errors.accountNumber}
              helperText={errors.accountNumber}
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
              variant="outlined"
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
              error={!!errors.openingBalance}
              helperText={errors.openingBalance}
              variant="outlined"
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
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
        >
          {account ? 'Update Account' : 'Create Account'}
        </Button>
      </DialogActions>
    </form>
  );
};

export default BankAccountForm;