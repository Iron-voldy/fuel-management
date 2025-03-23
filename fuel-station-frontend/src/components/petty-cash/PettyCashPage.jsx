import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Container, Box, Typography, Paper, Tabs, Tab, Divider,
  Button, IconButton, CircularProgress, Alert, Grid
} from '@mui/material';
import { Add, MoneyOff, Refresh, MonetizationOn } from '@mui/icons-material';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [replenishmentDialogOpen, setReplenishmentDialogOpen] = useState(false);
  const [refresh, setRefresh] = useState(0); // Used to trigger data refresh
  const [dataLoaded, setDataLoaded] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isManagerOrAdmin = isAdmin || isManager;

  // Function to load balance data
  const loadBalanceData = useCallback(async () => {
    try {
      // Don't include the trailing slash when no stationId is provided
      const response = await pettyCashAPI.getBalance(user?.stationId);
      
      if (response.data && response.data.success) {
        setBalanceData(response.data.data);
        return true;
      } else {
        console.log("Invalid balance data response format");
        return false;
      }
    } catch (err) {
      console.error('Error loading petty cash balance:', err);
      return false;
    }
  }, [user?.stationId]);

  // Function to load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const params = {
        limit: 50,
        sort: '-date'
      };
      
      if (user?.stationId) {
        params.stationId = user.stationId;
      }
      
      const response = await pettyCashAPI.getAllTransactions(params);
      
      if (response.data && response.data.success) {
        setTransactions(response.data.data || []);
        return true;
      } else {
        console.log("Invalid transactions response format");
        return false;
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      return false;
    }
  }, [user?.stationId]);

  // Function to load summary data
  const loadSummary = useCallback(async () => {
    try {
      const params = { period: 'month' };
      
      if (user?.stationId) {
        params.stationId = user.stationId;
      }
      
      const response = await pettyCashAPI.getSummary(params);
      
      if (response.data && response.data.success) {
        setSummary(response.data.data);
        return true;
      } else {
        console.log("Invalid summary response format");
        return false;
      }
    } catch (err) {
      console.error('Error loading summary:', err);
      return false;
    }
  }, [user?.stationId]);

  // Load all data
  const loadAllData = useCallback(async () => {
    // Prevent duplicate loading
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    let errorMessages = [];
    let successCount = 0;
    
    // Track success and failures
    const balanceSuccess = await loadBalanceData();
    if (!balanceSuccess) errorMessages.push('Error loading balance data.');
    else successCount++;
    
    const transactionsSuccess = await loadTransactions();
    if (!transactionsSuccess) errorMessages.push('Error loading transactions.');
    else successCount++;
    
    const summarySuccess = await loadSummary();
    if (!summarySuccess) errorMessages.push('Error loading summary.');
    else successCount++;
    
    // Set error message if any operations failed
    if (errorMessages.length > 0) {
      setError(errorMessages.join(' '));
    }
    
    // Even if there are some errors, if we loaded at least some data successfully,
    // we'll consider the data as loaded to prevent continuous reloading
    if (successCount > 0) {
      setDataLoaded(true);
    }
    
    setLoading(false);
  }, [loading, loadBalanceData, loadTransactions, loadSummary]);

  // Load data on component mount and when refresh changes
  useEffect(() => {
    // Only load if not already loaded or if refresh was triggered
    if (!dataLoaded || refresh > 0) {
      loadAllData();
    }
  }, [refresh, dataLoaded, loadAllData]);

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
      setError(null);
      const response = await pettyCashAPI.createWithdrawalRequest(formData);
      
      if (response.data && response.data.success) {
        handleRefresh();
        return true;
      } else {
        throw new Error('Failed to submit withdrawal request');
      }
    } catch (err) {
      console.error('Error submitting withdrawal request:', err);
      setError('Error submitting withdrawal request. Please try again.');
      return false;
    }
  };

  // Handle replenishment submission
  const handleReplenishmentSubmit = async (formData) => {
    try {
      setError(null);
      const response = await pettyCashAPI.createReplenishment(formData);
      
      if (response.data && response.data.success) {
        handleRefresh();
        return true;
      } else {
        throw new Error('Failed to submit replenishment');
      }
    } catch (err) {
      console.error('Error submitting replenishment:', err);
      setError('Error submitting replenishment. Please try again.');
      return false;
    }
  };

  // Handle transaction approval
  const handleApproveTransaction = async (id) => {
    try {
      setError(null);
      const response = await pettyCashAPI.approveTransaction(id);
      
      if (response.data && response.data.success) {
        handleRefresh();
        return true;
      } else {
        throw new Error('Failed to approve transaction');
      }
    } catch (err) {
      console.error('Error approving transaction:', err);
      setError('Error approving transaction. Please try again.');
      return false;
    }
  };

  // Handle transaction rejection
  const handleRejectTransaction = async (id, reason) => {
    try {
      setError(null);
      const response = await pettyCashAPI.rejectTransaction(id, { rejectionReason: reason });
      
      if (response.data && response.data.success) {
        handleRefresh();
        return true;
      } else {
        throw new Error('Failed to reject transaction');
      }
    } catch (err) {
      console.error('Error rejecting transaction:', err);
      setError('Error rejecting transaction. Please try again.');
      return false;
    }
  };

  // Handle transaction deletion
  const handleDeleteTransaction = async (id) => {
    try {
      setError(null);
      const response = await pettyCashAPI.deleteTransaction(id);
      
      if (response.data && response.data.success) {
        handleRefresh();
        return true;
      } else {
        throw new Error('Failed to delete transaction');
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Error deleting transaction. Please try again.');
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
            <IconButton onClick={handleRefresh} color="primary">
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
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {loading && !dataLoaded ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <>
            {/* Balance Section */}
            <PettyCashBalance 
              balanceData={balanceData} 
              isManagerOrAdmin={isManagerOrAdmin}
              onUpdateSettings={() => handleRefresh()}
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
                  transactions={transactions}
                  isManagerOrAdmin={isManagerOrAdmin}
                  onApprove={handleApproveTransaction}
                  onReject={handleRejectTransaction}
                  onDelete={handleDeleteTransaction}
                  onUploadReceipt={(id, formData) => pettyCashAPI.uploadReceipt(id, formData)}
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
        stationId={user?.stationId}
        currentBalance={balanceData?.balance?.currentBalance || 0}
      />

      <ReplenishmentDialog 
        open={replenishmentDialogOpen}
        onClose={() => setReplenishmentDialogOpen(false)}
        onSubmit={handleReplenishmentSubmit}
        stationId={user?.stationId}
      />
    </Container>
  );
};

export default PettyCashPage;