import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, 
  DialogActions, TextField, FormControl, InputLabel, 
  Select, MenuItem, TablePagination, useTheme, Input, Alert,
  Grid, alpha
} from '@mui/material';
import { 
  CheckCircle, Cancel, Delete, Receipt, 
  PictureAsPdf, MoreVert, Visibility, Edit
} from '@mui/icons-material';

const PettyCashTransactionList = ({ 
  transactions, 
  isManagerOrAdmin, 
  onApprove, 
  onReject, 
  onDelete,
  onUploadReceipt
}) => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'Pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get transaction type color
  const getTypeColor = (type) => {
    return type === 'withdrawal' ? 'error' : 'success';
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

  // Handle approval
  const handleApprove = async (transaction) => {
    await onApprove(transaction._id);
  };

  // Handle rejection dialog open
  const handleRejectDialogOpen = (transaction) => {
    setSelectedTransaction(transaction);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  // Handle rejection dialog close
  const handleRejectDialogClose = () => {
    setRejectDialogOpen(false);
    setSelectedTransaction(null);
  };

  // Handle rejection submission
  const handleRejectSubmit = async () => {
    if (selectedTransaction && rejectionReason.trim()) {
      await onReject(selectedTransaction._id, rejectionReason);
      handleRejectDialogClose();
    }
  };

  // Handle delete dialog open
  const handleDeleteDialogOpen = (transaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedTransaction(null);
  };

  // Handle delete submission
  const handleDeleteSubmit = async () => {
    if (selectedTransaction) {
      await onDelete(selectedTransaction._id);
      handleDeleteDialogClose();
    }
  };

  // Handle receipt dialog open
  const handleReceiptDialogOpen = (transaction) => {
    setSelectedTransaction(transaction);
    setReceiptFile(null);
    setReceiptDialogOpen(true);
  };

  // Handle receipt dialog close
  const handleReceiptDialogClose = () => {
    setReceiptDialogOpen(false);
    setSelectedTransaction(null);
    setReceiptFile(null);
    setError(null);
  };

  // Handle receipt file change
  const handleReceiptFileChange = (event) => {
    setReceiptFile(event.target.files[0]);
  };

  // Handle receipt upload
  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      
      await onUploadReceipt(selectedTransaction._id, formData);
      handleReceiptDialogClose();
    } catch (err) {
      console.error('Error uploading receipt:', err);
      setError('Error uploading receipt. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (filterStatus !== 'all' && transaction.approvalStatus !== filterStatus) {
      return false;
    }
    if (filterType !== 'all' && transaction.transactionType !== filterType) {
      return false;
    }
    return true;
  });

  // Paginate transactions
  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Handle view details
  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };
  
  // Handle details dialog close
  const handleDetailsDialogClose = () => {
    setDetailsDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  // Return empty state if no transactions
  if (!transactions || transactions.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary" sx={{ py: 3 }}>
          No petty cash transactions found
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label="Type"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="withdrawal">Withdrawals</MenuItem>
            <MenuItem value="replenishment">Replenishments</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Transactions Table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.map((transaction) => (
              <TableRow 
                key={transaction._id}
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  backgroundColor: transaction.approvalStatus === 'Pending' ? 
                    alpha(theme.palette.warning.light, 0.1) : 'inherit'
                }}
              >
                <TableCell component="th" scope="row">
                  {transaction.transactionId || 'N/A'}
                </TableCell>
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell>
                  {transaction.description.length > 30 
                    ? `${transaction.description.substring(0, 30)}...` 
                    : transaction.description}
                </TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell>
                  <Chip 
                    label={transaction.transactionType === 'withdrawal' ? 'Withdrawal' : 'Replenishment'} 
                    color={getTypeColor(transaction.transactionType)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                <TableCell>
                  <Chip 
                    label={transaction.approvalStatus} 
                    color={getStatusColor(transaction.approvalStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    onClick={() => handleViewDetails(transaction)}
                    title="View Details"
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                  
                  {/* Show approve/reject buttons for managers/admins on pending withdrawals */}
                  {isManagerOrAdmin && transaction.approvalStatus === 'Pending' && 
                   transaction.transactionType === 'withdrawal' && (
                    <>
                      <IconButton 
                        size="small" 
                        color="success"
                        onClick={() => handleApprove(transaction)}
                        title="Approve"
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRejectDialogOpen(transaction)}
                        title="Reject"
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </>
                  )}
                  
                  {/* Show delete button for appropriate users */}
                  {(isManagerOrAdmin || 
                   transaction.requestedBy === (transaction.requestedBy?._id || transaction.requestedBy)) && (
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteDialogOpen(transaction)}
                      title="Delete"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                  
                  {/* Show receipt upload button */}
                  {transaction.approvalStatus === 'Approved' && 
                   transaction.transactionType === 'withdrawal' && (
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleReceiptDialogOpen(transaction)}
                      title={transaction.receiptUrl ? "View/Update Receipt" : "Upload Receipt"}
                    >
                      <Receipt fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredTransactions.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleRejectDialogClose}>
        <DialogTitle>Reject Withdrawal Request</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a reason for rejecting this withdrawal request.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectDialogClose}>Cancel</Button>
          <Button 
            onClick={handleRejectSubmit} 
            color="error" 
            variant="contained"
            disabled={!rejectionReason.trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteSubmit} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Upload Dialog */}
      <Dialog open={receiptDialogOpen} onClose={handleReceiptDialogClose}>
        <DialogTitle>
          {selectedTransaction?.receiptUrl ? "Update Receipt" : "Upload Receipt"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {selectedTransaction?.receiptUrl && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Receipt
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                href={selectedTransaction.receiptUrl}
                target="_blank"
                size="small"
              >
                View Current Receipt
              </Button>
            </Box>
          )}
          
          <DialogContentText sx={{ mt: 1, mb: 2 }}>
            Upload a receipt or invoice for this transaction. Supported formats: JPG, PNG, PDF (max 5MB).
          </DialogContentText>
          
          <Input
            type="file"
            inputProps={{ 
              accept: "image/jpeg,image/png,image/jpg,application/pdf" 
            }}
            onChange={handleReceiptFileChange}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReceiptDialogClose}>Cancel</Button>
          <Button 
            onClick={handleReceiptUpload} 
            color="primary" 
            variant="contained"
            disabled={!receiptFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.transactionId}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedTransaction.date)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.transactionType === 'withdrawal' ? 'Withdrawal' : 'Replenishment'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={selectedTransaction.approvalStatus} 
                    color={getStatusColor(selectedTransaction.approvalStatus)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.category}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(selectedTransaction.amount)}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="body2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedTransaction.description}
              </Typography>
              
              {selectedTransaction.notes && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTransaction.notes}
                  </Typography>
                </>
              )}
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Requested By
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.requestedBy?.name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Approved/Rejected By
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.approvedBy?.name || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedTransaction.receiptUrl && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Receipt
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdf />}
                    href={selectedTransaction.receiptUrl}
                    target="_blank"
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    View Receipt
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PettyCashTransactionList;