import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountIcon,
  NoteAdd as NoteIcon,
  EventNote as EventNoteIcon,
  LocalAtm as CashIcon,
  CompareArrows as TransferIcon
} from '@mui/icons-material';

const AccountSummary = ({ accountData, hideBalances, formatCurrency, onRefresh }) => {
  // Handle loading state
  if (!accountData) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  const { account, recentTransactions, summary } = accountData;

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Account Details</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Main Account Info */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.lighter', 
        borderRadius: 2,
        mb: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AccountIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5">
            {account.accountName}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {account.bankName} • {account.accountNumber}
        </Typography>
        <Typography variant="h4" color="primary.main" fontWeight="medium">
          {hideBalances ? '********' : formatCurrency(account.currentBalance)}
        </Typography>
        <Chip 
          label={account.isActive ? 'Active' : 'Inactive'} 
          color={account.isActive ? 'success' : 'default'}
          size="small"
          sx={{ mt: 1 }}
        />
      </Box>
      
      {/* Account Details */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.lighter' }}>
            <Typography variant="body2" color="text.secondary">Deposits</Typography>
            <Typography variant="h6" color="success.main">
              {hideBalances ? '****' : formatCurrency(summary?.totalDeposits || 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'error.lighter' }}>
            <Typography variant="body2" color="text.secondary">Withdrawals</Typography>
            <Typography variant="h6" color="error.main">
              {hideBalances ? '****' : formatCurrency(summary?.totalWithdrawals || 0)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Additional Info */}
      <Typography variant="subtitle1" gutterBottom>Account Information</Typography>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={1}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Account Type</Typography>
            <Typography variant="body1">{account.accountType}</Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="body2" color="text.secondary">Branch</Typography>
            <Typography variant="body1">{account.branchName || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Opening Balance</Typography>
            <Typography variant="body1">
              {hideBalances ? '****' : formatCurrency(account.openingBalance)}
            </Typography>
          </Grid>
          {account.lastReconciled && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Last Reconciled</Typography>
              <Typography variant="body1">
                {new Date(account.lastReconciled).toLocaleDateString()}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>
      
      {/* Recent Transactions */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>Recent Transactions</Typography>
        {recentTransactions && recentTransactions.length > 0 ? (
          <List sx={{ 
            maxHeight: 250, 
            overflow: 'auto', 
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            {recentTransactions.map((transaction, index) => (
              <React.Fragment key={transaction._id || index}>
                <ListItem>
                  <ListItemText
                    primary={transaction.description}
                    secondary={
                      <>
                        {new Date(transaction.date).toLocaleDateString()} • {transaction.type}
                      </>
                    }
                  />
                  <Typography 
                    variant="body2" 
                    color={transaction.type === 'deposit' ? 'success.main' : 'error.main'}
                    sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}
                  >
                    {hideBalances ? '****' : formatCurrency(transaction.amount)}
                  </Typography>
                </ListItem>
                {index < recentTransactions.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No recent transactions found
          </Typography>
        )}
      </Box>
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" size="small" startIcon={<ReceiptIcon />}>
          View Statements
        </Button>
        <Button variant="outlined" size="small" startIcon={<CashIcon />}>
          Record Transaction
        </Button>
      </Box>
      
      {/* Notes */}
      {account.notes && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">
            <NoteIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
            Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {account.notes}
          </Typography>
        </Box>
      )}
      
      {/* Footer */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          <EventNoteIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          Created: {new Date(account.createdAt).toLocaleString()} • 
          Last Updated: {new Date(account.updatedAt).toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AccountSummary;