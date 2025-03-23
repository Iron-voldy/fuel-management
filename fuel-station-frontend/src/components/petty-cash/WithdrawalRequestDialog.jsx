import React, { useState } from 'react';
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
import { MoneyOff } from '@mui/icons-material';

const WithdrawalRequestDialog = ({ open, onClose, onSubmit, stationId, currentBalance }) => {
  const initialState = {
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Available expense categories
  const categories = [
    'Stationery',
    'Cleaning',
    'Refreshments',
    'Maintenance',
    'Transport',
    'Utilities',
    'Miscellaneous'
  ];

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
    } else if (Number(formData.amount) > currentBalance) {
      newErrors.amount = 'Amount exceeds available balance';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
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
      console.error('Error submitting withdrawal request:', err);
      setError('Error submitting withdrawal request. Please try again.');
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

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <MoneyOff sx={{ mr: 1 }} />
          Request Petty Cash Withdrawal
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box mb={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Available Balance:
          </Typography>
          <Typography variant="h6" color="primary">
            {formatCurrency(currentBalance)}
          </Typography>
        </Box>
        
        <TextField
          name="amount"
          label="Amount (LKR)"
          type="number"
          fullWidth
          value={formData.amount}
          onChange={handleChange}
          margin="dense"
          error={!!errors.amount}
          helperText={errors.amount}
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
        
        <FormControl 
          fullWidth 
          margin="dense" 
          error={!!errors.category}
          required
        >
          <InputLabel>Category</InputLabel>
          <Select
            name="category"
            value={formData.category}
            onChange={handleChange}
            label="Category"
          >
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
          {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
        </FormControl>
        
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
        />
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleDialogClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WithdrawalRequestDialog;