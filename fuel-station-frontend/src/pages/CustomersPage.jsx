// src/pages/CustomersPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  Grid,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Toolbar
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Clear as ClearIcon,
  Home as HomeIcon,
  Visibility as VisibilityIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

// Components
import CustomerForm from '../components/customers/CustomerForm';
import CustomerDetails from '../components/customers/CustomerDetails';

// Context
import AuthContext from '../context/AuthContext';

const CustomersPage = () => {
  const { api } = useContext(AuthContext);
  
  // States
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Menu
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionCustomer, setActionCustomer] = useState(null);
  
  // Notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare query parameters
      const params = {
        page,
        limit: rowsPerPage
      };
      
      // Add search and filter params
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      
      const response = await api.get('/customers', { params });
      setCustomers(response.data.data);
      setTotalCustomers(response.data.total);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchCustomers();
  }, [page, rowsPerPage, searchTerm, filterType, filterStatus]);

  // Fetch customer details
  const fetchCustomerDetails = async (customerId) => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${customerId}`);
      setSelectedCustomer(response.data.data);
      setDetailsOpen(true);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setNotification({
        open: true,
        message: 'Failed to load customer details',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle opening add/edit dialog
  const handleOpenDialog = (customer = null) => {
    setCurrentCustomer(customer);
    setOpenDialog(true);
  };

  // Handle form submission (add/edit)
  const handleSubmit = async (formData) => {
    try {
      if (currentCustomer) {
        // Update existing customer
        await api.put(`/customers/${currentCustomer._id}`, formData);
        setNotification({
          open: true,
          message: 'Customer updated successfully',
          severity: 'success'
        });
      } else {
        // Create new customer
        await api.post('/customers', formData);
        setNotification({
          open: true,
          message: 'Customer added successfully',
          severity: 'success'
        });
      }
      
      // Close dialog and refresh data
      setOpenDialog(false);
      fetchCustomers();
      
      // If this is the selected customer, refresh details
      if (selectedCustomer && currentCustomer && selectedCustomer._id === currentCustomer._id) {
        fetchCustomerDetails(currentCustomer._id);
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      throw new Error(err.response?.data?.message || 'Failed to save customer');
    }
  };

  // Handle deletion dialog
  const handleOpenDeleteDialog = (customer) => {
    setCurrentCustomer(customer);
    setOpenDeleteDialog(true);
    handleCloseActionMenu();
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${currentCustomer._id}`);
      setNotification({
        open: true,
        message: 'Customer deleted successfully',
        severity: 'success'
      });
      
      // Close dialog and refresh data
      setOpenDeleteDialog(false);
      fetchCustomers();
      
      // If this is the selected customer, close details panel
      if (selectedCustomer && selectedCustomer._id === currentCustomer._id) {
        setDetailsOpen(false);
        setSelectedCustomer(null);
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      setNotification({
        open: true,
        message: 'Failed to delete customer',
        severity: 'error'
      });
    }
  };

  // Handle row click to show details
  const handleRowClick = (customer) => {
    fetchCustomerDetails(customer._id);
  };

  // Handle action menu open
  const handleOpenActionMenu = (event, customer) => {
    event.stopPropagation();
    setActionMenuAnchorEl(event.currentTarget);
    setActionCustomer(customer);
  };

  // Handle action menu close
  const handleCloseActionMenu = () => {
    setActionMenuAnchorEl(null);
  };

  // Handle change page
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle change rows per page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setPage(0);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
  };

  // Handle close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Close details drawer
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Loading indicator
  if (loading && customers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, fontSize: 35, color: 'primary.main' }} />
            Customers
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
              <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Customers
            </Typography>
          </Breadcrumbs>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Customer
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Customers
              </Typography>
              <Typography variant="h4" component="div">
                {totalCustomers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Customers
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {customers.filter(c => c.status === 'Active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Corporate Accounts
              </Typography>
              <Typography variant="h4" component="div" color="primary.main">
                {customers.filter(c => c.type === 'Corporate').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Blacklisted
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {customers.filter(c => c.status === 'Blacklisted').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Customer Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="Individual">Individual</MenuItem>
              <MenuItem value="Corporate">Corporate</MenuItem>
              <MenuItem value="Government">Government</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Blacklisted">Blacklisted</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchCustomers}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Main Customers Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No customers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer._id}
                  hover
                  onClick={() => handleRowClick(customer)}
                  selected={selectedCustomer && selectedCustomer._id === customer._id}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{customer.customerId}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={customer.type}
                      color={customer.type === 'Corporate' ? 'primary' : customer.type === 'Government' ? 'secondary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{customer.contactInfo.email}</TableCell>
                  <TableCell>{customer.contactInfo.phone}</TableCell>
                  <TableCell>{customer.contactInfo.city}</TableCell>
                  <TableCell>
                    <Chip
                      label={customer.status}
                      color={
                        customer.status === 'Active'
                          ? 'success'
                          : customer.status === 'Inactive'
                          ? 'default'
                          : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenActionMenu(e, customer)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCustomers}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleCloseActionMenu}
      >
        <MenuItem
          onClick={() => {
            handleOpenDialog(actionCustomer);
            handleCloseActionMenu();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleRowClick(actionCustomer);
            handleCloseActionMenu();
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleOpenDeleteDialog(actionCustomer)}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete" primaryTypographyProps={{ color: 'error' }} />
        </MenuItem>
      </Menu>

      {/* Customer Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <CustomerForm 
          customer={currentCustomer} 
          onSubmit={handleSubmit} 
          onCancel={() => setOpenDialog(false)} 
        />
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Confirm Delete
          </Typography>
          <Typography>
            Are you sure you want to delete the customer "{currentCustomer?.name}"? This action cannot be undone.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="contained" 
            color="error"
          >
            Delete
          </Button>
        </Box>
      </Dialog>

      {/* Customer Details Drawer */}
      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={handleCloseDetails}
        sx={{
          width: 450,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 450,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        {selectedCustomer && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5">Customer Details</Typography>
              <IconButton onClick={handleCloseDetails}>
                <ClearIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Basic Info */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              {selectedCustomer.name}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Chip
                label={selectedCustomer.type}
                color={
                  selectedCustomer.type === 'Corporate'
                    ? 'primary'
                    : selectedCustomer.type === 'Government'
                    ? 'secondary'
                    : 'default'
                }
                sx={{ mr: 1 }}
              />
              <Chip
                label={selectedCustomer.status}
                color={
                  selectedCustomer.status === 'Active'
                    ? 'success'
                    : selectedCustomer.status === 'Inactive'
                    ? 'default'
                    : 'error'
                }
              />
            </Box>

            {/* Contact Info */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Contact Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>
                      {selectedCustomer.contactInfo.address}, {selectedCustomer.contactInfo.city}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{selectedCustomer.contactInfo.phone}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{selectedCustomer.contactInfo.email}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Credit Information - Corporate/Government only */}
            {(selectedCustomer.type === 'Corporate' || selectedCustomer.type === 'Government') && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Credit Information</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body1">Credit Limit:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(
                      selectedCustomer.creditLimit || 0
                    )}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Outstanding Balance:</Typography>
                  <Typography variant="body1" fontWeight="bold" color="error">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(
                      selectedCustomer.outstandingBalance || 0
                    )}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Authorized Persons - Corporate/Government only */}
            {selectedCustomer.authorizedPersons && selectedCustomer.authorizedPersons.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Authorized Persons</Typography>
                {selectedCustomer.authorizedPersons.map((person, index) => (
                  <Box key={index} sx={{ mb: index !== selectedCustomer.authorizedPersons.length - 1 ? 2 : 0 }}>
                    <Typography variant="body1" fontWeight="medium">{person.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{person.position}</Typography>
                    <Typography variant="body2">{person.contactNumber}</Typography>
                    {person.email && <Typography variant="body2">{person.email}</Typography>}
                    {index !== selectedCustomer.authorizedPersons.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))}
              </Paper>
            )}

            {/* Authorized Vehicles */}
            {selectedCustomer.authorizedVehicles && selectedCustomer.authorizedVehicles.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CarIcon sx={{ mr: 1 }} />
                  Authorized Vehicles
                </Typography>
                {selectedCustomer.authorizedVehicles.map((vehicle, index) => (
                  <Box key={index} sx={{ mb: index !== selectedCustomer.authorizedVehicles.length - 1 ? 2 : 0 }}>
                    <Typography variant="body1" fontWeight="medium">{vehicle.vehicleNumber}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {vehicle.vehicleType}
                      {vehicle.model && ` - ${vehicle.model}`}
                      {vehicle.color && ` (${vehicle.color})`}
                    </Typography>
                    {index !== selectedCustomer.authorizedVehicles.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))}
              </Paper>
            )}

            {/* Notes */}
            {selectedCustomer.notes && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Notes</Typography>
                <Typography variant="body2">{selectedCustomer.notes}</Typography>
              </Paper>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => handleOpenDialog(selectedCustomer)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleOpenDeleteDialog(selectedCustomer)}
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

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

export default CustomersPage;