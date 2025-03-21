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
  Link
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  LocalGasStation as LocalGasStationIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';

const InventoryPage = () => {
  const { api } = useContext(AuthContext);
  
  // State for inventory data
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for dialogs
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddStockDialog, setOpenAddStockDialog] = useState(false);
  const [openReduceStockDialog, setOpenReduceStockDialog] = useState(false);
  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  
  // Form states
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    stationId: '',
    fuelType: '',
    tankId: '',
    tankCapacity: '',
    currentVolume: '',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: '',
    status: 'Normal'
  });
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // State for summary data
  const [summary, setSummary] = useState({
    totalTanks: 0,
    totalValue: 0,
    lowStock: 0,
    criticalStock: 0
  });

  // Fetch inventory data
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory');
      if (response.data.success) {
        setInventory(response.data.data);
        setSummary({
          totalTanks: response.data.count,
          totalValue: response.data.totalValue,
          lowStock: response.data.data.filter(item => item.status === 'Low').length,
          criticalStock: response.data.data.filter(item => item.status === 'Critical').length
        });
      } else {
        setError('Failed to fetch inventory data');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Error fetching inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchInventory();
  }, []);

  // Handle change in form fields
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle add item dialog
  const handleOpenAddDialog = () => {
    setFormData({
      stationId: '',
      fuelType: '',
      tankId: '',
      tankCapacity: '',
      currentVolume: '',
      costPrice: '',
      sellingPrice: '',
      reorderLevel: '',
      status: 'Normal'
    });
    setOpenAddDialog(true);
  };

  // Handle edit item dialog
  const handleOpenEditDialog = (item) => {
    setCurrentItem(item);
    setFormData({
      stationId: item.stationId,
      fuelType: item.fuelType,
      tankId: item.tankId,
      tankCapacity: item.tankCapacity,
      currentVolume: item.currentVolume,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      reorderLevel: item.reorderLevel,
      status: item.status
    });
    setOpenEditDialog(true);
  };

  // Handle delete item dialog
  const handleOpenDeleteDialog = (item) => {
    setCurrentItem(item);
    setOpenDeleteDialog(true);
  };

  // Handle add stock dialog
  const handleOpenAddStockDialog = (item) => {
    setCurrentItem(item);
    setFormData({
      ...formData,
      volume: '',
      costPrice: item.costPrice,
      reference: '',
      notes: ''
    });
    setOpenAddStockDialog(true);
  };

  // Handle reduce stock dialog
  const handleOpenReduceStockDialog = (item) => {
    setCurrentItem(item);
    setFormData({
      ...formData,
      volume: '',
      reason: '',
      notes: ''
    });
    setOpenReduceStockDialog(true);
  };

  // Handle price update dialog
  const handleOpenPriceDialog = (item) => {
    setCurrentItem(item);
    setFormData({
      ...formData,
      newPrice: item.sellingPrice,
      reason: ''
    });
    setOpenPriceDialog(true);
  };

  // Close all dialogs
  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setOpenAddStockDialog(false);
    setOpenReduceStockDialog(false);
    setOpenPriceDialog(false);
    setCurrentItem(null);
  };

  // Submit add inventory form
  const handleAddInventory = async () => {
    try {
      const response = await api.post('/inventory', formData);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Inventory item added successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchInventory();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to add inventory item',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error adding inventory:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error adding inventory item',
        severity: 'error'
      });
    }
  };

  // Submit edit inventory form
  const handleEditInventory = async () => {
    try {
      const response = await api.put(`/inventory/${currentItem._id}`, formData);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Inventory item updated successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchInventory();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update inventory item',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating inventory:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error updating inventory item',
        severity: 'error'
      });
    }
  };

  // Delete inventory item
  const handleDeleteInventory = async () => {
    try {
      const response = await api.delete(`/inventory/${currentItem._id}`);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Inventory item deleted successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchInventory();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to delete inventory item',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting inventory:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error deleting inventory item',
        severity: 'error'
      });
    }
  };

  // Add stock to inventory
  const handleAddStock = async () => {
    try {
      const response = await api.post(`/inventory/${currentItem._id}/add-stock`, {
        volume: Number(formData.volume),
        costPrice: Number(formData.costPrice),
        reference: formData.reference,
        notes: formData.notes
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || 'Stock added successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchInventory();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to add stock',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error adding stock:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error adding stock',
        severity: 'error'
      });
    }
  };

  // Reduce stock from inventory
  const handleReduceStock = async () => {
    try {
      const response = await api.post(`/inventory/${currentItem._id}/reduce-stock`, {
        volume: Number(formData.volume),
        reason: formData.reason,
        notes: formData.notes
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || 'Stock reduced successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchInventory();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to reduce stock',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error reducing stock:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error reducing stock',
        severity: 'error'
      });
    }
  };

  // Update fuel price
  const handleUpdatePrice = async () => {
    try {
      const response = await api.post(`/inventory/${currentItem._id}/update-price`, {
        newPrice: Number(formData.newPrice),
        reason: formData.reason
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || 'Price updated successfully',
          severity: 'success'
        });
        handleCloseDialogs();
        fetchInventory();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update price',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating price:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Error updating price',
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

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Critical':
        return 'error';
      case 'Low':
        return 'warning';
      case 'Replenishing':
        return 'info';
      default:
        return 'success';
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(value);
  };

  // Calculate percentage of capacity
  const calculatePercentage = (current, capacity) => {
    return Math.round((current / capacity) * 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            <InventoryIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Fuel Inventory Management
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
              <InventoryIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Inventory
            </Typography>
          </Breadcrumbs>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add New Tank
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Tanks
              </Typography>
              <Typography variant="h4" component="div">
                {summary.totalTanks}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Across all stations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Inventory Value
              </Typography>
              <Typography variant="h4" component="div">
                {formatCurrency(summary.totalValue)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Based on current cost price
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ 
              backgroundColor: summary.lowStock > 0 ? 'rgba(255, 193, 7, 0.1)' : 'inherit',
              borderLeft: summary.lowStock > 0 ? '4px solid #FFC107' : 'none'
            }}>
              <Typography color="textSecondary" gutterBottom>
                Low Stock
              </Typography>
              <Typography variant="h4" component="div">
                {summary.lowStock}
              </Typography>
              <Typography variant="body2" color={summary.lowStock > 0 ? 'warning.main' : 'textSecondary'}>
                {summary.lowStock > 0 ? 'Requires attention' : 'All tanks at healthy levels'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ 
              backgroundColor: summary.criticalStock > 0 ? 'rgba(244, 67, 54, 0.1)' : 'inherit',
              borderLeft: summary.criticalStock > 0 ? '4px solid #F44336' : 'none'
            }}>
              <Typography color="textSecondary" gutterBottom>
                Critical Stock
              </Typography>
              <Typography variant="h4" component="div">
                {summary.criticalStock}
              </Typography>
              <Typography variant="body2" color={summary.criticalStock > 0 ? 'error.main' : 'textSecondary'}>
                {summary.criticalStock > 0 ? 'Immediate action required' : 'No critical stock issues'}
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

      {/* Inventory Table */}
      <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Fuel Inventory List
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchInventory}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        <Divider />
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="inventory table">
            <TableHead>
              <TableRow>
                <TableCell>Fuel Type</TableCell>
                <TableCell>Tank ID</TableCell>
                <TableCell>Station</TableCell>
                <TableCell align="right">Capacity (L)</TableCell>
                <TableCell align="right">Current (L)</TableCell>
                <TableCell align="right">% Full</TableCell>
                <TableCell align="right">Cost Price</TableCell>
                <TableCell align="right">Selling Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                    <Typography>Loading inventory data...</Typography>
                  </TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography>No inventory items found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                inventory
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>{item.fuelType}</TableCell>
                      <TableCell>{item.tankId}</TableCell>
                      <TableCell>{item.stationId}</TableCell>
                      <TableCell align="right">{item.tankCapacity.toLocaleString()}</TableCell>
                      <TableCell align="right">{item.currentVolume.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={calculatePercentage(item.currentVolume, item.tankCapacity)}
                              color={item.status === 'Critical' ? 'error' : item.status === 'Low' ? 'warning' : 'success'}
                              sx={{ height: 8, borderRadius: 5 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {calculatePercentage(item.currentVolume, item.tankCapacity)}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.costPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.sellingPrice)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.status} 
                          color={getStatusColor(item.status)} 
                          size="small" 
                          sx={{ minWidth: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEditDialog(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Stock">
                            <IconButton size="small" color="success" onClick={() => handleOpenAddStockDialog(item)}>
                              <TrendingUpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reduce Stock">
                            <IconButton size="small" color="warning" onClick={() => handleOpenReduceStockDialog(item)}>
                              <TrendingDownIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Update Price">
                            <IconButton size="small" color="primary" onClick={() => handleOpenPriceDialog(item)}>
                              <LocalGasStationIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(item)}>
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
          count={inventory.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Add Inventory Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Tank</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="stationId"
                label="Station ID"
                value={formData.stationId}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="tankId"
                label="Tank ID"
                value={formData.tankId}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="fuelType"
                label="Fuel Type"
                value={formData.fuelType}
                onChange={handleFormChange}
                required
                select
              >
                <MenuItem value="Petrol 92">Petrol 92</MenuItem>
                <MenuItem value="Petrol 95">Petrol 95</MenuItem>
                <MenuItem value="Auto Diesel">Auto Diesel</MenuItem>
                <MenuItem value="Super Diesel">Super Diesel</MenuItem>
                <MenuItem value="Kerosene">Kerosene</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="tankCapacity"
                label="Tank Capacity (L)"
                type="number"
                value={formData.tankCapacity}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="currentVolume"
                label="Current Volume (L)"
                type="number"
                value={formData.currentVolume}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="costPrice"
                label="Cost Price (LKR)"
                type="number"
                value={formData.costPrice}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="sellingPrice"
                label="Selling Price (LKR)"
                type="number"
                value={formData.sellingPrice}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="reorderLevel"
                label="Reorder Level (L)"
                type="number"
                value={formData.reorderLevel}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleAddInventory} variant="contained" color="primary">
            Add Tank
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Inventory Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Tank</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="tankCapacity"
                label="Tank Capacity (L)"
                type="number"
                value={formData.tankCapacity}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="sellingPrice"
                label="Selling Price (LKR)"
                type="number"
                value={formData.sellingPrice}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="reorderLevel"
                label="Reorder Level (L)"
                type="number"
                value={formData.reorderLevel}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="status"
                label="Status"
                value={formData.status}
                onChange={handleFormChange}
                required
                select
              >
                <MenuItem value="Normal">Normal</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="Replenishing">Replenishing</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleEditInventory} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Delete Tank</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete tank {currentItem?.tankId} ({currentItem?.fuelType}) from station {currentItem?.stationId}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleDeleteInventory} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={openAddStockDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stock</DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            Adding stock to tank {currentItem?.tankId} ({currentItem?.fuelType})
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="volume"
                label="Volume to Add (L)"
                type="number"
                value={formData.volume}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="costPrice"
                label="Cost Price (LKR)"
                type="number"
                value={formData.costPrice}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="reference"
                label="Reference (e.g., PO Number)"
                value={formData.reference}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
          {currentItem && (
            <Box sx={{ mt: 2, mb: 1, p: 1, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Current volume: {currentItem.currentVolume.toLocaleString()} L | 
                Tank capacity: {currentItem.tankCapacity.toLocaleString()} L |
                Available space: {(currentItem.tankCapacity - currentItem.currentVolume).toLocaleString()} L
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleAddStock} variant="contained" color="primary">
            Add Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reduce Stock Dialog */}
      <Dialog open={openReduceStockDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Reduce Stock</DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            Reducing stock from tank {currentItem?.tankId} ({currentItem?.fuelType})
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="volume"
                label="Volume to Reduce (L)"
                type="number"
                value={formData.volume}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="reason"
                label="Reason"
                value={formData.reason}
                onChange={handleFormChange}
                required
                select
              >
                <MenuItem value="Manual Adjustment">Manual Adjustment</MenuItem>
                <MenuItem value="Loss">Loss</MenuItem>
                <MenuItem value="Testing">Testing</MenuItem>
                <MenuItem value="Evaporation">Evaporation</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
          {currentItem && (
            <Box sx={{ mt: 2, mb: 1, p: 1, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Current volume: {currentItem.currentVolume.toLocaleString()} L
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleReduceStock} variant="contained" color="warning">
            Reduce Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Price Dialog */}
      <Dialog open={openPriceDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Update Fuel Price</DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            Updating price for {currentItem?.fuelType} in tank {currentItem?.tankId}
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="newPrice"
                label="New Price (LKR)"
                type="number"
                value={formData.newPrice}
                onChange={handleFormChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="reason"
                label="Reason for Price Change"
                value={formData.reason}
                onChange={handleFormChange}
                required
              />
            </Grid>
          </Grid>
          {currentItem && (
            <Box sx={{ mt: 2, mb: 1, p: 1, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Current price: {formatCurrency(currentItem.sellingPrice)} | 
                Cost price: {formatCurrency(currentItem.costPrice)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleUpdatePrice} variant="contained" color="primary">
            Update Price
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
  );
};

// Linear Progress component for tank level visualization
const LinearProgress = ({ value, ...props }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          height: 10,
          borderRadius: 5,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: props.color === 'error' 
              ? '#f44336' 
              : props.color === 'warning' 
                ? '#ff9800' 
                : '#4caf50',
            width: `${Math.min(Math.max(value, 0), 100)}%`,
            borderRadius: 5,
            transition: 'width 0.4s ease-in-out'
          }}
        />
      </Box>
    </Box>
  );
};

export default InventoryPage;