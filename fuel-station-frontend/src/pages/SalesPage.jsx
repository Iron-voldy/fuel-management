// src/pages/SalesPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Divider,
  Breadcrumbs,
  Link,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { 
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  LocalGasStation as GasStationIcon,
  Home as HomeIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AuthContext from '../context/AuthContext';
import SalesForm from '../components/sales/SalesForm';
import SaleDetails from '../components/sales/SaleDetails';
import salesValidator from '../validators/salesValidator';

const SalesPage = () => {
  const { api } = useContext(AuthContext);
  
  // State for sales data
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // State for dialog forms
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSales, setTotalSales] = useState(0);
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFuelType, setFilterFuelType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateRange, setFilterDateRange] = useState({
    startDate: null,
    endDate: null
  });
  
  // State for snackbar
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // State for summary data
  const [summaryData, setSummaryData] = useState({
    totalSales: 0,
    totalAmount: 0,
    totalQuantity: 0,
    averageSaleAmount: 0
  });

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

  // Fetch sales data
  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare query parameters
      const params = {
        page,
        limit: rowsPerPage
      };
      
      // Add search and filter params
      if (searchTerm) params.search = searchTerm;
      if (filterFuelType) params.fuelType = filterFuelType;
      if (filterPaymentMethod) params.paymentMethod = filterPaymentMethod;
      if (filterDateRange.startDate) params.startDate = filterDateRange.startDate.toISOString();
      if (filterDateRange.endDate) params.endDate = filterDateRange.endDate.toISOString();
      
      const response = await api.get('/sales', { params });
      
      if (response.data && response.data.data) {
        setSales(response.data.data);
        setTotalSales(response.data.total || response.data.data.length);
      } else {
        throw new Error('Invalid response structure');
      }

      // Fetch summary data
      const summaryResponse = await api.get('/sales/summary');
      if (summaryResponse.data && summaryResponse.data.data) {
        setSummaryData(summaryResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err.response?.data?.error || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sale details
  const fetchSaleDetails = async (saleId) => {
    try {
      setLoading(true);
      const response = await api.get(`/sales/${saleId}`);
      
      if (response.data && response.data.data) {
        setSelectedSale(response.data.data);
        setDetailsOpen(true);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error fetching sale details:', err);
      setNotification({
        open: true,
        message: 'Failed to load sale details',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchSales();
  }, [page, rowsPerPage, searchTerm, filterFuelType, filterPaymentMethod, filterDateRange]);

  // Handle opening add dialog
  const handleOpenAddDialog = () => {
    setCurrentSale(null);
    setOpenAddDialog(true);
  };

  // Handle opening edit dialog
  const handleOpenEditDialog = (sale) => {
    setCurrentSale(sale);
    setOpenEditDialog(true);
  };

  // Handle opening delete dialog
  const handleOpenDeleteDialog = (sale) => {
    setCurrentSale(sale);
    setOpenDeleteDialog(true);
  };

  // Handle form submission (add)
  const handleAddSale = async (formData) => {
    try {
      // Validate form data
      const validationResult = salesValidator.validateSalesForm(formData);
      
      if (!validationResult.isValid) {
        throw new Error(Object.values(validationResult.errors)[0]);
      }
      
      const response = await api.post('/sales', formData);
      
      if (response.data && response.data.success) {
        setNotification({
          open: true,
          message: 'Sale recorded successfully',
          severity: 'success'
        });
        setOpenAddDialog(false);
        fetchSales(); // Refresh sales data
      } else {
        throw new Error(response.data?.error || 'Failed to record sale');
      }
    } catch (err) {
      console.error('Error recording sale:', err);
      setNotification({
        open: true,
        message: err.message || 'Failed to record sale',
        severity: 'error'
      });
      throw err; // Rethrow to be handled by the form
    }
  };

  // Handle form submission (edit)
  const handleEditSale = async (formData) => {
    try {
      // Validate form data
      const validationResult = salesValidator.validateSalesForm(formData);
      
      if (!validationResult.isValid) {
        throw new Error(Object.values(validationResult.errors)[0]);
      }
      
      const response = await api.put(`/sales/${currentSale._id}`, formData);
      
      if (response.data && response.data.success) {
        setNotification({
          open: true,
          message: 'Sale updated successfully',
          severity: 'success'
        });
        setOpenEditDialog(false);
        fetchSales(); // Refresh sales data
        
        // If this is the selected sale, refresh details
        if (selectedSale && selectedSale._id === currentSale._id) {
          fetchSaleDetails(currentSale._id);
        }
      } else {
        throw new Error(response.data?.error || 'Failed to update sale');
      }
    } catch (err) {
      console.error('Error updating sale:', err);
      setNotification({
        open: true,
        message: err.message || 'Failed to update sale',
        severity: 'error'
      });
      throw err; // Rethrow to be handled by the form
    }
  };

  // Handle sale deletion
  const handleDeleteSale = async () => {
    try {
      const response = await api.delete(`/sales/${currentSale._id}`);
      
      if (response.data && response.data.success) {
        setNotification({
          open: true,
          message: 'Sale deleted successfully',
          severity: 'success'
        });
        setOpenDeleteDialog(false);
        fetchSales(); // Refresh sales data
        
        // If this is the selected sale, close details panel
        if (selectedSale && selectedSale._id === currentSale._id) {
          setDetailsOpen(false);
          setSelectedSale(null);
        }
      } else {
        throw new Error(response.data?.error || 'Failed to delete sale');
      }
    } catch (err) {
      console.error('Error deleting sale:', err);
      setNotification({
        open: true,
        message: err.message || 'Failed to delete sale',
        severity: 'error'
      });
    }
  };

  // Handle row click to show details
  const handleRowClick = (sale) => {
    fetchSaleDetails(sale._id);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setCurrentSale(null);
  };

  // Close details drawer
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Handle change page
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle change rows per page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setPage(0); // Reset to first page when changing filters
    
    switch (filterType) {
      case 'fuelType':
        setFilterFuelType(value);
        break;
      case 'paymentMethod':
        setFilterPaymentMethod(value);
        break;
      case 'startDate':
        setFilterDateRange(prev => ({ ...prev, startDate: value }));
        break;
      case 'endDate':
        setFilterDateRange(prev => ({ ...prev, endDate: value }));
        break;
      default:
        break;
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterFuelType('');
    setFilterPaymentMethod('');
    setFilterDateRange({
      startDate: null,
      endDate: null
    });
    setSearchTerm('');
    setPage(0);
  };

  // Handle close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ReceiptIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                Sales Management
              </Typography>
            </Box>
            
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                underline="hover"
                color="inherit"
                href="/dashboard"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Home
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Sales
              </Typography>
            </Breadcrumbs>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Record Sale
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Sales
                </Typography>
                <Typography variant="h4" component="div">
                  {formatCurrency(summaryData.totalAmount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summaryData.totalSales || 0} transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Volume
                </Typography>
                <Typography variant="h4" component="div">
                  {(summaryData.totalQuantity || 0).toLocaleString()} L
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Across all fuel types
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Today's Sales
                </Typography>
                <Typography variant="h4" component="div">
                  {formatCurrency(summaryData.todaySales?.amount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summaryData.todaySales?.count || 0} transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Sale
                </Typography>
                <Typography variant="h4" component="div">
                  {formatCurrency(summaryData.averageSaleAmount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Per transaction
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Fuel Type</InputLabel>
                    <Select
                      value={filterFuelType}
                      onChange={(e) => handleFilterChange('fuelType', e.target.value)}
                      label="Fuel Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      {fuelTypes.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={filterPaymentMethod}
                      onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                      label="Payment Method"
                    >
                      <MenuItem value="">All Methods</MenuItem>
                      {paymentMethods.map((method) => (
                        <MenuItem key={method} value={method}>{method}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <DatePicker
                    label="Start Date"
                    value={filterDateRange.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <DatePicker
                    label="End Date"
                    value={filterDateRange.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} display="flex" justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                sx={{ mr: 1 }}
              >
                Clear Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchSales}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Sales Table */}
          <Grid item xs={12} md={detailsOpen ? 7 : 12}>
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sale ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Fuel Type</TableCell>
                      <TableCell>Quantity (L)</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <CircularProgress size={30} sx={{ my: 2 }} />
                          <Typography>Loading sales data...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body1" sx={{ py: 2 }}>
                            No sales found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.map((sale) => (
                        <TableRow 
                          key={sale._id} 
                          hover
                          onClick={() => handleRowClick(sale)}
                          selected={selectedSale && selectedSale._id === sale._id}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{sale.saleId}</TableCell>
                          <TableCell>{formatDate(sale.date)}</TableCell>
                          <TableCell>{sale.fuelType}</TableCell>
                          <TableCell>{sale.quantity.toLocaleString()}</TableCell>
                          <TableCell align="right">{formatCurrency(sale.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(sale.totalAmount)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={sale.paymentMethod} 
                              color={
                                sale.paymentMethod === 'Cash' ? 'success' : 
                                sale.paymentMethod === 'Credit' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditDialog(sale);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteDialog(sale);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print Receipt">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Implement print functionality
                                  console.log('Print receipt for sale:', sale._id);
                                }}
                              >
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalSales}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </Grid>
          
          {/* Sale Details Panel */}
          {detailsOpen && selectedSale && (
            <Grid item xs={12} md={5}>
              <SaleDetails 
                saleData={selectedSale} 
                formatCurrency={formatCurrency}
                onEdit={() => handleOpenEditDialog(selectedSale)}
                onDelete={() => handleOpenDeleteDialog(selectedSale)}
                onClose={handleCloseDetails}
                onRefresh={() => fetchSaleDetails(selectedSale._id)}
              />
            </Grid>
          )}
        </Grid>

        {/* Add Sale Dialog */}
        <Dialog 
          open={openAddDialog} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <SalesForm 
            onSubmit={handleAddSale}
            onCancel={handleCloseDialog}
            api={api}
          />
        </Dialog>

        {/* Edit Sale Dialog */}
        <Dialog 
          open={openEditDialog} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <SalesForm 
            sale={currentSale}
            onSubmit={handleEditSale}
            onCancel={handleCloseDialog}
            api={api}
          />
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDialog}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Confirm Delete
            </Typography>
            <Typography>
              Are you sure you want to delete this sale record? This action cannot be undone.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Button 
              onClick={handleCloseDialog} 
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteSale} 
              variant="contained" 
              color="error"
            >
              Delete
            </Button>
          </Box>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default SalesPage;