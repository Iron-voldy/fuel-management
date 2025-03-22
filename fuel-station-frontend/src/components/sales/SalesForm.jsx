// src/components/sales/SalesForm.jsx
import React, { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  InputAdornment,
  Typography,
  Divider,
  Autocomplete,
  Box,
  CircularProgress,
  FormHelperText,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  LocalGasStation as GasIcon,
  ReceiptLong as ReceiptIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import salesValidator from '../../validators/salesValidator';

const SalesForm = ({ sale, onSubmit, onCancel, api }) => {
  // Helper functions for displaying validation state
  const hasError = (field) => touched[field] && !!errors[field];
  const getError = (field) => (touched[field] && errors[field]) || '';
  
  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const initialFormState = {
    fuelType: '',
    quantity: '',
    unitPrice: '',
    totalAmount: '',
    paymentMethod: 'Cash',
    customerId: '',
    vehicleNumber: '',
    date: new Date().toISOString(),
    notes: '',
    stationId: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [touched, setTouched] = useState({});
  
  // Reference data
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);

  // Define fuel types
  const fuelTypes = [
    'Petrol 92',
    'Petrol 95',
    'Auto Diesel',
    'Super Diesel',
    'Kerosene'
  ];

  // Define payment methods
  const paymentMethods = [
    'Cash',
    'Card',
    'Credit',
    'Bank Transfer',
    'Other'
  ];

  // Fetch reference data
  useEffect(() => {
    fetchCustomers();
    fetchCurrentPrices();
    fetchStations();

    // If editing, populate form with sale data
    if (sale) {
      const formattedSale = {
        ...sale,
        date: new Date(sale.date).toISOString()
      };
      setFormData(formattedSale);
      
      // Mark all fields as touched for validation
      const allTouched = Object.keys(formattedSale).reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      
      setTouched(allTouched);
    }
  }, [sale, api]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Mark field as touched
    setTouched(prevTouched => ({
      ...prevTouched,
      [name]: true
    }));
    
    // Clear error for this field when changed
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: undefined
      }));
    }
    
    // Special handling for quantity and unit price to auto-calculate total
    if (name === 'quantity' || name === 'unitPrice') {
      const quantity = name === 'quantity' ? parseFloat(value) : parseFloat(formData.quantity || 0);
      const unitPrice = name === 'unitPrice' ? parseFloat(value) : parseFloat(formData.unitPrice || 0);
      
      if (!isNaN(quantity) && !isNaN(unitPrice)) {
        const totalAmount = (quantity * unitPrice).toFixed(2);
        setFormData(prevData => ({
          ...prevData,
          [name]: value,
          totalAmount
        }));
        
        // Mark totalAmount as touched
        setTouched(prevTouched => ({
          ...prevTouched,
          totalAmount: true
        }));
      }
    }
  };

  // Handle fuel type change to auto-populate unit price
  const handleFuelTypeChange = (e) => {
    const fuelType = e.target.value;
    
    // Update fuel type
    setFormData(prevData => ({
      ...prevData,
      fuelType
    }));
    
    // Mark field as touched
    setTouched(prevTouched => ({
      ...prevTouched,
      fuelType: true
    }));
    
    // Clear error
    if (errors.fuelType) {
      setErrors(prevErrors => ({
        ...prevErrors,
        fuelType: undefined
      }));
    }
    
    // Auto-populate unit price if available
    if (currentPrices[fuelType]) {
      const unitPrice = currentPrices[fuelType];
      
      setFormData(prevData => ({
        ...prevData,
        unitPrice
      }));
      
      // If quantity is already set, recalculate total amount
      if (formData.quantity && !isNaN(parseFloat(formData.quantity))) {
        const quantity = parseFloat(formData.quantity);
        const totalAmount = (quantity * unitPrice).toFixed(2);
        
        setFormData(prevData => ({
          ...prevData,
          fuelType,
          unitPrice,
          totalAmount
        }));
        
        // Mark these fields as touched
        setTouched(prevTouched => ({
          ...prevTouched,
          unitPrice: true,
          totalAmount: true
        }));
      } else {
        setFormData(prevData => ({
          ...prevData,
          fuelType,
          unitPrice
        }));
        
        // Mark unit price as touched
        setTouched(prevTouched => ({
          ...prevTouched,
          unitPrice: true
        }));
      }
    }
  };
  
  // Handle date change
  const handleDateChange = (date) => {
    setFormData(prevData => ({
      ...prevData,
      date: date ? date.toISOString() : null
    }));
    
    // Mark field as touched
    setTouched(prevTouched => ({
      ...prevTouched,
      date: true
    }));
    
    // Clear error
    if (errors.date) {
      setErrors(prevErrors => ({
        ...prevErrors,
        date: undefined
      }));
    }
  };
  
  // Handle customer change
  const handleCustomerChange = (event, newValue) => {
    setFormData(prevData => ({
      ...prevData,
      customerId: newValue ? newValue._id : '',
      
      // If customer has vehicles, pre-fill first vehicle
      vehicleNumber: newValue && newValue.authorizedVehicles && newValue.authorizedVehicles.length > 0 
        ? newValue.authorizedVehicles[0].vehicleNumber 
        : prevData.vehicleNumber
    }));
    
    // Mark field as touched
    setTouched(prevTouched => ({
      ...prevTouched,
      customerId: true,
      vehicleNumber: true
    }));
    
    // Clear errors
    setErrors(prevErrors => ({
      ...prevErrors,
      customerId: undefined,
      vehicleNumber: undefined
    }));
  };
  
  // Handle field blur for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    setTouched(prevTouched => ({
      ...prevTouched,
      [name]: true
    }));
    
    // Validate field
    const errorMessage = salesValidator.validateSalesField(name, value, formData);
    
    if (errorMessage) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: errorMessage
      }));
    }
  };
  
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await api.get('/customers');
      if (response.data && response.data.data) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };
  
  // Function to validate the entire form
  const validateForm = () => {
    const validationResult = salesValidator.validateSalesForm(formData);
    
    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      
      // Mark all fields as touched
      const allTouched = Object.keys(formData).reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      
      setTouched(allTouched);
    }
    
    return validationResult.isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setSubmitError(null);
      
      // Convert data types
      const submissionData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        totalAmount: parseFloat(formData.totalAmount),
        // Ensure date is in ISO format
        date: formData.date instanceof Date ? formData.date.toISOString() : formData.date
      };
      
      // Submit the form data
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error.message || 'Failed to save sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stations
  const fetchStations = async () => {
    try {
      setLoadingStations(true);
      const response = await api.get('/stations');
      if (response.data && response.data.data) {
        setStations(response.data.data);
        
        // If there's only one station, automatically select it
        if (response.data.data.length === 1 && !formData.stationId) {
          setFormData(prevState => ({
            ...prevState,
            stationId: response.data.data[0]._id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoadingStations(false);
    }
  };

  // Fetch current fuel prices
  const fetchCurrentPrices = async () => {
    try {
      setLoadingPrices(true);
      const response = await api.get('/inventory');
      if (response.data && response.data.data) {
        // Create a map of fuel types to their current selling prices
        const priceMap = {};
        response.data.data.forEach(item => {
          priceMap[item.fuelType] = item.sellingPrice;
        });
        setCurrentPrices(priceMap);
      }
    } catch (error) {
      console.error('Error fetching fuel prices:', error);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Render the form
  return (
    <>
      <DialogTitle>
        {sale ? 'Edit Sale Record' : 'Record New Sale'}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
              {submitError}
            </Alert>
          )}
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Fuel Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={hasError('fuelType')}>
                <InputLabel id="fuel-type-label">Fuel Type</InputLabel>
                <Select
                  labelId="fuel-type-label"
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleFuelTypeChange}
                  onBlur={handleBlur}
                  label="Fuel Type"
                  startAdornment={
                    <InputAdornment position="start">
                      <GasIcon />
                    </InputAdornment>
                  }
                  disabled={loading || loadingPrices}
                >
                  <MenuItem value="" disabled>Select Fuel Type</MenuItem>
                  {fuelTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type} {currentPrices[type] ? `(${formatCurrency(currentPrices[type])}/L)` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {hasError('fuelType') && <FormHelperText>{getError('fuelType')}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {/* Quantity */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity (Liters)"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                onBlur={handleBlur}
                error={hasError('quantity')}
                helperText={getError('quantity')}
                required
                inputProps={{ step: "0.01", min: "0" }}
                variant="outlined"
                placeholder="e.g. 10.5"
                disabled={loading}
              />
            </Grid>
            
            {/* Unit Price */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unit Price"
                name="unitPrice"
                type="number"
                value={formData.unitPrice}
                onChange={handleChange}
                onBlur={handleBlur}
                error={hasError('unitPrice')}
                helperText={getError('unitPrice')}
                required
                inputProps={{ step: "0.01", min: "0" }}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                }}
                disabled={loading}
              />
            </Grid>
            
            {/* Total Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Amount"
                name="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={handleChange}
                onBlur={handleBlur}
                error={hasError('totalAmount')}
                helperText={getError('totalAmount')}
                required
                inputProps={{ step: "0.01", min: "0" }}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Calculate">
                        <CalculateIcon 
                          color="action" 
                          fontSize="small" 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            const quantity = parseFloat(formData.quantity || 0);
                            const unitPrice = parseFloat(formData.unitPrice || 0);
                            
                            if (!isNaN(quantity) && !isNaN(unitPrice)) {
                              const totalAmount = (quantity * unitPrice).toFixed(2);
                              
                              setFormData(prevData => ({
                                ...prevData,
                                totalAmount
                              }));
                              
                              setTouched(prevTouched => ({
                                ...prevTouched,
                                totalAmount: true
                              }));
                              
                              if (errors.totalAmount) {
                                setErrors(prevErrors => ({
                                  ...prevErrors,
                                  totalAmount: undefined
                                }));
                              }
                            }
                          }}
                        />
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                disabled={loading}
              />
            </Grid>
            
            {/* Payment Method */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={hasError('paymentMethod')}>
                <InputLabel id="payment-method-label">Payment Method</InputLabel>
                <Select
                  labelId="payment-method-label"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  label="Payment Method"
                  disabled={loading}
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method} value={method}>{method}</MenuItem>
                  ))}
                </Select>
                {hasError('paymentMethod') && <FormHelperText>{getError('paymentMethod')}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {/* Customer (Required for Credit) */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => option.name || ''}
                onChange={handleCustomerChange}
                loading={loadingCustomers}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                value={customers.find(c => c._id === formData.customerId) || null}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={formData.paymentMethod === 'Credit' ? "Customer (Required)" : "Customer (Optional)"}
                    error={hasError('customerId')}
                    helperText={getError('customerId')}
                    required={formData.paymentMethod === 'Credit'}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                disabled={loading}
              />
              {formData.paymentMethod === 'Credit' && !hasError('customerId') && (
                <FormHelperText>Customer is required for credit sales</FormHelperText>
              )}
            </Grid>
            
            {/* Vehicle Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vehicle Number"
                name="vehicleNumber"
                value={formData.vehicleNumber || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={hasError('vehicleNumber')}
                helperText={getError('vehicleNumber')}
                variant="outlined"
                placeholder="e.g. ABC-1234"
                disabled={loading}
              />
            </Grid>
            
            {/* Date and Time */}
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Date and Time"
                value={formData.date ? new Date(formData.date) : null}
                onChange={handleDateChange}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    error: hasError('date'),
                    helperText: getError('date'),
                    required: true,
                    onBlur: () => {
                      setTouched(prev => ({...prev, date: true}));
                    }
                  } 
                }}
                disabled={loading}
              />
            </Grid>
            
            {/* Station */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={hasError('stationId')}>
                <InputLabel id="station-label">Station</InputLabel>
                <Select
                  labelId="station-label"
                  name="stationId"
                  value={formData.stationId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  label="Station"
                  disabled={loading || loadingStations}
                >
                  <MenuItem value="" disabled>Select Station</MenuItem>
                  {stations.map((station) => (
                    <MenuItem key={station._id} value={station._id}>
                      {station.name}
                    </MenuItem>
                  ))}
                </Select>
                {hasError('stationId') && <FormHelperText>{getError('stationId')}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                multiline
                rows={3}
                variant="outlined"
                placeholder="Additional details about this sale"
                disabled={loading}
              />
            </Grid>
          </Grid>
          
          {formData.fuelType && formData.quantity && formData.unitPrice && formData.totalAmount && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  You are recording a sale of {formData.quantity} liters of {formData.fuelType} at {formatCurrency(formData.unitPrice)}/L
                  for a total of {formatCurrency(formData.totalAmount)}, paid by {formData.paymentMethod}.
                </Typography>
              </Alert>
            </Box>
          )}
          
          {sale && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(sale.createdAt).toLocaleString()} • 
                Last Updated: {new Date(sale.updatedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <ReceiptIcon />}
        >
          {loading ? 'Saving...' : (sale ? 'Update Sale' : 'Record Sale')}
        </Button>
      </DialogActions>
    </>
  );
};

export default SalesForm;