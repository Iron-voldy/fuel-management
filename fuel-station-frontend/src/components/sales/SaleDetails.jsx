// src/components/sales/SaleDetails.jsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Grid,
  Button,
  IconButton,
  Tooltip,
  CircularProgress
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
  CreditCard as CreditCardIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptIcon,
  LocalGasStation as GasIcon,
  EventNote as DateIcon,
  Note as NoteIcon,
  Refresh as RefreshIcon,
  MonetizationOn as MoneyIcon,
  Store as StoreIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

const SaleDetails = ({ saleData, formatCurrency, onEdit, onDelete, onClose, onRefresh }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle loading state
  if (!saleData) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>Loading sale details...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Sale Details</Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} size="small" sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Sale ID and Date */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.lighter', 
        borderRadius: 2,
        mb: 3
      }}>
        <Typography variant="body2" color="text.secondary">Sale ID</Typography>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {saleData.saleId || `#${saleData._id?.substring(0, 8)}` || 'N/A'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DateIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate(saleData.date)}
          </Typography>
        </Box>
      </Box>
      
      {/* Amount and Payment */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'success.lighter', 
        borderRadius: 2,
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Total Amount</Typography>
          <Typography variant="h4" color="success.main" fontWeight="medium">
            {formatCurrency(saleData.totalAmount)}
          </Typography>
        </Box>
        <Chip 
          label={saleData.paymentMethod} 
          color={saleData.paymentMethod === 'Cash' ? 'success' : 
                saleData.paymentMethod === 'Credit' ? 'warning' : 'primary'}
          size="medium"
          icon={<MoneyIcon />}
        />
      </Box>
      
      {/* Fuel Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <GasIcon sx={{ mr: 1, fontSize: 20 }} /> Fuel Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Fuel Type</Typography>
            <Typography variant="body1" fontWeight="medium">{saleData.fuelType || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Quantity</Typography>
            <Typography variant="body1" fontWeight="medium">
              {typeof saleData.quantity === 'number' ? saleData.quantity.toLocaleString() : saleData.quantity || 0} L
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Unit Price</Typography>
            <Typography variant="body1" fontWeight="medium">{formatCurrency(saleData.unitPrice)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Total</Typography>
            <Typography variant="body1" fontWeight="medium">{formatCurrency(saleData.totalAmount)}</Typography>
          </Grid>
        </Grid>
      </Box>
      
      {/* Station Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <StoreIcon sx={{ mr: 1, fontSize: 20 }} /> Station Information
        </Typography>
        <Typography variant="body1">
          {typeof saleData.stationId === 'object' && saleData.stationId ? 
            saleData.stationId.name : 
            saleData.stationName || `Station ID: ${saleData.stationId || 'N/A'}`}
        </Typography>
        {saleData.stationAddress && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <LocationIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {saleData.stationAddress}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Customer and Vehicle */}
      {(saleData.customerId || saleData.customerName || saleData.vehicleNumber) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, fontSize: 20 }} /> Customer Information
          </Typography>
          <Grid container spacing={2}>
            {(saleData.customerId || saleData.customerName) && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="body1">
                  {typeof saleData.customerId === 'object' && saleData.customerId ? 
                    saleData.customerId.name : 
                    saleData.customerName || `Customer ID: ${saleData.customerId || 'N/A'}`}
                </Typography>
                
                {saleData.customerId && typeof saleData.customerId === 'object' && saleData.customerId.contactInfo && (
                  <>
                    {saleData.customerId.contactInfo.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <PhoneIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {saleData.customerId.contactInfo.phone}
                        </Typography>
                      </Box>
                    )}
                    
                    {saleData.customerId.contactInfo.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <EmailIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {saleData.customerId.contactInfo.email}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Grid>
            )}
            
            {saleData.vehicleNumber && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Vehicle Number</Typography>
                <Typography variant="body1">
                  <CarIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
                  {saleData.vehicleNumber}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
      
      {/* Additional Payment Details */}
      {saleData.paymentMethod === 'Credit' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CreditCardIcon sx={{ mr: 1, fontSize: 20 }} /> Credit Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Credit Terms</Typography>
              <Typography variant="body1">
                {saleData.creditTerms || 'Standard Terms'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Due Date</Typography>
              <Typography variant="body1">
                {saleData.dueDate ? formatDate(saleData.dueDate) : 'N/A'}
              </Typography>
            </Grid>
            {saleData.invoiceNumber && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Invoice Number</Typography>
                <Typography variant="body1">{saleData.invoiceNumber}</Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
      
      {/* Notes */}
      {saleData.notes && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <NoteIcon sx={{ mr: 1, fontSize: 20 }} /> Notes
          </Typography>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {saleData.notes}
            </Typography>
          </Paper>
        </Box>
      )}
      
      {/* Actions */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button 
              variant="outlined" 
              fullWidth
              startIcon={<EditIcon />}
              onClick={onEdit}
            >
              Edit
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button 
              variant="outlined" 
              color="error" 
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={onDelete}
            >
              Delete
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Additional Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="text" 
          startIcon={<PrintIcon />}
          size="small"
        >
          Print Receipt
        </Button>
        <Button 
          variant="text" 
          startIcon={<ReceiptIcon />}
          size="small"
          color="primary"
        >
          Generate Invoice
        </Button>
      </Box>
      
      {/* Footer */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Created: {formatDate(saleData.createdAt)} • 
          Last Updated: {formatDate(saleData.updatedAt)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default SaleDetails;