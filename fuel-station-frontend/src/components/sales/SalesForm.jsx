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
  Tooltip // Add Tooltip import here
} from '@mui/material';
import {
  LocalGasStation as GasIcon,
  ReceiptLong as ReceiptIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';

const SalesForm = ({ sale, onSubmit, onCancel, api }) => {
  const initialFormState = {
    fuelType: '',
    quantity: '',
    unitPrice: '',
    totalAmount: '',
    paymentMethod: 'Cash',
    customerId: '',
    vehicleNumber: '',
    date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDThh:mm
    notes: '',
    stationId: '' // Added stationId field
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [currentFuelPrices, setCurrentFuelPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await api.get('/customers');
      if (res.data && res.data.data) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch current fuel prices
  const fetchCurrentPrices = async () => {
    try {
      setLoadingPrices(true);
      const res = await api.get('/inventory');
      if (res.data && res.data.data) {
        // Create a map of fuel types to their current selling prices
        const priceMap = {};
        res.data.data.forEach(item => {
          priceMap[item.fuelType] = item.sellingPrice;
        });
        setCurrentFuelPrices(priceMap);
      }
    } catch (err) {
      console.error('Error fetching fuel prices:', err);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Fetch stations
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);

  const fetchStations = async () => {
    try {
      setLoadingStations(true);
      const res = await api.get('/stations');
      if (res.data && res.data.data) {
        setStations(res.data.data);
        
        // If there's only one station, automatically select it
        if (res.data.data.length === 1) {
          setFormData(prevState => ({
            ...prevState,
            stationId: res.data.data[0]._id
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching stations:', err);
    } finally {
      setLoadingStations(false);
    }
  };

  // Populate form with sale data when editing
  useEffect(() => {
    if (sale) {
      setFormData({
        fuelType: sale.fuelType || '',
        quantity: sale.quantity || '',
        unitPrice: sale.unitPrice || '',
        totalAmount: sale.totalAmount || '',
        paymentMethod: sale.paymentMethod || 'Cash',
        customerId: sale.customerId || '',
        vehicleNumber: sale.vehicleNumber || '',
        date: new Date(sale.date).toISOString().slice(0, 16) || new Date().toISOString().slice(0, 16),
        notes: sale.notes || '',
        stationId: sale.stationId || ''
      });
    } else {
      setFormData(initialFormState);
    }

    // Fetch customers, fuel prices, and stations when component mounts
    fetchCustomers();
    fetchCurrentPrices();
    fetchStations();
  }, [sale]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field when changed
    setErrors({
      ...errors,
      [name]: undefined
    });
    
    // Special handling for quantity and unit price to auto-calculate total
    if (name === 'quantity' || name === 'unitPrice') {
      const quantity = name === 'quantity' ? parseFloat(value) : parseFloat(formData.quantity || 0);
      const unitPrice = name === 'unitPrice' ? parseFloat(value) : parseFloat(formData.unitPrice || 0);
      
      if (!isNaN(quantity) && !isNaN(unitPrice)) {
        const totalAmount = (quantity * unitPrice).toFixed(2);
        setFormData({
          ...formData,
          [name]: value,
          totalAmount
        });
      } else {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle fuel type change to auto-populate unit price
  const handleFuelTypeChange = (e) => {
    const fuelType = e.target.value;
    setFormData({
      ...formData,
      fuelType,
      unitPrice: currentFuelPrices[fuelType] || ''
    });
    
    // Clear error
    setErrors({
      ...errors,
      fuelType: undefined
    });
    
    // If quantity is already set, recalculate total amount
    if (formData.quantity) {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = currentFuelPrices[fuelType] || 0;
      
      if (!isNaN(quantity) && unitPrice > 0) {
        const totalAmount = (quantity * unitPrice).toFixed(2);
        setFormData(prev => ({
          ...prev,
          fuelType,
          unitPrice,
          totalAmount
        }));
      }
    }
  };

  // Handle customer change
  const handleCustomerChange = (event, newValue) => {
    setFormData({
      ...formData,
      customerId: newValue ? newValue._id : '',
      // If customer has vehicles, pre-fill first vehicle
      vehicleNumber: newValue && newValue.authorizedVehicles && newValue.authorizedVehicles.length > 0 
        ? newValue.authorizedVehicles[0].vehicleNumber 
        : formData.vehicleNumber
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fuelType) {
      newErrors.fuelType = 'Fuel type is required';
    }
    
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    
    if (!formData.unitPrice) {
      newErrors.unitPrice = 'Unit price is required';
    } else if (isNaN(parseFloat(formData.unitPrice)) || parseFloat(formData.unitPrice) <= 0) {
      newErrors.unitPrice = 'Unit price must be a positive number';
    }
    
    if (!formData.totalAmount) {
      newErrors.totalAmount = 'Total amount is required';
    } else if (isNaN(parseFloat(formData.totalAmount)) || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Total amount must be a positive number';
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    if (formData.paymentMethod === 'Credit' && !formData.customerId) {
      newErrors.customerId = 'Customer is required for credit sales';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date and time are required';
    }
    
    if (!formData.stationId) {
      newErrors.stationId = 'Station ID is required';
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
        // Convert numeric values
        const submissionData = {
          ...formData,
          quantity: parseFloat(formData.quantity),
          unitPrice: parseFloat(formData.unitPrice),
          totalAmount: parseFloat(formData.totalAmount),
          // Convert local datetime to ISO string
          date: new Date(formData.date).toISOString()
        };
        
        await onSubmit(submissionData);
      } catch (error) {
        console.error('Error submitting sale:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fuel type options
  const fuelTypes = [
    'Petrol 92',
    'Petrol 95',
    'Auto Diesel',
    'Super Diesel',
    'Kerosene'
  ];

  // Payment method options
  const paymentMethods = [
    'Cash',
    'BankCard',
    'BankTransfer',
    'Credit',
    'Other'
  ];

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <>
      <DialogTitle>
        {sale ? 'Edit Sale Record' : 'Add New Sale'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Fuel Type */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Fuel Type"
                name="fuelType"
                value={formData.fuelType}
                onChange={handleFuelTypeChange}
                error={!!errors.fuelType}
                helperText={errors.fuelType}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <GasIcon />
                    </InputAdornment>
                  ),
                }}
                disabled={loading || loadingPrices}
              >
                {loadingPrices ? (
                  <MenuItem disabled>Loading fuel types...</MenuItem>
                ) : (
                  fuelTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type} {currentFuelPrices[type] ? `(${formatCurrency(currentFuelPrices[type])}/L)` : ''}
                    </MenuItem>
                  ))
                )}
              </TextField>
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
                error={!!errors.quantity}
                helperText={errors.quantity}
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
                error={!!errors.unitPrice}
                helperText={errors.unitPrice}
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
                error={!!errors.totalAmount}
                helperText={errors.totalAmount}
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
                              setFormData({
                                ...formData,
                                totalAmount
                              });
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
              <TextField
                select
                fullWidth
                label="Payment Method"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                error={!!errors.paymentMethod}
                helperText={errors.paymentMethod}
                required
                variant="outlined"
                disabled={loading}
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method} value={method}>{method}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            {/* Customer (Optional, required for Credit) */}
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
                    label="Customer"
                    error={!!errors.customerId}
                    helperText={errors.customerId}
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
              {formData.paymentMethod === 'Credit' && (
                <FormHelperText>Required for credit sales</FormHelperText>
              )}
            </Grid>
            
            {/* Vehicle Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vehicle Number"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                variant="outlined"
                placeholder="e.g. ABC-1234"
                disabled={loading}
              />
            </Grid>
            
            {/* Date and Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date and Time"
                name="date"
                type="datetime-local"
                value={formData.date}
                onChange={handleChange}
                error={!!errors.date}
                helperText={errors.date}
                required
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>
            
            {/* Station */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Station"
                name="stationId"
                value={formData.stationId}
                onChange={handleChange}
                error={!!errors.stationId}
                helperText={errors.stationId}
                required
                variant="outlined"
                disabled={loading || loadingStations}
              >
                {loadingStations ? (
                  <MenuItem disabled>Loading stations...</MenuItem>
                ) : (
                  stations.map((station) => (
                    <MenuItem key={station._id} value={station._id}>
                      {station.name}
                    </MenuItem>
                  ))
                )}
              </TextField>
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <ReceiptIcon />}
          >
            {loading ? 'Saving...' : (sale ? 'Update Sale' : 'Record Sale')}
          </Button>
        </DialogActions>
      </form>
    </>
  );
};

export default SalesForm;