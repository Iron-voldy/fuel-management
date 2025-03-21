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
  Tabs,
  Tab,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fab
} from '@mui/material';
import { 
  Add as AddIcon,
  Receipt as ReceiptIcon,
  LocalGasStation as GasStationIcon,
  Home as HomeIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Search as SearchIcon,
  LocalPrintshop as PrinterIcon,
  ReceiptLong as InvoiceIcon,
  Description as ReportIcon,
  TrendingUp as TrendingUpIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';
import SalesForm from './SalesForm';
import SaleDetails from './SaleDetails';
import SalesSummary from './SalesSummary';

const SalesPage = () => {
  const { api } = useContext(AuthContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSales, setTotalSales] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [summaryData, setSummaryData] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    fuelType: '',
    startDate: null,
    endDate: null,
    paymentMethod: '',
    customerId: ''
  });
  const [viewMode, setViewMode] = useState('list');
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [selectedSaleForAction, setSelectedSaleForAction] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'grid' : 'list');
  };

  // Fetch sales
  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare filter parameters
      const params = {};
      if (filters.fuelType) params.fuelType = filters.fuelType;
      if (filters.startDate) params.startDate = filters.startDate.toISOString();
      if (filters.endDate) params.endDate = filters.endDate.toISOString();
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.customerId) params.customerId = filters.customerId;
      
      const res = await api.get('/sales', { params });
      
      if (res.data && res.data.data) {
        setSales(res.data.data);
        setTotalSales(res.data.total);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err.response?.data?.error || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary data
  const fetchSummaryData = async () => {
    try {
      const res = await api.get('/sales/summary');
      
      if (res.data && res.data.data) {
        setSummaryData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sales summary:', err);
    }
  };

  // Fetch sale details
  const fetchSaleDetails = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      
      if (res.data && res.data.data) {
        setSelectedSale(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sale details:', err);
      setNotification({
        open: true,
        message: 'Failed to load sale details',
        severity: 'error'
      });
    }
  };

  // Initial data load
  useEffect(() => {
    fetchSales();
    fetchSummaryData();
  }, [filters]);

  // Handle form open
  const handleOpenForm = (sale = null) => {
    setEditingSale(sale);
    setOpenForm(true);
  };

  // Handle form close
  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingSale(null);
  };

  // Handle form submit
  const handleFormSubmit = async (formData) => {
    try {
      if (editingSale) {
        // Update existing sale
        await api.put(`/sales/${editingSale._id}`, formData);
        setNotification({
          open: true,
          message: 'Sale record updated successfully',
          severity: 'success'
        });
      } else {
        // Create new sale
        await api.post('/sales', formData);
        setNotification({
          open: true,
          message: 'Sale record created successfully',
          severity: 'success'
        });
      }
      
      // Refresh data
      fetchSales();
      fetchSummaryData();
      handleCloseForm();
    } catch (err) {
      console.error('Error saving sale record:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Failed to save sale record',
        severity: 'error'
      });
    }
  };

  // Handle sale selection for details view
  const handleSaleSelect = (sale) => {
    if (selectedSale && selectedSale._id === sale._id) {
      setSelectedSale(null); // Toggle off if already selected
    } else {
      fetchSaleDetails(sale._id);
    }
  };

  // Handle filter menu open
  const handleFilterMenuOpen = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  // Handle filter menu close
  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      fuelType: '',
      startDate: null,
      endDate: null,
      paymentMethod: '',
      customerId: ''
    });
    handleFilterMenuClose();
  };

  // Handle action menu open
  const handleActionMenuOpen = (event, sale) => {
    event.stopPropagation();
    setSelectedSaleForAction(sale);
    setActionMenuAnchorEl(event.currentTarget);
  };

  // Handle action menu close
  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
  };

  // Handle delete dialog open
  const handleOpenDeleteDialog = (sale) => {
    setSaleToDelete(sale);
    setOpenDeleteDialog(true);
    handleActionMenuClose();
  };

  // Handle delete dialog close
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSaleToDelete(null);
  };

  // Handle sale delete
  const handleDeleteSale = async () => {
    try {
      await api.delete(`/sales/${saleToDelete._id}`);
      setNotification({
        open: true,
        message: 'Sale record deleted successfully',
        severity: 'success'
      });
      
      // Refresh data
      fetchSales();
      fetchSummaryData();
      
      // If the deleted sale is the currently selected one, clear selection
      if (selectedSale && selectedSale._id === saleToDelete._id) {
        setSelectedSale(null);
      }
      
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting sale record:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Failed to delete sale record',
        severity: 'error'
      });
      handleCloseDeleteDialog();
    }
  };

  // Generate Invoice
  const handleGenerateInvoice = (sale) => {
    // Implementation for generating invoice
    setNotification({
      open: true,
      message: 'Invoice generation feature is coming soon',
      severity: 'info'
    });
    handleActionMenuClose();
  };

  // Print Receipt
  const handlePrintReceipt = (sale) => {
    // Implementation for printing receipt
    setNotification({
      open: true,
      message: 'Print receipt feature is coming soon',
      severity: 'info'
    });
    handleActionMenuClose();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
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

  // Loading state
  if (loading && sales.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6">
            Error: {error}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Please try refreshing the page or contact support if the problem persists.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => fetchSales()}
          >
            Retry
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header section */}
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
              href="/"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Home
            </Link>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <ReceiptIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Sales
            </Typography>
          </Breadcrumbs>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            Add Sale
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={handleFilterMenuOpen}
          >
            Filter
          </Button>
          <IconButton 
            onClick={toggleViewMode} 
            color="primary"
            sx={{ ml: 1 }}
          >
            {viewMode === 'list' ? <ViewModuleIcon /> : <ViewListIcon />}
          </IconButton>
          <IconButton 
            color="primary" 
            onClick={() => {
              fetchSales();
              fetchSummaryData();
              if (selectedSale) {
                fetchSaleDetails(selectedSale._id);
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterMenuClose}
        PaperProps={{
          sx: { width: 300, maxWidth: '100%', p: 2 }
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 2, px: 1 }}>
          Filter Sales
        </Typography>
        
        <TextField
          select
          fullWidth
          label="Fuel Type"
          value={filters.fuelType}
          onChange={(e) => handleFilterChange('fuelType', e.target.value)}
          margin="normal"
          size="small"
        >
          <MenuItem value="">All Fuel Types</MenuItem>
          {fuelTypes.map((type) => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </TextField>
        
        <TextField
          select
          fullWidth
          label="Payment Method"
          value={filters.paymentMethod}
          onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
          margin="normal"
          size="small"
        >
          <MenuItem value="">All Payment Methods</MenuItem>
          {paymentMethods.map((method) => (
            <MenuItem key={method} value={method}>{method}</MenuItem>
          ))}
        </TextField>
        
        <TextField
          fullWidth
          label="Start Date"
          type="date"
          value={filters.startDate ? filters.startDate.toISOString().slice(0, 10) : ''}
          onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
          margin="normal"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        
        <TextField
          fullWidth
          label="End Date"
          type="date"
          value={filters.endDate ? filters.endDate.toISOString().slice(0, 10) : ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
          margin="normal"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button color="primary" onClick={clearFilters}>Clear Filters</Button>
          <Button variant="contained" onClick={handleFilterMenuClose}>Apply</Button>
        </Box>
      </Menu>
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => {
          handleActionMenuClose();
          handleOpenForm(selectedSaleForAction);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleOpenDeleteDialog(selectedSaleForAction)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handlePrintReceipt(selectedSaleForAction)}>
          <ListItemIcon>
            <PrinterIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Print Receipt</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleGenerateInvoice(selectedSaleForAction)}>
          <ListItemIcon>
            <InvoiceIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Generate Invoice</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Summary cards */}
      {summaryData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Sales</Typography>
                <Typography variant="h3" color="primary">
                  {formatCurrency(summaryData.totalSales || 0)}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {summaryData.salesCount || 0} transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Volume</Typography>
                <Typography variant="h3" color="primary">
                  {summaryData.totalQuantity?.toLocaleString() || 0} L
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Across all fuel types
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Average Sale</Typography>
                <Typography variant="h3" color="primary">
                  {formatCurrency(summaryData.averageSaleAmount || 0)}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Per transaction
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Fuel</Typography>
                <Typography variant="h3" color="primary">
                  {summaryData.topFuel?.fuelType || 'N/A'}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {summaryData.topFuel?.percentage?.toFixed(1) || 0}% of sales
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Tabs for different views */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            mb: 2,
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 3
            }
          }}
        >
          <Tab label="Sales List" />
          <Tab label="Analytics" />
          <Tab label="Reports" />
        </Tabs>
      </Box>
      
      {/* Tab panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Sales List */}
          <Grid item xs={12} md={selectedSale ? 7 : 12}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Sales Records</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Search sales..."
                    InputProps={{
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ width: 200 }}
                  />
                </Box>
              </Box>
              
              {/* List View */}
              {viewMode === 'list' && (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Sale ID</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Fuel Type</TableCell>
                          <TableCell>Quantity (L)</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Total Amount</TableCell>
                          <TableCell>Payment Method</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              <Typography variant="body1" sx={{ py: 2 }}>
                                No sales records found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          sales
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((sale) => (
                              <TableRow 
                                key={sale._id}
                                hover
                                onClick={() => handleSaleSelect(sale)}
                                selected={selectedSale && selectedSale._id === sale._id}
                                sx={{ 
                                  cursor: 'pointer',
                                  '&.Mui-selected': {
                                    backgroundColor: 'primary.lighter'
                                  }
                                }}
                              >
                                <TableCell>{sale.saleId}</TableCell>
                                <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                                <TableCell>{sale.fuelType}</TableCell>
                                <TableCell>{sale.quantity.toLocaleString()}</TableCell>
                                <TableCell>{formatCurrency(sale.unitPrice)}</TableCell>
                                <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={sale.paymentMethod} 
                                    color={sale.paymentMethod === 'Cash' ? 'success' : 
                                          sale.paymentMethod === 'Credit' ? 'warning' : 'primary'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => handleActionMenuOpen(e, sale)}
                                  >
                                    <MoreIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <TablePagination
                    component="div"
                    count={totalSales}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                  />
                </>
              )}
              
              {/* Grid View */}
              {viewMode === 'grid' && (
                <>
                  <Grid container spacing={2}>
                    {sales.length === 0 ? (
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body1">
                            No sales records found
                          </Typography>
                        </Box>
                      </Grid>
                    ) : (
                      sales
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((sale) => (
                          <Grid item xs={12} sm={6} md={4} key={sale._id}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-3px)',
                                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                },
                                ...(selectedSale && selectedSale._id === sale._id ? {
                                  border: '2px solid',
                                  borderColor: 'primary.main'
                                } : {})
                              }}
                              onClick={() => handleSaleSelect(sale)}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Typography variant="subtitle1">{sale.saleId}</Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => handleActionMenuOpen(e, sale)}
                                  >
                                    <MoreIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(sale.date).toLocaleDateString()}
                                </Typography>
                                
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">Fuel Type</Typography>
                                    <Typography variant="body1">{sale.fuelType}</Typography>
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="body2" color="text.secondary">Quantity</Typography>
                                    <Typography variant="body1">{sale.quantity.toLocaleString()} L</Typography>
                                  </Box>
                                </Box>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="h6" color="primary">
                                    {formatCurrency(sale.totalAmount)}
                                  </Typography>
                                  <Chip 
                                    label={sale.paymentMethod} 
                                    color={sale.paymentMethod === 'Cash' ? 'success' : 
                                          sale.paymentMethod === 'Credit' ? 'warning' : 'primary'}
                                    size="small"
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                    )}
                  </Grid>
                  
                  <TablePagination
                    component="div"
                    count={totalSales}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                  />
                </>
              )}
            </Paper>
          </Grid>
          
          {/* Sale Details */}
          {selectedSale && (
            <Grid item xs={12} md={5}>
              <SaleDetails 
                saleData={selectedSale} 
                formatCurrency={formatCurrency}
                onEdit={() => handleOpenForm(selectedSale)}
                onDelete={() => handleOpenDeleteDialog(selectedSale)}
                onRefresh={() => fetchSaleDetails(selectedSale._id)}
              />
            </Grid>
          )}
        </Grid>
      )}
      
      {tabValue === 1 && (
        <SalesSummary api={api} formatCurrency={formatCurrency} />
      )}
      
      {tabValue === 2 && (
        <Paper 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h6" gutterBottom>Sales Reports</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Generate detailed reports on your sales activity for any time period
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box sx={{ p: 2 }}>
                  <ReportIcon fontSize="large" color="primary" />
                </Box>
                <Typography variant="h6" gutterBottom>Sales Summary Report</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Complete overview of sales by fuel type, payment method, and time period
                </Typography>
                <Button variant="outlined" fullWidth>Generate</Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box sx={{ p: 2 }}>
                  <TrendingUpIcon fontSize="large" color="primary" />
                </Box>
                <Typography variant="h6" gutterBottom>Sales Trend Analysis</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Visual charts and trends of your sales performance over time
                </Typography>
                <Button variant="outlined" fullWidth>Generate</Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box sx={{ p: 2 }}>
                  <InvoiceIcon fontSize="large" color="primary" />
                </Box>
                <Typography variant="h6" gutterBottom>Invoice Report</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Detailed report of all invoices generated from sales transactions
                </Typography>
                <Button variant="outlined" fullWidth>Generate</Button>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Bottom action button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16
        }}
        onClick={() => handleOpenForm()}
      >
        <AddIcon />
      </Fab>
      
      {/* Sale Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <SalesForm 
          sale={editingSale}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
          api={api}
        />
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Confirm Delete</Typography>
          <Typography variant="body1">
            Are you sure you want to delete the sale record with ID "{saleToDelete?.saleId}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All transaction data for this sale will be permanently removed.
          </Typography>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={handleDeleteSale} color="error" variant="contained">
              Delete
            </Button>
          </Box>
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
  );
};

export default SalesPage;