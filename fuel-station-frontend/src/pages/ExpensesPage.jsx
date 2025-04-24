import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Snackbar,
  InputAdornment,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ExpensesPage = () => {
  const { api, user } = useContext(AuthContext);
  
  // State for expenses data
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // State for the expense form dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentExpense, setCurrentExpense] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });
  
  // State for confirmation dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // State for approve/reject dialogs
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Define expense categories
  const expenseCategories = [
    'Fuel Purchase',
    'Electricity',
    'Water',
    'Rent',
    'Salaries',
    'Maintenance',
    'Equipment',
    'Office Supplies',
    'Marketing',
    'Insurance',
    'Taxes',
    'Transportation',
    'Utilities',
    'Other'
  ];

  // Define payment methods
  const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'Credit Card',
    'Check',
    'Other'
  ];

  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, [page, rowsPerPage]);

  // Function to fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/expenses', {
        params: {
          skip: page * rowsPerPage,
          limit: rowsPerPage
        }
      });
      
      if (response.data.success) {
        setExpenses(response.data.data);
        setTotal(response.data.total || response.data.count);
      } else {
        setError('Failed to fetch expenses');
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err.response?.data?.error || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Function to handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Function to open dialog for adding a new expense
  const handleAddExpense = () => {
    setDialogMode('add');
    setCurrentExpense({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0]
    });
    setOpenDialog(true);
  };

  // Function to open dialog for editing an expense
  const handleEditExpense = (expense) => {
    setDialogMode('edit');
    setCurrentExpense({
      ...expense,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setOpenDialog(true);
  };

  // Function to handle changes in the form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentExpense({
      ...currentExpense,
      [name]: value
    });
  };

  // Function to handle date change
  const handleDateChange = (date) => {
    setCurrentExpense({
      ...currentExpense,
      date: date.toISOString().split('T')[0]
    });
  };

  // Function to handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      let response;
      if (dialogMode === 'add') {
        response = await api.post('/expenses', currentExpense);
      } else {
        response = await api.put(`/expenses/${currentExpense._id}`, currentExpense);
      }
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: dialogMode === 'add' ? 'Expense added successfully' : 'Expense updated successfully',
          severity: 'success'
        });
        fetchExpenses();
        setOpenDialog(false);
      } else {
        throw new Error(response.data.error || 'Failed to save expense');
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to save expense',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to open confirmation dialog for deleting an expense
  const handleDeleteClick = (expense) => {
    setExpenseToDelete(expense);
    setOpenConfirmDialog(true);
  };

  // Function to delete an expense
  const handleDeleteExpense = async () => {
    try {
      setLoading(true);
      
      const response = await api.delete(`/expenses/${expenseToDelete._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense deleted successfully',
          severity: 'success'
        });
        fetchExpenses();
      } else {
        throw new Error(response.data.error || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to delete expense',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setOpenConfirmDialog(false);
    }
  };

  // Function to open approval dialog
  const handleApproveClick = (expense) => {
    setCurrentExpense(expense);
    setOpenApproveDialog(true);
  };

  // Function to approve an expense
  const handleApproveExpense = async () => {
    try {
      setLoading(true);
      
      const response = await api.put(`/expenses/${currentExpense._id}/approve`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense approved successfully',
          severity: 'success'
        });
        fetchExpenses();
      } else {
        throw new Error(response.data.error || 'Failed to approve expense');
      }
    } catch (err) {
      console.error('Error approving expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to approve expense',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setOpenApproveDialog(false);
    }
  };

  // Function to open rejection dialog
  const handleRejectClick = (expense) => {
    setCurrentExpense(expense);
    setRejectionReason('');
    setOpenRejectDialog(true);
  };

  // Function to reject an expense
  const handleRejectExpense = async () => {
    try {
      setLoading(true);
      
      const response = await api.put(`/expenses/${currentExpense._id}/reject`, {
        rejectionReason
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Expense rejected successfully',
          severity: 'success'
        });
        fetchExpenses();
      } else {
        throw new Error(response.data.error || 'Failed to reject expense');
      }
    } catch (err) {
      console.error('Error rejecting expense:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to reject expense',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setOpenRejectDialog(false);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format amount for display
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  // Check if user can approve/reject expenses
  const canApprove = () => {
    return user && (user.role === 'admin' || user.role === 'manager');
  };

  // Get status color for chip
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'Pending':
      default:
        return 'warning';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ReceiptIcon sx={{ mr: 1 }} />
              Expenses Management
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
            startIcon={<AddIcon />}
            onClick={handleAddExpense}
          >
            Add Expense
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Expenses Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="expenses table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && !expenses.length ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
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
                    <TableRow key={expense._id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{formatAmount(expense.amount)}</TableCell>
                      <TableCell>{expense.paymentMethod}</TableCell>
                      <TableCell>
                        <Chip 
                          label={expense.approvalStatus || 'Pending'} 
                          color={getStatusColor(expense.approvalStatus || 'Pending')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small"
                            onClick={() => handleEditExpense(expense)}
                            disabled={expense.approvalStatus === 'Approved' && !canApprove()}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          
                          {canApprove() && expense.approvalStatus === 'Pending' && (
                            <>
                              <IconButton 
                                size="small"
                                color="success"
                                onClick={() => handleApproveClick(expense)}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                color="error"
                                onClick={() => handleRejectClick(expense)}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                          
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteClick(expense)}
                            disabled={expense.approvalStatus === 'Approved' && !canApprove()}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Add/Edit Expense Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogMode === 'add' ? 'Add New Expense' : 'Edit Expense'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    name="category"
                    value={currentExpense.category}
                    onChange={handleInputChange}
                    label="Category"
                  >
                    {expenseCategories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={currentExpense.date ? new Date(currentExpense.date) : null}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Description"
                  value={currentExpense.description}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="amount"
                  label="Amount"
                  type="number"
                  value={currentExpense.amount}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="payment-method-label">Payment Method</InputLabel>
                  <Select
                    labelId="payment-method-label"
                    name="paymentMethod"
                    value={currentExpense.paymentMethod}
                    onChange={handleInputChange}
                    label="Payment Method"
                  >
                    {paymentMethods.map(method => (
                      <MenuItem key={method} value={method}>{method}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notes (Optional)"
                  value={currentExpense.notes || ''}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={loading || !currentExpense.category || !currentExpense.description || !currentExpense.amount || !currentExpense.paymentMethod}
            >
              {loading ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this expense?</Typography>
            {expenseToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Description:</Typography>
                <Typography variant="body1">{expenseToDelete.description}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Amount:</Typography>
                <Typography variant="body1">{formatAmount(expenseToDelete.amount)}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteExpense} color="error" variant="contained">
              {loading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)}>
          <DialogTitle>Approve Expense</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to approve this expense?</Typography>
            {currentExpense && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Description:</Typography>
                <Typography variant="body1">{currentExpense.description}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Amount:</Typography>
                <Typography variant="body1">{formatAmount(currentExpense.amount)}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenApproveDialog(false)}>Cancel</Button>
            <Button onClick={handleApproveExpense} color="success" variant="contained">
              {loading ? <CircularProgress size={24} /> : 'Approve'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)}>
          <DialogTitle>Reject Expense</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>Please provide a reason for rejecting this expense:</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              label="Rejection Reason"
              variant="outlined"
              sx={{ mt: 2 }}
            />
            {currentExpense && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Description:</Typography>
                <Typography variant="body1">{currentExpense.description}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Amount:</Typography>
                <Typography variant="body1">{formatAmount(currentExpense.amount)}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRejectDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleRejectExpense} 
              color="error" 
              variant="contained"
              disabled={!rejectionReason.trim()}
            >
              {loading ? <CircularProgress size={24} /> : 'Reject'}
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