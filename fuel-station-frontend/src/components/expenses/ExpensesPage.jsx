import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Breadcrumbs,
  Link,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import AuthContext from '../context/AuthContext';

const ExpensesPage = () => {
  const { api, user } = useContext(AuthContext);
  
  // State for expenses data
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    paymentMethod: '',
    startDate: null,
    endDate: null,
    minAmount: '',
    maxAmount: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // State for dialogs
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  
  // State for current selected expense
  const [currentExpense, setCurrentExpense] = useState(null);
  
  // State for form data
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Cash',
    date: new Date(),
    stationId: '',
    reference: '',
    notes: '',
    status: 'Pending'
  });
  
  // State for form validation
  const [formErrors, setFormErrors] = useState({});
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // State for summary data
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    byCategory: {}
  });

  // Load expense categories
  const expenseCategories = [
    'Utilities',
    'Rent',
    'Supplies',
    'Maintenance',
    'Taxes',
    'Salaries',
    'Transport',
    'Insurance',
    'Advertising',
    'Equipment',
    'Software',
    'Legal',
    'Office',
    'Training',
    'Miscellaneous'
  ];

  // Payment methods
  const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'Debit Card',
    'Credit Card',
    'Check',
    'Mobile Payment',
    'Petty Cash'
  ];

  // Fetch expenses data
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let queryParams = {
        limit: rowsPerPage,
        skip: page * rowsPerPage
      };
      
      // Add search term
      if (searchTerm) {
        queryParams.search = searchTerm;
      }
      
      // Add filters
      if (filters.category) queryParams.category = filters.category;
      if (filters.status) queryParams.status = filters.status;
      if (filters.paymentMethod) queryParams.paymentMethod = filters.paymentMethod;
      if (filters.startDate) queryParams.startDate = format(filters.startDate, 'yyyy-MM-dd');
      if (filters.endDate) queryParams.endDate = format(filters.endDate, 'yyyy-MM-dd');
      if (filters.minAmount) queryParams.minAmount = filters.minAmount;
      if (filters.maxAmount) queryParams.maxAmount = filters.maxAmount;
      
      const response = await api.get('/expenses', { params: queryParams });
      
      if (response.data.success) {
        setExpenses(response.data.data);
      } else {
        setError('Failed to fetch expenses data');
      }

      // Fetch summary
      const summaryResponse = await api.get('/expenses/summary');
      if (summaryResponse.data.success) {
        setSummary(summaryResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Error fetching expenses data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when page, rowsPerPage, or filters change
  useEffect(() => {
    fetchExpenses();
  }, [page, rowsPerPage]);

  // Handle change in form fields
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when field is updated
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Handle date change
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      date
    });
  };

  // Handle filter date change
  const handleFilterDateChange = (name, date) => {
    setFilters({
      ...filters,
      [name]: date
    });
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Apply filters
  const handleApplyFilters = () => {
    setPage(0); // Reset page when applying filters
    fetchExpenses();
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      category: '',
      status: '',
      paymentMethod: '',
      startDate: null,
      endDate: null,
      minAmount: '',
      maxAmount: ''
    });
    setPage(0);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0); // Reset page when search changes
    fetchExpenses();
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.description) errors.description = 'Description is required';
    if (!formData.amount) {
      errors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    if (!formData.paymentMethod) errors.paymentMethod = 'Payment method is required';
    if (!formData.date) errors.date = 'Date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add expense dialog
  const handleOpenAddDialog = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      date: new Date(),
      stationId: '',
      reference: '',
      notes: '',
      status: 'Pending'
    });
    setFormErrors({});
    setOpenAddDialog(true);
  };

  // Handle edit expense dialog
  const handleOpenEditDialog = (expense) => {
    setCurrentExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      date: new Date(expense.date),
      stationId: expense.stationId || '',
      reference: expense.reference || '',
      notes: expense.notes || '',
      status: expense.status
    });
    setFormErrors({});
    setOpenEditDialog(true);
  };

  // Handle delete expense dialog
  const handleOpenDeleteDialog = (expense) => {
    setCurrentExpense(expense);
    setOpenDeleteDialog(true);
  };

  // Handle approve expense dialog
  const handleOpenApproveDialog = (expense) => {
    setCurrentExpense(expense);
    setOpenApproveDialog(true);
  };

  // Handle reject expense dialog
  const handleOpenRejectDialog = (expense) => {
    setCurrentExpense(expense);
    setFormData({
      ...formData,
      rejectionReason: ''
    });
    setOpenRejectDialog(true);
  };

  // Handle details dialog
  const handleOpenDetailsDialog = async (expense) => {
    setCurrentExpense(expense);
    
    // Fetch full expense details if needed
    try {
      const response = await api.get(`/expenses/${expense._id}`);
      if (response.data.success) {
        setCurrentExpense(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching expense details:', err);
    }
    
    setOpenDetailsDialog(true);
  };

  // Close all dialogs
  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setOpenApproveDialog(false);
    setOpenRejectDialog(false);
    setOpenDetailsDialog(false);
    setCurrentExpense(null);
  };

  // Submit add expense form
  const handleAddExpense = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await api.post('/expenses', formData);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense added successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchExpenses();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to add expense',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error adding expense',
        severity: 'error'
      });
    }
  };

  // Submit edit expense form
  const handleEditExpense = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await api.put(`/expenses/${currentExpense._id}`, formData);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense updated successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchExpenses();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update expense',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error updating expense',
        severity: 'error'
      });
    }
  };

  // Delete expense
  const handleDeleteExpense = async () => {
    try {
      const response = await api.delete(`/expenses/${currentExpense._id}`);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense deleted successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchExpenses();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to delete expense',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error deleting expense',
        severity: 'error'
      });
    }
  };

  // Approve expense
  const handleApproveExpense = async () => {
    try {
      const response = await api.put(`/expenses/${currentExpense._id}/approve`);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense approved successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchExpenses();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to approve expense',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error approving expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error approving expense',
        severity: 'error'
      });
    }
  };

  // Reject expense
  const handleRejectExpense = async () => {
    try {
      const response = await api.put(`/expenses/${currentExpense._id}/reject`, {
        rejectionReason: formData.rejectionReason
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense rejected successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchExpenses();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to reject expense',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error rejecting expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error rejecting expense',
        severity: 'error'
      });
    }
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

  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'Cash':
        return <AttachMoneyIcon fontSize="small" />;
      case 'Bank Transfer':
        return <MonetizationOnIcon fontSize="small" />;
      default:
        return <ReceiptIcon fontSize="small" />;
    }
  };

  // Check if user can approve expenses
  const canApprove = () => {
    return user && (user.role === 'admin' || user.role === 'manager');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              <ReceiptIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Expense Management
            </Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                underline="hover"
                color="inherit"
                href="/dashboard"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Dashboard
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Expenses
              </Typography>
            </Breadcrumbs>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add New Expense
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Expenses
                </Typography>
                <Typography variant="h4" component="div">
                  {formatCurrency(summary.totalAmount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Approval
                </Typography>
                <Typography variant="h4" component="div">
                  {formatCurrency(summary.pendingAmount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summary.pendingCount || 0} expenses awaiting approval
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Approved
                </Typography>
                <Typography variant="h4" component="div">
                  {formatCurrency(summary.approvedAmount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summary.approvedCount || 0} approved expenses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Top Expense Category
                </Typography>
                <Typography variant="h4" component="div">
                  {summary.topCategory || 'N/A'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summary.topCategoryAmount ? formatCurrency(summary.topCategoryAmount) : 'No data'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Search and Filter */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <form onSubmit={handleSearch}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search expenses by description..."
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
                        <IconButton size="small" onClick={handleClearSearch}>
                          <CloseIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </form>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                fullWidth
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                color="primary"
                variant={showFilters ? "contained" : "outlined"}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                fullWidth
                startIcon={<RefreshIcon />}
                onClick={fetchExpenses}
                disabled={loading}
                variant="outlined"
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
          
          {showFilters && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      name="category"
                      value={filters.category}
                      onChange={handleFilterChange}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {expenseCategories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                      label="Status"
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={filters.paymentMethod}
                      onChange={handleFilterChange}
                      label="Payment Method"
                    >
                      <MenuItem value="">All Methods</MenuItem>
                      {paymentMethods.map((method) => (
                        <MenuItem key={method} value={method}>{method}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleFilterDateChange('startDate', date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterDateChange('endDate', date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    name="minAmount"
                    label="Min Amount"
                    type="number"
                    value={filters.minAmount}
                    onChange={handleFilterChange}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    name="maxAmount"
                    label="Max Amount"
                    type="number"
                    value={filters.maxAmount}
                    onChange={handleFilterChange}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleApplyFilters}
                      sx={{ mr: 1 }}
                    >
                      Apply Filters
                    </Button>
                    <Button
                      color="secondary"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* Expenses Table */}
        <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="expenses table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress size={30} sx={{ my: 2 }} />
                      <Typography>Loading expenses data...</Typography>
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography>No expenses found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense._id} hover>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={expense.category}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Click for details">
                          <Typography
                            variant="body2"
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={() => handleOpenDetailsDialog(expense)}
                          >
                            {expense.description}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          icon={getPaymentMethodIcon(expense.paymentMethod)}
                          label={expense.paymentMethod} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={expense.status} 
                          color={getStatusColor(expense.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleOpenDetailsDialog(expense)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {expense.status === 'Pending' && (
                            <>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleOpenEditDialog(expense)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              {canApprove() && (
                                <>
                                  <Tooltip title="Approve">
                                    <IconButton size="small" color="success" onClick={() => handleOpenApproveDialog(expense)}>
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reject">
                                    <IconButton size="small" color="error" onClick={() => handleOpenRejectDialog(expense)}>
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </>
                          )}
                          
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(expense)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
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
            count={expenses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Add Expense Dialog */}
        <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.category}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    label="Category"
                  >
                    {expenseCategories.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="amount"
                  label="Amount (LKR)"
                  type="number"
                  value={formData.amount}
                  onChange={handleFormChange}
                  error={!!formErrors.amount}
                  helperText={formErrors.amount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">LKR</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleFormChange}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.paymentMethod}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleFormChange}
                    label="Payment Method"
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method} value={method}>{method}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.paymentMethod && <FormHelperText>{formErrors.paymentMethod}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: !!formErrors.date,
                      helperText: formErrors.date
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="stationId"
                  label="Station ID (Optional)"
                  value={formData.stationId}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="reference"
                  label="Reference (Optional)"
                  value={formData.reference}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleFormChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleAddExpense} variant="contained" color="primary">
              Add Expense
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Expense Dialog */}
        <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.category}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    label="Category"
                  >
                    {expenseCategories.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="amount"
                  label="Amount (LKR)"
                  type="number"
                  value={formData.amount}
                  onChange={handleFormChange}
                  error={!!formErrors.amount}
                  helperText={formErrors.amount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">LKR</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleFormChange}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.paymentMethod}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleFormChange}
                    label="Payment Method"
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method} value={method}>{method}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.paymentMethod && <FormHelperText>{formErrors.paymentMethod}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: !!formErrors.date,
                      helperText: formErrors.date
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="stationId"
                  label="Station ID (Optional)"
                  value={formData.stationId}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="reference"
                  label="Reference (Optional)"
                  value={formData.reference}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleFormChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleEditExpense} variant="contained" color="primary">
              Update Expense
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
          <DialogTitle>Delete Expense</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this expense: "{currentExpense?.description}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleDeleteExpense} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Approve Confirmation Dialog */}
        <Dialog open={openApproveDialog} onClose={handleCloseDialogs}>
          <DialogTitle>Approve Expense</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to approve this expense?
            </DialogContentText>
            {currentExpense && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Description:</Typography>
                    <Typography variant="body1">{currentExpense.description}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Amount:</Typography>
                    <Typography variant="body1">{formatCurrency(currentExpense.amount)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Category:</Typography>
                    <Typography variant="body1">{currentExpense.category}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Date:</Typography>
                    <Typography variant="body1">{formatDate(currentExpense.date)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleApproveExpense} color="success" variant="contained">
              Approve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={openRejectDialog} onClose={handleCloseDialogs}>
          <DialogTitle>Reject Expense</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please provide a reason for rejecting this expense:
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              name="rejectionReason"
              label="Rejection Reason"
              fullWidth
              variant="outlined"
              value={formData.rejectionReason || ''}
              onChange={handleFormChange}
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
            {currentExpense && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Description:</Typography>
                    <Typography variant="body1">{currentExpense.description}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Amount:</Typography>
                    <Typography variant="body1">{formatCurrency(currentExpense.amount)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleRejectExpense} color="error" variant="contained">
              Reject
            </Button>
          </DialogActions>
        </Dialog>

        {/* Expense Details Dialog */}
        <Dialog open={openDetailsDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Expense Details
              </Typography>
              <IconButton onClick={handleCloseDialogs} aria-label="close">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {currentExpense && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        {currentExpense.description}
                      </Typography>
                      <Typography color="text.secondary">
                        Expense ID: {currentExpense._id}
                      </Typography>
                    </Box>
                    <Chip 
                      label={currentExpense.status} 
                      color={getStatusColor(currentExpense.status)}
                      size="medium"
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Basic Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Category:</Typography>
                        <Typography variant="body1">{currentExpense.category}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Amount:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatCurrency(currentExpense.amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Date:</Typography>
                        <Typography variant="body1">{formatDate(currentExpense.date)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Payment Method:</Typography>
                        <Typography variant="body1">{currentExpense.paymentMethod}</Typography>
                      </Grid>
                      {currentExpense.stationId && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Station ID:</Typography>
                          <Typography variant="body1">{currentExpense.stationId}</Typography>
                        </Grid>
                      )}
                      {currentExpense.reference && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Reference:</Typography>
                          <Typography variant="body1">{currentExpense.reference}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Status Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Created By:</Typography>
                        <Typography variant="body1">
                          {currentExpense.createdBy?.name || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Created On:</Typography>
                        <Typography variant="body1">
                          {currentExpense.createdAt ? formatDate(currentExpense.createdAt) : 'N/A'}
                        </Typography>
                      </Grid>
                      
                      {currentExpense.status === 'Approved' && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Approved By:</Typography>
                            <Typography variant="body1">
                              {currentExpense.approvedBy?.name || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Approved On:</Typography>
                            <Typography variant="body1">
                              {currentExpense.approvalDate ? formatDate(currentExpense.approvalDate) : 'N/A'}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      
                      {currentExpense.status === 'Rejected' && (
                        <>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Rejected By:</Typography>
                            <Typography variant="body1">
                              {currentExpense.rejectedBy?.name || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Rejection Reason:</Typography>
                            <Typography variant="body1" color="error.main">
                              {currentExpense.rejectionReason || 'No reason provided'}
                            </Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {currentExpense.notes && (
                  <Grid item xs={12}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Notes
                      </Typography>
                      <Typography variant="body1">
                        {currentExpense.notes}
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {currentExpense.attachments && currentExpense.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Attachments
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {currentExpense.attachments.map((attachment, index) => (
                          <Chip
                            key={index}
                            label={attachment.name}
                            clickable
                            onClick={() => window.open(`http://localhost:5000/${attachment.path}`, '_blank')}
                            icon={<DescriptionIcon />}
                          />
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            {currentExpense && currentExpense.status === 'Pending' && (
              <>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => {
                    handleCloseDialogs();
                    handleOpenEditDialog(currentExpense);
                  }}
                >
                  Edit
                </Button>
                
                {canApprove() && (
                  <>
                    <Button
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => {
                        handleCloseDialogs();
                        handleOpenApproveDialog(currentExpense);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        handleCloseDialogs();
                        handleOpenRejectDialog(currentExpense);
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </>
            )}
            <Button onClick={handleCloseDialogs}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default ExpensesPage;