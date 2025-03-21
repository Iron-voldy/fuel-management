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
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';

const ExpensesPage = () => {
  const { api } = useContext(AuthContext);
  
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
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // State for confirmation dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

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
        setTotal(response.data.total);
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
      paymentMethod: '',
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

  // Function to handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (dialogMode === 'add') {
        await api.post('/expenses', currentExpense);
      } else {
        await api.put(`/expenses/${currentExpense._id}`, currentExpense);
      }
      
      fetchExpenses();
      setOpenDialog(false);
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.error || 'Failed to save expense');
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
      
      await api.delete(`/expenses/${expenseToDelete._id}`);
      
      fetchExpenses();
      setOpenConfirmDialog(false);
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(err.response?.data?.error || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Expenses Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddExpense}
        >
          Add Expense
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                    No expenses found
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
                    <TableCell>{expense.approvalStatus}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small"
                        onClick={() => handleEditExpense(expense)}
                        disabled={expense.approvalStatus === 'Approved' && !expense.isAdmin}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(expense)}
                        disabled={expense.approvalStatus === 'Approved' && !expense.isAdmin}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
                  <MenuItem value="Fuel Purchase">Fuel Purchase</MenuItem>
                  <MenuItem value="Electricity">Electricity</MenuItem>
                  <MenuItem value="Water">Water</MenuItem>
                  <MenuItem value="Rent">Rent</MenuItem>
                  <MenuItem value="Salaries">Salaries</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                  <MenuItem value="Equipment">Equipment</MenuItem>
                  <MenuItem value="Office Supplies">Office Supplies</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Insurance">Insurance</MenuItem>
                  <MenuItem value="Taxes">Taxes</MenuItem>
                  <MenuItem value="Transportation">Transportation</MenuItem>
                  <MenuItem value="Utilities">Utilities</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="date"
                label="Date"
                type="date"
                value={currentExpense.date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
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
                  startAdornment: <span style={{ marginRight: 8 }}>LKR</span>,
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
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Credit Card">Credit Card</MenuItem>
                  <MenuItem value="Check">Check</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteExpense} color="error" variant="contained">
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensesPage;