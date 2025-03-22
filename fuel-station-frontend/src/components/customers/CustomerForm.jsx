// src/components/customers/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  Typography,
  IconButton,
  Divider,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  AddCircle as AddCircleIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon
} from '@mui/icons-material';

// Import custom hooks and validators
import useFormValidation from '../../hooks/useFormValidation';
import customerValidator from '../../validators/customerValidator';

const CustomerForm = ({ customer, onSubmit, onCancel }) => {
  // Initial form values - use customer data if editing, or default values if adding
  const initialFormValues = customer ? {
    name: customer.name || '',
    type: customer.type || 'Individual',
    contactInfo: {
      address: customer.contactInfo?.address || '',
      city: customer.contactInfo?.city || '',
      phone: customer.contactInfo?.phone || '',
      email: customer.contactInfo?.email || ''
    },
    status: customer.status || 'Active',
    creditLimit: customer.creditLimit || '',
    notes: customer.notes || '',
    authorizedPersons: customer.authorizedPersons || [],
    authorizedVehicles: customer.authorizedVehicles || []
  } : {
    name: '',
    type: 'Individual',
    contactInfo: {
      address: '',
      city: '',
      phone: '',
      email: ''
    },
    status: 'Active',
    creditLimit: '',
    notes: '',
    authorizedPersons: [],
    authorizedVehicles: []
  };

  // States for loading and errors
  const [submitError, setSubmitError] = useState(null);

  // Set up form validation using our custom hook
  const {
    formData,
    errors,
    isSubmitting,
    isValid,
    handleChange,
    handleNestedChange,
    handleArrayChange,
    handleBlur,
    handleNestedBlur,
    handleArrayBlur,
    handleSubmit,
    setFieldValue,
    hasError,
    getError
  } = useFormValidation(
    initialFormValues,
    customerValidator.validateCustomerForm,
    customerValidator.validateCustomerField,
    async (validatedData) => {
      try {
        setSubmitError(null);
        await onSubmit(validatedData);
      } catch (error) {
        console.error('Error submitting customer form:', error);
        setSubmitError(error.message || 'Failed to save customer data');
        throw error; // Re-throw to let the hook know submission failed
      }
    }
  );

  // Add a new authorized person
  const handleAddAuthorizedPerson = () => {
    const newPersons = [...(formData.authorizedPersons || []), {
      name: '',
      position: '',
      contactNumber: '',
      email: ''
    }];
    setFieldValue('authorizedPersons', newPersons);
  };

  // Remove an authorized person
  const handleRemoveAuthorizedPerson = (index) => {
    const newPersons = [...formData.authorizedPersons];
    newPersons.splice(index, 1);
    setFieldValue('authorizedPersons', newPersons);
  };

  // Add a new authorized vehicle
  const handleAddAuthorizedVehicle = () => {
    const newVehicles = [...(formData.authorizedVehicles || []), {
      vehicleNumber: '',
      vehicleType: '',
      model: '',
      color: ''
    }];
    setFieldValue('authorizedVehicles', newVehicles);
  };

  // Remove an authorized vehicle
  const handleRemoveAuthorizedVehicle = (index) => {
    const newVehicles = [...formData.authorizedVehicles];
    newVehicles.splice(index, 1);
    setFieldValue('authorizedVehicles', newVehicles);
  };

  // Handle form submission
  const submitForm = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  // Special handling for nested fields in the contactInfo object
  const handleContactInfoChange = (e) => {
    const { name, value } = e.target;
    handleNestedChange(`contactInfo.${name}`, value);
  };

  const handleContactInfoBlur = (e) => {
    const { name, value } = e.target;
    handleNestedBlur(`contactInfo.${name}`, value);
  };

  // Get error message for nested fields
  const getContactInfoError = (fieldName) => {
    return errors.contactInfo && errors.contactInfo[fieldName];
  };

  return (
    <form onSubmit={submitForm}>
      <DialogTitle>
        {customer ? 'Edit Customer' : 'Add New Customer'}
      </DialogTitle>
      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Basic Information Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} /> Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {/* Customer Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Customer Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={hasError('name')}
              helperText={getError('name')}
              required
            />
          </Grid>

          {/* Customer Type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={hasError('type')}>
              <InputLabel>Customer Type</InputLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Customer Type"
              >
                <MenuItem value="Individual">Individual</MenuItem>
                <MenuItem value="Corporate">Corporate</MenuItem>
                <MenuItem value="Government">Government</MenuItem>
              </Select>
              {hasError('type') && <FormHelperText>{getError('type')}</FormHelperText>}
            </FormControl>
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={hasError('status')}>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Blacklisted">Blacklisted</MenuItem>
              </Select>
              {hasError('status') && <FormHelperText>{getError('status')}</FormHelperText>}
            </FormControl>
          </Grid>

          {/* Credit Limit (only for Corporate/Government) */}
          {(formData.type === 'Corporate' || formData.type === 'Government') && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Credit Limit (LKR)"
                name="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={handleChange}
                onBlur={handleBlur}
                error={hasError('creditLimit')}
                helperText={getError('creditLimit')}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>LKR</span>,
                }}
                required={formData.type === 'Corporate' || formData.type === 'Government'}
              />
            </Grid>
          )}

          {/* Contact Information Section */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Contact Information</Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={formData.contactInfo.address}
              onChange={handleContactInfoChange}
              onBlur={handleContactInfoBlur}
              error={!!getContactInfoError('address')}
              helperText={getContactInfoError('address')}
              required
            />
          </Grid>

          {/* City */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.contactInfo.city}
              onChange={handleContactInfoChange}
              onBlur={handleContactInfoBlur}
              error={!!getContactInfoError('city')}
              helperText={getContactInfoError('city')}
              required
            />
          </Grid>

          {/* Phone */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.contactInfo.phone}
              onChange={handleContactInfoChange}
              onBlur={handleContactInfoBlur}
              error={!!getContactInfoError('phone')}
              helperText={getContactInfoError('phone')}
              required
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.contactInfo.email}
              onChange={handleContactInfoChange}
              onBlur={handleContactInfoBlur}
              error={!!getContactInfoError('email')}
              helperText={getContactInfoError('email')}
              required
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </Grid>

          {/* Authorized Persons (only for Corporate/Government) */}
          {(formData.type === 'Corporate' || formData.type === 'Government') && (
            <>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Authorized Persons</Typography>
                  <Button
                    startIcon={<AddCircleIcon />}
                    onClick={handleAddAuthorizedPerson}
                    size="small"
                  >
                    Add Person
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              {formData.authorizedPersons && formData.authorizedPersons.map((person, index) => (
                <Grid item xs={12} key={`person-${index}`}>
                  <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2">Person #{index + 1}</Typography>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveAuthorizedPerson(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Name"
                          value={person.name}
                          onChange={(e) => handleArrayChange('authorizedPersons', index, 'name', e.target.value)}
                          onBlur={(e) => handleArrayBlur('authorizedPersons', index, 'name', e.target.value)}
                          error={errors.authorizedPersons && errors.authorizedPersons[index] && !!errors.authorizedPersons[index].name}
                          helperText={errors.authorizedPersons && errors.authorizedPersons[index] && errors.authorizedPersons[index].name}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Position"
                          value={person.position}
                          onChange={(e) => handleArrayChange('authorizedPersons', index, 'position', e.target.value)}
                          onBlur={(e) => handleArrayBlur('authorizedPersons', index, 'position', e.target.value)}
                          error={errors.authorizedPersons && errors.authorizedPersons[index] && !!errors.authorizedPersons[index].position}
                          helperText={errors.authorizedPersons && errors.authorizedPersons[index] && errors.authorizedPersons[index].position}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Contact Number"
                          value={person.contactNumber}
                          onChange={(e) => handleArrayChange('authorizedPersons', index, 'contactNumber', e.target.value)}
                          onBlur={(e) => handleArrayBlur('authorizedPersons', index, 'contactNumber', e.target.value)}
                          error={errors.authorizedPersons && errors.authorizedPersons[index] && !!errors.authorizedPersons[index].contactNumber}
                          helperText={errors.authorizedPersons && errors.authorizedPersons[index] && errors.authorizedPersons[index].contactNumber}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={person.email || ''}
                          onChange={(e) => handleArrayChange('authorizedPersons', index, 'email', e.target.value)}
                          onBlur={(e) => handleArrayBlur('authorizedPersons', index, 'email', e.target.value)}
                          error={errors.authorizedPersons && errors.authorizedPersons[index] && !!errors.authorizedPersons[index].email}
                          helperText={errors.authorizedPersons && errors.authorizedPersons[index] && errors.authorizedPersons[index].email}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              ))}
            </>
          )}

          {/* Authorized Vehicles */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                <CarIcon sx={{ mr: 1 }} /> Authorized Vehicles
              </Typography>
              <Button
                startIcon={<AddCircleIcon />}
                onClick={handleAddAuthorizedVehicle}
                size="small"
              >
                Add Vehicle
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {formData.authorizedVehicles && formData.authorizedVehicles.map((vehicle, index) => (
            <Grid item xs={12} key={`vehicle-${index}`}>
              <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">Vehicle #{index + 1}</Typography>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleRemoveAuthorizedVehicle(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vehicle Number"
                      placeholder="ABC-1234"
                      value={vehicle.vehicleNumber}
                      onChange={(e) => handleArrayChange('authorizedVehicles', index, 'vehicleNumber', e.target.value)}
                      onBlur={(e) => handleArrayBlur('authorizedVehicles', index, 'vehicleNumber', e.target.value)}
                      error={errors.authorizedVehicles && errors.authorizedVehicles[index] && !!errors.authorizedVehicles[index].vehicleNumber}
                      helperText={errors.authorizedVehicles && errors.authorizedVehicles[index] && errors.authorizedVehicles[index].vehicleNumber}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vehicle Type"
                      value={vehicle.vehicleType}
                      onChange={(e) => handleArrayChange('authorizedVehicles', index, 'vehicleType', e.target.value)}
                      onBlur={(e) => handleArrayBlur('authorizedVehicles', index, 'vehicleType', e.target.value)}
                      error={errors.authorizedVehicles && errors.authorizedVehicles[index] && !!errors.authorizedVehicles[index].vehicleType}
                      helperText={errors.authorizedVehicles && errors.authorizedVehicles[index] && errors.authorizedVehicles[index].vehicleType}
                      required
                      select
                    >
                      <MenuItem value="Car">Car</MenuItem>
                      <MenuItem value="Van">Van</MenuItem>
                      <MenuItem value="Bus">Bus</MenuItem>
                      <MenuItem value="Truck">Truck</MenuItem>
                      <MenuItem value="Motorcycle">Motorcycle</MenuItem>
                      <MenuItem value="Heavy Vehicle">Heavy Vehicle</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Model"
                      value={vehicle.model || ''}
                      onChange={(e) => handleArrayChange('authorizedVehicles', index, 'model', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Color"
                      value={vehicle.color || ''}
                      onChange={(e) => handleArrayChange('authorizedVehicles', index, 'color', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={24} />
          ) : customer ? (
            'Update Customer'
          ) : (
            'Add Customer'
          )}
        </Button>
      </DialogActions>
    </form>
  );
};

export default CustomerForm;