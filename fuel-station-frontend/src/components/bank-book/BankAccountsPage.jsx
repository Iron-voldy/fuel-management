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
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  CircularProgress,
  Fab,
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
  Tab
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  AccountBalance as AccountBalanceIcon,
  Home as HomeIcon,
  CompareArrows as CompareArrowsIcon,
  Refresh as RefreshIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';
import BankAccountForm from './BankAccountForm';
import TransferFundsForm from './TransferFundsForm';
import AccountSummary from './AccountSummary';

const BankAccountsPage = () => {
  const { api } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [openTransferForm, setOpenTransferForm] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [hideBalances, setHideBalances] = useState(false);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Toggle balance visibility
  const toggleBalanceVisibility = () => {
    setHideBalances(!hideBalances);
  };

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get('/bank-book/accounts');
      
      if (res.data && res.data.data) {
        setAccounts(res.data.data);
        setTotalAccounts(res.data.count);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setError(err.response?.data?.error || 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/bank-book/accounts/dashboard');
      
      if (res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  // Fetch account details
  const fetchAccountDetails = async (accountId) => {
    try {
      const res = await api.get(`/bank-book/accounts/${accountId}/summary`);
      
      if (res.data && res.data.data) {
        setSelectedAccount(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching account details:', err);
      setNotification({
        open: true,
        message: 'Failed to load account details',
        severity: 'error'
      });
    }
  };

  // Initial data load
  useEffect(() => {
    fetchAccounts();
    fetchDashboardData();
  }, []);

  // Handle form open
  const handleOpenForm = (account = null) => {
    setEditingAccount(account);
    setOpenForm(true);
  };

  // Handle form close
  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingAccount(null);
  };

  // Handle form submit
  const handleFormSubmit = async (formData) => {
    try {
      if (editingAccount) {
        // Update existing account
        await api.put(`/bank-book/accounts/${editingAccount._id}`, formData);
        setNotification({
          open: true,
          message: 'Bank account updated successfully',
          severity: 'success'
        });
      } else {
        // Create new account
        await api.post('/bank-book/accounts', formData);
        setNotification({
          open: true,
          message: 'Bank account created successfully',
          severity: 'success'
        });
      }
      
      // Refresh data
      fetchAccounts();
      fetchDashboardData();
      handleCloseForm();
    } catch (err) {
      console.error('Error saving bank account:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Failed to save bank account',
        severity: 'error'
      });
    }
  };

  // Handle transfer form open
  const handleOpenTransferForm = () => {
    setOpenTransferForm(true);
  };

  // Handle transfer form close
  const handleCloseTransferForm = () => {
    setOpenTransferForm(false);
  };

  // Handle transfer form submit
  const handleTransferSubmit = async (transferData) => {
    try {
      await api.post('/bank-book/transfer', transferData);
      setNotification({
        open: true,
        message: 'Funds transferred successfully',
        severity: 'success'
      });
      
      // Refresh data
      fetchAccounts();
      fetchDashboardData();
      if (selectedAccount) {
        fetchAccountDetails(selectedAccount.account._id);
      }
      handleCloseTransferForm();
    } catch (err) {
      console.error('Error transferring funds:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Failed to transfer funds',
        severity: 'error'
      });
    }
  };

  // Handle account selection for details view
  const handleAccountSelect = (account) => {
    if (selectedAccount && selectedAccount.account._id === account._id) {
      setSelectedAccount(null); // Toggle off if already selected
    } else {
      fetchAccountDetails(account._id);
    }
  };

  // Handle delete dialog open
  const handleOpenDeleteDialog = (account) => {
    setAccountToDelete(account);
    setOpenDeleteDialog(true);
  };

  // Handle delete dialog close
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setAccountToDelete(null);
  };

  // Handle account delete
  const handleDeleteAccount = async () => {
    try {
      await api.delete(`/bank-book/accounts/${accountToDelete._id}`);
      setNotification({
        open: true,
        message: 'Bank account deleted successfully',
        severity: 'success'
      });
      
      // Refresh data
      fetchAccounts();
      fetchDashboardData();
      
      // If the deleted account is the currently selected one, clear selection
      if (selectedAccount && selectedAccount.account._id === accountToDelete._id) {
        setSelectedAccount(null);
      }
      
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting bank account:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Failed to delete bank account',
        severity: 'error'
      });
      handleCloseDeleteDialog();
    }
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

  // Loading state
  if (loading && accounts.length === 0) {
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
            onClick={() => fetchAccounts()}
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
            <AccountBalanceIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Bank Accounts
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
              <AccountBalanceIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Bank Accounts
            </Typography>
          </Breadcrumbs>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            Add Account
          </Button>
          <Button
            variant="outlined"
            startIcon={<CompareArrowsIcon />}
            onClick={handleOpenTransferForm}
            disabled={accounts.length < 2}
          >
            Transfer Funds
          </Button>
          <IconButton color="primary" onClick={() => {
            fetchAccounts();
            fetchDashboardData();
            if (selectedAccount) {
              fetchAccountDetails(selectedAccount.account._id);
            }
          }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Dashboard summary cards */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
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
                <Typography variant="h6" gutterBottom>Total Accounts</Typography>
                <Typography variant="h3" color="primary">
                  {dashboardData.totalAccounts}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Active: {dashboardData.activeAccounts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Total Balance</Typography>
                  <IconButton size="small" onClick={toggleBalanceVisibility}>
                    {hideBalances ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                  </IconButton>
                </Box>
                <Typography variant="h3" color="primary">
                  {hideBalances ? '********' : formatCurrency(dashboardData.totalBalance)}
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
          <Tab label="Accounts List" />
          <Tab label="Transactions" />
          <Tab label="Reports" />
        </Tabs>
      </Box>
      
      {/* Tab panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Accounts List */}
          <Grid item xs={12} md={selectedAccount ? 7 : 12}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Bank Accounts</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Search accounts..."
                    InputProps={{
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ width: 200 }}
                  />
                </Box>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Bank Name</TableCell>
                      <TableCell>Account Number</TableCell>
                      <TableCell>Account Type</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body1" sx={{ py: 2 }}>
                            No bank accounts found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((account) => (
                          <TableRow 
                            key={account._id}
                            hover
                            onClick={() => handleAccountSelect(account)}
                            selected={selectedAccount && selectedAccount.account._id === account._id}
                            sx={{ 
                              cursor: 'pointer',
                              '&.Mui-selected': {
                                backgroundColor: 'primary.lighter'
                              }
                            }}
                          >
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell>{account.bankName}</TableCell>
                            <TableCell>{account.accountNumber}</TableCell>
                            <TableCell>{account.accountType}</TableCell>
                            <TableCell>
                              {hideBalances ? '********' : formatCurrency(account.currentBalance)}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={account.isActive ? 'Active' : 'Inactive'} 
                                color={account.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Tooltip title="Edit">
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenForm(account);
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
                                      handleOpenDeleteDialog(account);
                                    }}
                                  >
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
                component="div"
                count={totalAccounts}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Paper>
          </Grid>
          
          {/* Account Details */}
          {selectedAccount && (
            <Grid item xs={12} md={5}>
              <AccountSummary 
                accountData={selectedAccount} 
                hideBalances={hideBalances}
                formatCurrency={formatCurrency}
                onRefresh={() => fetchAccountDetails(selectedAccount.account._id)}
              />
            </Grid>
          )}
        </Grid>
      )}
      
      {tabValue === 1 && (
        <Paper 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h6" gutterBottom>Transaction History</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Coming soon - Detailed transaction history including search, filter, and export capabilities
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Button variant="contained" color="primary" startIcon={<SyncIcon />}>
            Go to Transactions
          </Button>
        </Paper>
      )}
      
      {tabValue === 2 && (
        <Paper 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h6" gutterBottom>Bank Account Reports</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Coming soon - Comprehensive reports including statement reconciliation, transaction analysis, and cash flow reporting
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Button variant="contained" color="primary" startIcon={<SyncIcon />}>
            Go to Reports
          </Button>
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
      
      {/* Bank Account Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}</DialogTitle>
        <BankAccountForm 
          account={editingAccount}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
        />
      </Dialog>
      
      {/* Transfer Funds Form Dialog */}
      <Dialog open={openTransferForm} onClose={handleCloseTransferForm} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Funds Between Accounts</DialogTitle>
        <TransferFundsForm 
          accounts={accounts}
          onSubmit={handleTransferSubmit}
          onCancel={handleCloseTransferForm}
        />
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the bank account "{accountToDelete?.accountName}" from {accountToDelete?.bankName}?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All transaction history for this account will also be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
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

export default BankAccountsPage;