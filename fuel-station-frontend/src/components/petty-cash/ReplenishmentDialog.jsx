import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Box,
  Typography
} from '@mui/material';
import { MonetizationOn } from '@mui/icons-material';
import api from '../../services/api';

const ReplenishmentDialog = ({ open, onClose, onSubmit, stationId }) => {
  const initialState = {
    amount: '',
    description: 'Petty Cash Replenishment',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Load bank accounts when dialog opens
  useEffect(() => {
    if (open) {
      fetchBankAccounts();
    }
  }, [open]);

  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await api.get('/bank-book/accounts');
      if (response.data && response.data.data) {
        setBankAccounts(response.data.data);
        
        // Set default account if available
        if (response.data.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            accountId: response.data.data[0]._id
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setError('Error loading bank accounts. Please try again.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.accountId) {
      newErrors.accountId = 'Bank account is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Add stationId to formData
      const submitData = {
        ...formData,
        stationId,
        amount: Number(formData.amount)
      };
      
      const success = await onSubmit(submitData);
      
      if (success) {
        // Reset form and close dialog
        handleReset();
        onClose();
      }
    } catch (err) {
      console.error('Error submitting replenishment:', err);
      setError('Error submitting replenishment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialState);
    setErrors({});
    setError(null);
  };

  // Handle close
  const handleDialogClose = () => {
    handleReset();
    onClose();
  };

  // Find selected account
  const selectedAccount = bankAccounts.find(account => account._id === formData.accountId);

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <MonetizationOn sx={{ mr: 1 }} />
          Replenish Petty Cash
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <FormControl 
          fullWidth 
          margin="dense" 
          error={!!errors.accountId}
          required
          disabled={loadingAccounts}
        >
          <InputLabel>Source Bank Account</InputLabel>
          <Select
            name="accountId"
            value={formData.accountId}
            onChange={handleChange}
            label="Source Bank Account"
          >
            {bankAccounts.map(account => (
              <MenuItem key={account._id} value={account._id}>
                {account.bankName} - {account.accountName} ({formatCurrency(account.currentBalance)})
              </MenuItem>
            ))}
          </Select>
          {errors.accountId && <FormHelperText>{errors.accountId}</FormHelperText>}
          {loadingAccounts && <FormHelperText>Loading accounts...</FormHelperText>}
        </FormControl>
        
        {selectedAccount && (
          <Box my={2} p={2} bgcolor="background.paper" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              Available Balance:
            </Typography>
            <Typography variant="h6" color="primary">
              {formatCurrency(selectedAccount.currentBalance)}
            </Typography>
          </Box>
        )}
        
        <TextField
          name="amount"
          label="Amount (LKR)"
          type="number"
          fullWidth
          value={formData.amount}
          onChange={handleChange}
          margin="dense"
          error={!!errors.amount}
          helperText={errors.amount || 'Amount to replenish the petty cash box'}
          inputProps={{ min: 0 }}
          required
        />
        
        <TextField
          name="description"
          label="Description"
          fullWidth
          value={formData.description}
          onChange={handleChange}
          margin="dense"
          error={!!errors.description}
          helperText={errors.description}
          required
        />
        
        <TextField
          name="date"
          label="Date"
          type="date"
          fullWidth
          value={formData.date}
          onChange={handleChange}
          margin="dense"
          error={!!errors.date}
          helperText={errors.date}
          InputLabelProps={{ shrink: true }}
          required
        />
        
        <TextField
          name="notes"
          label="Additional Notes"
          fullWidth
          value={formData.notes}
          onChange={handleChange}
          margin="dense"
          multiline
          rows={3}
          helperText="Optional notes about this replenishment"
        />
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleDialogClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting || loadingAccounts}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Replenish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReplenishmentDialog;