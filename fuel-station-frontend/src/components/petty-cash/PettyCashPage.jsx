import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Container, Box, Typography, Paper, Tabs, Tab, Divider,
  Button, IconButton, CircularProgress, Alert, Snackbar
} from '@mui/material';
import { MoneyOff, Refresh, MonetizationOn, BugReport } from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';
import pettyCashAPI from '../../services/petty-cash.service';

// Import sub-components
import PettyCashBalance from './PettyCashBalance';
import PettyCashTransactionList from './PettyCashTransactionList';
import WithdrawalRequestDialog from './WithdrawalRequestDialog';
import ReplenishmentDialog from './ReplenishmentDialog';
import PettyCashSummary from './PettyCashSummary';

const PettyCashPage = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);  // Set to false initially to prevent showing loader forever
  const [error, setError] = useState(null);
  
  // Initialize with default empty data to ensure the UI always has something to display
  const [balanceData, setBalanceData] = useState({
    balance: {
      currentBalance: 0,
      maxLimit: 10000,
      minLimit: 2000,
      stationId: "ST001",
      lastReplenishmentAmount: 0,
      lastReplenishmentDate: null
    },
    needsReplenishment: false,
    latestTransactions: []
  });
  
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    period: {
      name: "month",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString()
    },
    summary: {
      currentBalance: 0,
      totalWithdrawals: 0,
      totalReplenishments: 0,
      netChange: 0,
      withdrawalCount: 0,
      replenishmentCount: 0,
      withdrawalsByCategory: {}
    },
    trend: []
  });
  
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [replenishmentDialogOpen, setReplenishmentDialogOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(true);  // Set to true to prevent infinite loading
  const [debug, setDebug] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Default stationId 
  const DEFAULT_STATION_ID = "ST001";

  //const isAdmin = true;  // Hardcode as true for now to ensure buttons show
  //const isManager = true;
  const isManagerOrAdmin = true;

  // Function to show snackbar message
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Function to close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Function to load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load balance
      const balanceResponse = await pettyCashAPI.getBalance(user?.stationId || DEFAULT_STATION_ID);
      if (balanceResponse.data?.success && balanceResponse.data?.data) {
        setBalanceData(balanceResponse.data.data);
      }
      
      // Load transactions
      const transactionsResponse = await pettyCashAPI.getAllTransactions({
        stationId: user?.stationId || DEFAULT_STATION_ID,
        limit: 50,
        sort: '-date'
      });
      
      if (transactionsResponse.data?.success && transactionsResponse.data?.data) {
        setTransactions(transactionsResponse.data.data);
      }
      
      // Load summary
      const summaryResponse = await pettyCashAPI.getSummary({
        stationId: user?.stationId || DEFAULT_STATION_ID,
        period: 'month'
      });
      
      if (summaryResponse.data?.success && summaryResponse.data?.data) {
        setSummary(summaryResponse.data.data);
      }
      
      setDataLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user?.stationId]);

  // Load data on component mount and refresh
  useEffect(() => {
    loadData();
  }, [loadData, refresh]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefresh(prev => prev + 1);
  };

  // Handle withdrawal request submission
  const handleWithdrawalSubmit = async (formData) => {
    try {
      // Ensure stationId is set
      if (!formData.stationId) {
        formData.stationId = user?.stationId || DEFAULT_STATION_ID;
      }
      
      const response = await pettyCashAPI.createWithdrawalRequest(formData);
      
      if (response.data?.success) {
        showSnackbar('Withdrawal request submitted successfully', 'success');
        handleRefresh();
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to submit withdrawal request');
      }
    } catch (err) {
      console.error('Error submitting withdrawal request:', err);
      showSnackbar('Failed to submit withdrawal request', 'error');
      return false;
    }
  };

  // Handle replenishment submission
  const handleReplenishmentSubmit = async (formData) => {
    try {
      // Ensure stationId is set
      if (!formData.stationId) {
        formData.stationId = user?.stationId || DEFAULT_STATION_ID;
      }
      
      const response = await pettyCashAPI.createReplenishment(formData);
      
      if (response.data?.success) {
        showSnackbar('Replenishment submitted successfully', 'success');
        handleRefresh();
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to submit replenishment');
      }
    } catch (err) {
      console.error('Error submitting replenishment:', err);
      showSnackbar('Failed to submit replenishment', 'error');
      return false;
    }
  };

  // Handle transaction approval
  const handleApproveTransaction = async (id) => {
    try {
      const response = await pettyCashAPI.approveTransaction(id);
      
      if (response.data?.success) {
        showSnackbar('Transaction approved successfully', 'success');
        handleRefresh();
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to approve transaction');
      }
    } catch (err) {
      console.error('Error approving transaction:', err);
      showSnackbar('Failed to approve transaction', 'error');
      return false;
    }
  };

  // Handle transaction rejection
  const handleRejectTransaction = async (id, reason) => {
    try {
      const response = await pettyCashAPI.rejectTransaction(id, { rejectionReason: reason });
      
      if (response.data?.success) {
        showSnackbar('Transaction rejected successfully', 'success');
        handleRefresh();
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to reject transaction');
      }
    } catch (err) {
      console.error('Error rejecting transaction:', err);
      showSnackbar('Failed to reject transaction', 'error');
      return false;
    }
  };

  // Handle transaction deletion
  const handleDeleteTransaction = async (id) => {
    try {
      const response = await pettyCashAPI.deleteTransaction(id);
      
      if (response.data?.success) {
        showSnackbar('Transaction deleted successfully', 'success');
        handleRefresh();
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to delete transaction');
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showSnackbar('Failed to delete transaction', 'error');
      return false;
    }
  };

  // Handle receipt upload
  const handleUploadReceipt = async (id, formData) => {
    try {
      const response = await pettyCashAPI.uploadReceipt(id, formData);
      
      if (response.data?.success) {
        showSnackbar('Receipt uploaded successfully', 'success');
        handleRefresh();
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to upload receipt');
      }
    } catch (err) {
      console.error('Error uploading receipt:', err);
      showSnackbar('Failed to upload receipt', 'error');
      return false;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h1">
            Petty Cash Management
          </Typography>
          <Box>
            <IconButton onClick={handleRefresh} color="primary" title="Refresh Data">
              <Refresh />
            </IconButton>
            <Button 
              variant="contained" 
              startIcon={<MoneyOff />}
              onClick={() => setWithdrawalDialogOpen(true)}
              sx={{ ml: 1 }}
            >
              Request Withdrawal
            </Button>
            {isManagerOrAdmin && (
              <Button 
                variant="contained" 
                color="success"
                startIcon={<MonetizationOn />}
                onClick={() => setReplenishmentDialogOpen(true)}
                sx={{ ml: 1 }}
              >
                Replenish
              </Button>
            )}
            <IconButton 
              onClick={() => {
                setDebug(!debug);
                showSnackbar(debug ? 'Debug mode disabled' : 'Debug mode enabled', 'info');
              }} 
              color={debug ? "error" : "default"}
              title="Toggle Debug Mode"
              sx={{ ml: 1 }}
            >
              <BugReport />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Debug info */}
        {debug && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Debug Info:</strong> StationID: {user?.stationId || DEFAULT_STATION_ID || 'Not set'}, 
              User Role: {user?.role || 'Not set'}, 
              Data Loaded: {dataLoaded ? 'Yes' : 'No'},
              Balance: {balanceData ? balanceData.balance?.currentBalance : 'N/A'},
              Transactions: {transactions ? transactions.length : 0}
            </Typography>
          </Alert>
        )}

        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" my={4}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading petty cash data...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
            <Box mt={2}>
              <Button 
                variant="contained"
                color="primary"
                size="small"
                onClick={handleRefresh}
              >
                Retry
              </Button>
            </Box>
          </Alert>
        ) : (
          <>
            {/* Balance Section */}
            <PettyCashBalance 
              balanceData={balanceData} 
              isManagerOrAdmin={isManagerOrAdmin}
              onUpdateSettings={handleRefresh}
            />

            {/* Tabs */}
            <Box sx={{ mt: 4 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Transactions" />
                <Tab label="Summary" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <Box sx={{ mt: 2 }}>
              {activeTab === 0 && (
                <PettyCashTransactionList 
                  transactions={transactions || []}
                  isManagerOrAdmin={isManagerOrAdmin}
                  onApprove={handleApproveTransaction}
                  onReject={handleRejectTransaction}
                  onDelete={handleDeleteTransaction}
                  onUploadReceipt={handleUploadReceipt}
                />
              )}
              {activeTab === 1 && (
                <PettyCashSummary summary={summary} />
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* Dialogs */}
      <WithdrawalRequestDialog 
        open={withdrawalDialogOpen}
        onClose={() => setWithdrawalDialogOpen(false)}
        onSubmit={handleWithdrawalSubmit}
        stationId={user?.stationId || DEFAULT_STATION_ID}
        currentBalance={balanceData?.balance?.currentBalance || 0}
      />

      <ReplenishmentDialog 
        open={replenishmentDialogOpen}
        onClose={() => setReplenishmentDialogOpen(false)}
        onSubmit={handleReplenishmentSubmit}
        stationId={user?.stationId || DEFAULT_STATION_ID}
      />

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
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PettyCashPage;