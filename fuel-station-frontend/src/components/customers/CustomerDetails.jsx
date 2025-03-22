// src/components/customers/CustomerDetails.jsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Grid,
  Button,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  DirectionsCar as CarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';

const CustomerDetails = ({ customer, onClose, onEdit, onDelete }) => {
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount || 0);
  };

  if (!customer) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No customer selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Customer Details</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Basic Info */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <PersonIcon sx={{ mr: 1 }} />
        {customer.name}
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Chip
          label={customer.type}
          color={
            customer.type === 'Corporate'
              ? 'primary'
              : customer.type === 'Government'
              ? 'secondary'
              : 'default'
          }
          sx={{ mr: 1 }}
        />
        <Chip
          label={customer.status}
          color={
            customer.status === 'Active'
              ? 'success'
              : customer.status === 'Inactive'
              ? 'default'
              : 'error'
          }
        />
      </Box>

      {/* Contact Info */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Contact Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography>
                {customer.contactInfo.address}, {customer.contactInfo.city}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography>{customer.contactInfo.phone}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography>{customer.contactInfo.email}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Credit Information - Corporate/Government only */}
      {(customer.type === 'Corporate' || customer.type === 'Government') && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CreditCardIcon sx={{ mr: 1 }} />
            Credit Information
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body1">Credit Limit:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {formatCurrency(customer.creditLimit)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1">Outstanding Balance:</Typography>
            <Typography variant="body1" fontWeight="bold" color="error">
              {formatCurrency(customer.outstandingBalance)}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Authorized Persons - Corporate/Government only */}
      {customer.authorizedPersons && customer.authorizedPersons.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Authorized Persons</Typography>
          {customer.authorizedPersons.map((person, index) => (
            <Box key={index} sx={{ mb: index !== customer.authorizedPersons.length - 1 ? 2 : 0 }}>
              <Typography variant="body1" fontWeight="medium">{person.name}</Typography>
              <Typography variant="body2" color="text.secondary">{person.position}</Typography>
              <Typography variant="body2">{person.contactNumber}</Typography>
              {person.email && <Typography variant="body2">{person.email}</Typography>}
              {index !== customer.authorizedPersons.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}
        </Paper>
      )}

      {/* Authorized Vehicles */}
      {customer.authorizedVehicles && customer.authorizedVehicles.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CarIcon sx={{ mr: 1 }} />
            Authorized Vehicles
          </Typography>
          {customer.authorizedVehicles.map((vehicle, index) => (
            <Box key={index} sx={{ mb: index !== customer.authorizedVehicles.length - 1 ? 2 : 0 }}>
              <Typography variant="body1" fontWeight="medium">{vehicle.vehicleNumber}</Typography>
              <Typography variant="body2" color="text.secondary">
                {vehicle.vehicleType}
                {vehicle.model && ` - ${vehicle.model}`}
                {vehicle.color && ` (${vehicle.color})`}
              </Typography>
              {index !== customer.authorizedVehicles.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}
        </Paper>
      )}

      {/* Notes */}
      {customer.notes && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Notes</Typography>
          <Typography variant="body2">{customer.notes}</Typography>
        </Paper>
      )}

      {/* Transaction History */}
      {customer.recentTransactions && customer.recentTransactions.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Recent Transactions</Typography>
          {customer.recentTransactions.map((transaction, index) => (
            <Box key={index} sx={{ mb: index !== customer.recentTransactions.length - 1 ? 2 : 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">{transaction.description}</Typography>
                <Typography 
                  variant="body1" 
                  fontWeight="medium"
                  color={transaction.type === 'sale' ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(transaction.amount)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {new Date(transaction.date).toLocaleDateString()}
              </Typography>
              {index !== customer.recentTransactions.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
};

export default CustomerDetails;