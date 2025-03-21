import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  Grid,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PrintOutlined as PrintIcon,
  ReceiptLong as InvoiceIcon,
  LocalGasStation as GasIcon,
  EventNote as DateIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  AttachMoney as MoneyIcon,
  Note as NoteIcon
} from '@mui/icons-material';

const SaleDetails = ({ saleData, formatCurrency, onEdit, onDelete, onRefresh }) => {
  // Handle loading state
  if (!saleData) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Sale Details</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
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
          {saleData.saleId}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DateIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {new Date(saleData.date).toLocaleString()}
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
            <Typography variant="body1" fontWeight="medium">{saleData.fuelType}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Quantity</Typography>
            <Typography variant="body1" fontWeight="medium">{saleData.quantity.toLocaleString()} L</Typography>
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
      
      {/* Customer and Vehicle */}
      {(saleData.customerId || saleData.vehicleNumber) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, fontSize: 20 }} /> Customer Information
          </Typography>
          <Grid container spacing={2}>
            {saleData.customerId && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="body1">
                  {saleData.customerId.name || 'N/A'}
                </Typography>
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
      
      {/* Notes */}
      {saleData.notes && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <NoteIcon sx={{ mr: 1, fontSize: 20 }} /> Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {saleData.notes}
          </Typography>
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
          startIcon={<InvoiceIcon />}
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
          Created: {new Date(saleData.createdAt).toLocaleDateString()} • 
          Last Updated: {new Date(saleData.updatedAt).toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default SaleDetails;