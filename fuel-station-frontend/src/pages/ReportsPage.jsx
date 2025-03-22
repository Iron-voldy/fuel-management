import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Breadcrumbs,
  Link,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  LocalGasStation as GasStationIcon,
  ReceiptLong as ReceiptIcon,
  AccountBalance as AccountBalanceIcon,
  AttachMoney as AttachMoneyIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  LocalAtm as LocalAtmIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Money as MoneyIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';
import ReportsService from '../services/reports.service';

const ReportsPage = () => {
  const { api, user } = useContext(AuthContext);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    endDate: new Date()
  });
  const [reportFormat, setReportFormat] = useState('pdf');
  const [reportData, setReportData] = useState(null);
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    fuelType: '',
    paymentMethod: '',
    customerId: '',
    stationId: '',
    employeeId: '',
    expenseCategory: '',
    bankAccountId: ''
  });
  const [additionalOptions, setAdditionalOptions] = useState({
    includeCharts: true,
    includeDetails: true,
    includeSummary: true
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [customers, setCustomers] = useState([]);
  const [stations, setStations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleOptions, setScheduleOptions] = useState({
    frequency: 'monthly',
    day: 1,
    recipients: '',
    format: 'pdf'
  });

  // Define report categories and types
  const reportCategories = [
    {
      name: 'Sales',
      icon: <ReceiptIcon />,
      reports: [
        { id: 'sales-summary', name: 'Sales Summary Report', description: 'Overview of all sales transactions for a specified period' },
        { id: 'sales-by-fuel', name: 'Sales by Fuel Type', description: 'Breakdown of sales by different fuel types' },
        { id: 'sales-by-payment', name: 'Sales by Payment Method', description: 'Analysis of sales categorized by payment methods' },
        { id: 'daily-sales', name: 'Daily Sales Report', description: 'Day-by-day sales data for the selected period' },
        { id: 'monthly-sales', name: 'Monthly Sales Trend', description: 'Month-over-month sales trends and comparisons' },
        { id: 'customer-sales', name: 'Customer Sales Analysis', description: 'Sales analysis by customer or customer type' }
      ]
    },
    {
      name: 'Financial',
      icon: <AttachMoneyIcon />,
      reports: [
        { id: 'profit-loss', name: 'Profit & Loss Statement', description: 'Revenue, expenses, and profit for selected period' },
        { id: 'cash-flow', name: 'Cash Flow Report', description: 'Cash inflows and outflows for the selected period' },
        { id: 'expense-analysis', name: 'Expense Analysis', description: 'Detailed breakdown of expenses by category' },
        { id: 'revenue-analysis', name: 'Revenue Analysis', description: 'Detailed breakdown of revenue streams' },
        { id: 'tax-report', name: 'Tax Report', description: 'Summary of taxable transactions and tax liabilities' }
      ]
    },
    {
      name: 'Inventory',
      icon: <GasStationIcon />,
      reports: [
        { id: 'inventory-status', name: 'Inventory Status Report', description: 'Current inventory levels and valuation' },
        { id: 'stock-movement', name: 'Stock Movement Report', description: 'Tracking of inventory additions and reductions' },
        { id: 'fuel-price-analysis', name: 'Fuel Price Analysis', description: 'Historical fuel price trends and comparisons' },
        { id: 'low-stock-alert', name: 'Low Stock Alert Report', description: 'Identify inventory items below reorder level' },
        { id: 'inventory-valuation', name: 'Inventory Valuation Report', description: 'Financial valuation of current inventory' }
      ]
    },
    {
      name: 'Customers',
      icon: <PeopleIcon />,
      reports: [
        { id: 'customer-list', name: 'Customer List Report', description: 'Complete list of customers with key details' },
        { id: 'credit-customers', name: 'Credit Customers Report', description: 'Analysis of customers with credit accounts' },
        { id: 'outstanding-invoices', name: 'Outstanding Invoices Report', description: 'Unpaid or partially paid customer invoices' },
        { id: 'customer-aging', name: 'Customer Aging Report', description: 'Aging analysis of customer debt' },
        { id: 'top-customers', name: 'Top Customers Report', description: 'Ranking of customers by sales volume or value' }
      ]
    },
    {
      name: 'Banking',
      icon: <AccountBalanceIcon />,
      reports: [
        { id: 'bank-accounts-summary', name: 'Bank Accounts Summary', description: 'Overview of all bank accounts and balances' },
        { id: 'bank-transactions', name: 'Bank Transactions Report', description: 'List of all bank transactions for a specific period' },
        { id: 'reconciliation-report', name: 'Reconciliation Report', description: 'Bank reconciliation status and discrepancies' },
        { id: 'petty-cash', name: 'Petty Cash Report', description: 'Petty cash transactions and current balance' }
      ]
    }
  ];

  // Define fuel types
  const fuelTypes = [
    'Petrol 92',
    'Petrol 95',
    'Auto Diesel',
    'Super Diesel',
    'Kerosene',
    'All Types'
  ];

  // Define payment methods
  const paymentMethods = [
    'Cash',
    'BankCard',
    'BankTransfer',
    'Credit',
    'Check',
    'Other',
    'All Methods'
  ];

  // Define report formats
  const reportFormats = [
    { value: 'pdf', label: 'PDF Document', icon: <DescriptionIcon /> },
    { value: 'xlsx', label: 'Excel Spreadsheet', icon: <DescriptionIcon /> },
    { value: 'csv', label: 'CSV File', icon: <DescriptionIcon /> },
    { value: 'json', label: 'JSON Format', icon: <DescriptionIcon /> }
  ];

  // Fetch reference data on component mount
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      // Fetch customers
      const customersResponse = await api.get('/customers');
      if (customersResponse.data && customersResponse.data.data) {
        setCustomers(customersResponse.data.data);
      }

      // Fetch stations
      const stationsResponse = await api.get('/stations');
      if (stationsResponse.data && stationsResponse.data.data) {
        setStations(stationsResponse.data.data);
      }

      // Fetch employees (if admin or manager)
      if (user && (user.role === 'admin' || user.role === 'manager')) {
        const employeesResponse = await api.get('/employees');
        if (employeesResponse.data && employeesResponse.data.data) {
          setEmployees(employeesResponse.data.data);
        }
      }

      // Fetch bank accounts
      const accountsResponse = await api.get('/bank-book/accounts');
      if (accountsResponse.data && accountsResponse.data.data) {
        setBankAccounts(accountsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
      setNotification({
        open: true,
        message: 'Failed to load reference data',
        severity: 'error'
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleReportTypeSelect = (type) => {
    setReportType(type);
  };

  const handleDateChange = (field, date) => {
    setDateRange({
      ...dateRange,
      [field]: date
    });
  };

  const handleFilterChange = (field, value) => {
    setFilterOptions({
      ...filterOptions,
      [field]: value
    });
  };

// Replace the existing handleGenerateReport function with this one:
const handleGenerateReport = async () => {
  // Validate inputs
  if (!reportType) {
    setNotification({
      open: true,
      message: 'Please select a report type',
      severity: 'warning'
    });
    return;
  }

  try {
    setLoading(true);

    // Build request parameters
    const params = {
      startDate: dateRange.startDate.toISOString().split('T')[0],
      endDate: dateRange.endDate.toISOString().split('T')[0],
      format: reportFormat,
      includeCharts: additionalOptions.includeCharts,
      includeDetails: additionalOptions.includeDetails,
      includeSummary: additionalOptions.includeSummary
    };

    // Add applicable filters
    if (filterOptions.fuelType && filterOptions.fuelType !== 'All Types') {
      params.fuelType = filterOptions.fuelType;
    }
    
    if (filterOptions.paymentMethod && filterOptions.paymentMethod !== 'All Methods') {
      params.paymentMethod = filterOptions.paymentMethod;
    }
    
    if (filterOptions.customerId) {
      params.customerId = filterOptions.customerId;
    }
    
    if (filterOptions.stationId) {
      params.stationId = filterOptions.stationId;
    }
    
    if (filterOptions.employeeId) {
      params.employeeId = filterOptions.employeeId;
    }
    
    if (filterOptions.expenseCategory) {
      params.expenseCategory = filterOptions.expenseCategory;
    }
    
    if (filterOptions.bankAccountId) {
      params.bankAccountId = filterOptions.bankAccountId;
    }

    // Use the appropriate report service method based on report type
    let response;
    
    // Extract the report category from the report type
    const reportCategory = reportType.split('-')[0];
    
    // Call the appropriate service method based on report category
    switch (reportCategory) {
      case 'sales':
        // Set the reportType parameter expected by backend
        params.reportType = reportType.replace('sales-', '');
        response = await ReportsService.generateSalesReport(params);
        break;
        
      case 'profit':
      case 'cash':
      case 'expense':
      case 'revenue':
      case 'tax':
        // Financial reports
        params.reportType = reportType;
        response = await ReportsService.generateFinancialReport(params);
        break;
        
      case 'inventory':
      case 'stock':
      case 'fuel':
      case 'low':
        // Inventory reports
        params.reportType = reportType.replace('inventory-', '').replace('fuel-', '').replace('stock-', '');
        response = await ReportsService.generateInventoryReport(params);
        break;
        
      case 'customer':
      case 'credit':
      case 'outstanding':
        // Customer reports
        params.reportType = reportType.replace('customer-', '');
        response = await ReportsService.generateCustomerReport(params);
        break;
        
      case 'bank':
      case 'reconciliation':
      case 'petty':
        // Banking reports
        params.reportType = reportType.replace('-report', '');
        response = await ReportsService.generateBankingReport(params);
        break;
        
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Handle response based on report format
    if (reportFormat === 'json') {
      // Show preview for JSON format
      setReportData(response.data);
      setOpenPreviewDialog(true);
    } else {
      // For file formats (pdf, xlsx, csv), create a download from the blob
      const contentType = 
        reportFormat === 'pdf' ? 'application/pdf' : 
        reportFormat === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
        'text/csv';
      
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.${reportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    setNotification({
      open: true,
      message: 'Report generated successfully',
      severity: 'success'
    });
  } catch (error) {
    console.error('Error generating report:', error);
    setNotification({
      open: true,
      message: 'Failed to generate report: ' + (error.response?.data?.error || error.message),
      severity: 'error'
    });
  } finally {
    setLoading(false);
  }
}; 

  const handleScheduleReport = async () => {
    try {
      setLoading(true);
      
      // Validate inputs
      if (!reportType || !scheduleOptions.frequency || !scheduleOptions.recipients) {
        setNotification({
          open: true,
          message: 'Please fill all required fields',
          severity: 'warning'
        });
        setLoading(false);
        return;
      }
  
      const scheduleData = {
        reportType,
        frequency: scheduleOptions.frequency,
        day: scheduleOptions.day,
        recipients: scheduleOptions.recipients.split(',').map(email => email.trim()),
        format: scheduleOptions.format,
        filters: {
          ...filterOptions,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          includeCharts: additionalOptions.includeCharts,
          includeDetails: additionalOptions.includeDetails,
          includeSummary: additionalOptions.includeSummary
        }
      };
  
      await ReportsService.scheduleReport(scheduleData);
  
      setNotification({
        open: true,
        message: 'Report scheduled successfully',
        severity: 'success'
      });
      setScheduleDialog(false);
    } catch (error) {
      console.error('Error scheduling report:', error);
      setNotification({
        open: true,
        message: 'Failed to schedule report: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Get current report category based on the selected report type
  const getCurrentReportCategory = () => {
    if (!reportType) return null;
    
    for (const category of reportCategories) {
      const report = category.reports.find(r => r.id === reportType);
      if (report) {
        return {
          category,
          report
        };
      }
    }
    
    return null;
  };

  const currentReportInfo = getCurrentReportCategory();

  // Get report-specific filter fields
  const getReportFilterFields = () => {
    if (!reportType) return [];

    const baseFilters = [
      { field: 'dateRange', label: 'Date Range', type: 'dateRange', always: true }
    ];

    switch (reportType) {
      case 'sales-summary':
      case 'sales-by-fuel':
      case 'daily-sales':
      case 'monthly-sales':
        return [
          ...baseFilters,
          { field: 'fuelType', label: 'Fuel Type', type: 'select', options: fuelTypes },
          { field: 'paymentMethod', label: 'Payment Method', type: 'select', options: paymentMethods },
          { field: 'stationId', label: 'Station', type: 'select', options: stations }
        ];
      case 'sales-by-payment':
        return [
          ...baseFilters,
          { field: 'paymentMethod', label: 'Payment Method', type: 'select', options: paymentMethods },
          { field: 'stationId', label: 'Station', type: 'select', options: stations }
        ];
      case 'customer-sales':
      case 'credit-customers':
      case 'outstanding-invoices':
      case 'customer-aging':
        return [
          ...baseFilters,
          { field: 'customerId', label: 'Customer', type: 'select', options: customers }
        ];
      case 'expense-analysis':
        return [
          ...baseFilters,
          { field: 'expenseCategory', label: 'Expense Category', type: 'select', options: [] },
          { field: 'stationId', label: 'Station', type: 'select', options: stations }
        ];
      case 'bank-transactions':
      case 'reconciliation-report':
        return [
          ...baseFilters,
          { field: 'bankAccountId', label: 'Bank Account', type: 'select', options: bankAccounts }
        ];
      default:
        return baseFilters;
    }
  };

  const handleAdditionalOptionChange = (field, value) => {
  setAdditionalOptions({
    ...additionalOptions,
    [field]: value
  });
};

const handleScheduleOptionChange = (field, value) => {
  setScheduleOptions({
    ...scheduleOptions,
    [field]: value
  });
};

  // Render the tab panel content
  const renderTabPanel = (tabIndex) => {
    switch (tabIndex) {
      case 0: // Generate Report
        return (
          <Grid container spacing={3}>
            {/* Left side - Report Selection */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Select Report Type
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {reportCategories.map((category) => (
                  <Box key={category.name} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {category.icon}
                      <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'bold' }}>
                        {category.name} Reports
                      </Typography>
                    </Box>
                    
                    {category.reports.map((report) => (
                      <Card 
                        key={report.id} 
                        sx={{ 
                          mb: 1, 
                          cursor: 'pointer',
                          border: reportType === report.id ? '2px solid' : '1px solid',
                          borderColor: reportType === report.id ? 'primary.main' : 'divider',
                          boxShadow: reportType === report.id ? 3 : 1,
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleReportTypeSelect(report.id)}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {report.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            {report.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            {/* Right side - Report Configuration */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {reportType ? `Configure: ${currentReportInfo?.report?.name}` : 'Configure Report'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {reportType ? (
                  <Grid container spacing={3}>
                      {/* Date Range */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Start Date"
                          type="date"
                          value={dateRange.startDate.toISOString().split('T')[0]}
                          onChange={(e) => handleDateChange('startDate', new Date(e.target.value))}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="End Date"
                          type="date"
                          value={dateRange.endDate.toISOString().split('T')[0]}
                          onChange={(e) => handleDateChange('endDate', new Date(e.target.value))}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      
                      {/* Filters - conditionally rendered based on report type */}
                      {reportType.includes('sales') && (
                        <>
                          {(reportType === 'sales-summary' || reportType === 'sales-by-fuel' || reportType === 'daily-sales' || reportType === 'monthly-sales') && (
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel>Fuel Type</InputLabel>
                                <Select
                                  value={filterOptions.fuelType}
                                  onChange={(e) => handleFilterChange('fuelType', e.target.value)}
                                  label="Fuel Type"
                                >
                                  <MenuItem value="">All Types</MenuItem>
                                  {fuelTypes.filter(type => type !== 'All Types').map((type) => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          )}
                          
                          {(reportType === 'sales-summary' || reportType === 'sales-by-payment') && (
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel>Payment Method</InputLabel>
                                <Select
                                  value={filterOptions.paymentMethod}
                                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                                  label="Payment Method"
                                >
                                  <MenuItem value="">All Methods</MenuItem>
                                  {paymentMethods.filter(method => method !== 'All Methods').map((method) => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          )}
                          
                          {stations.length > 0 && (
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel>Station</InputLabel>
                                <Select
                                  value={filterOptions.stationId}
                                  onChange={(e) => handleFilterChange('stationId', e.target.value)}
                                  label="Station"
                                >
                                  <MenuItem value="">All Stations</MenuItem>
                                  {stations.map((station) => (
                                    <MenuItem key={station._id} value={station._id}>{station.name}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          )}
                        </>
                      )}
                      
                      {(reportType === 'customer-sales' || reportType.includes('customer')) && (
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Customer</InputLabel>
                            <Select
                              value={filterOptions.customerId}
                              onChange={(e) => handleFilterChange('customerId', e.target.value)}
                              label="Customer"
                            >
                              <MenuItem value="">All Customers</MenuItem>
                              {customers.map((customer) => (
                                <MenuItem key={customer._id} value={customer._id}>{customer.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                      
                      {reportType === 'expense-analysis' && (
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Expense Category</InputLabel>
                            <Select
                              value={filterOptions.expenseCategory}
                              onChange={(e) => handleFilterChange('expenseCategory', e.target.value)}
                              label="Expense Category"
                            >
                              <MenuItem value="">All Categories</MenuItem>
                              <MenuItem value="Utilities">Utilities</MenuItem>
                              <MenuItem value="Rent">Rent</MenuItem>
                              <MenuItem value="Supplies">Supplies</MenuItem>
                              <MenuItem value="Maintenance">Maintenance</MenuItem>
                              <MenuItem value="Taxes">Taxes</MenuItem>
                              <MenuItem value="Salaries">Salaries</MenuItem>
                              <MenuItem value="Transport">Transport</MenuItem>
                              <MenuItem value="Insurance">Insurance</MenuItem>
                              <MenuItem value="Other">Other</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                      
                      {(reportType === 'bank-transactions' || reportType === 'reconciliation-report') && (
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Bank Account</InputLabel>
                            <Select
                              value={filterOptions.bankAccountId}
                              onChange={(e) => handleFilterChange('bankAccountId', e.target.value)}
                              label="Bank Account"
                            >
                              <MenuItem value="">All Accounts</MenuItem>
                              {bankAccounts.map((account) => (
                                <MenuItem key={account._id} value={account._id}>{account.bankName} - {account.accountNumber}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                      
                      {/* Report Format */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Report Format
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {reportFormats.map((format) => (
                            <Chip
                              key={format.value}
                              label={format.label}
                              icon={format.icon}
                              onClick={() => setReportFormat(format.value)}
                              color={reportFormat === format.value ? 'primary' : 'default'}
                              variant={reportFormat === format.value ? 'filled' : 'outlined'}
                              sx={{ m: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Grid>
                      
                      {/* Additional Options */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Additional Options
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Chip
                            label="Include Charts"
                            onClick={() => handleAdditionalOptionChange('includeCharts', !additionalOptions.includeCharts)}
                            color={additionalOptions.includeCharts ? 'primary' : 'default'}
                            variant={additionalOptions.includeCharts ? 'filled' : 'outlined'}
                            sx={{ m: 0.5 }}
                          />
                          <Chip
                            label="Include Details"
                            onClick={() => handleAdditionalOptionChange('includeDetails', !additionalOptions.includeDetails)}
                            color={additionalOptions.includeDetails ? 'primary' : 'default'}
                            variant={additionalOptions.includeDetails ? 'filled' : 'outlined'}
                            sx={{ m: 0.5 }}
                          />
                          <Chip
                            label="Include Summary"
                            onClick={() => handleAdditionalOptionChange('includeSummary', !additionalOptions.includeSummary)}
                            color={additionalOptions.includeSummary ? 'primary' : 'default'}
                            variant={additionalOptions.includeSummary ? 'filled' : 'outlined'}
                            sx={{ m: 0.5 }}
                          />
                        </Box>
                      </Grid>
                      
                      {/* Action Buttons */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Button
                            variant="outlined"
                            startIcon={<CalendarIcon />}
                            onClick={() => setScheduleDialog(true)}
                          >
                            Schedule Report
                          </Button>
                          <Box>
                            <Button
                              variant="contained"
                              startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
                              onClick={handleGenerateReport}
                              disabled={loading}
                              sx={{ ml: 1 }}
                            >
                              Generate Report
                            </Button>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1">
                      Please select a report type from the left panel to configure and generate.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        );
      
      case 1: // Scheduled Reports
        return (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Scheduled Reports</Typography>
              <Button
                variant="contained"
                startIcon={<CalendarIcon />}
                onClick={() => setScheduleDialog(true)}
              >
                Schedule New Report
              </Button>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                          No scheduled reports found. Schedule a report to see it here.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        );
      
      case 2: // Report Templates
        return (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Report Templates</Typography>
              <Button
                variant="contained"
                startIcon={<DescriptionIcon />}
              >
                Create New Template
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {/* Monthly Sales Template */}
              <Grid item xs={12} md={6} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Monthly Sales Report</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Complete sales analysis for the previous month
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip label="Sales" size="small" sx={{ mr: 1, mb: 1 }} />
                      <Chip label="Monthly" size="small" sx={{ mr: 1, mb: 1 }} />
                      <Chip label="PDF" size="small" sx={{ mb: 1 }} />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<AssessmentIcon />}>
                      Generate
                    </Button>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              {/* Profit & Loss Template */}
              <Grid item xs={12} md={6} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Profit & Loss Statement</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Financial P&L report for the current quarter
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip label="Financial" size="small" sx={{ mr: 1, mb: 1 }} />
                      <Chip label="Quarterly" size="small" sx={{ mr: 1, mb: 1 }} />
                      <Chip label="Excel" size="small" sx={{ mb: 1 }} />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<AssessmentIcon />}>
                      Generate
                    </Button>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              {/* Inventory Status Template */}
              <Grid item xs={12} md={6} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Inventory Status</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Current inventory levels and valuation
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip label="Inventory" size="small" sx={{ mr: 1, mb: 1 }} />
                      <Chip label="Daily" size="small" sx={{ mr: 1, mb: 1 }} />
                      <Chip label="PDF" size="small" sx={{ mb: 1 }} />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<AssessmentIcon />}>
                      Generate
                    </Button>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AssessmentIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Reports
            </Typography>
          </Box>
          
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              underline="hover"
              color="inherit"
              href="/dashboard"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Home
            </Link>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <AssessmentIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Reports
            </Typography>
          </Breadcrumbs>
        </Box>

        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReferenceData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Report Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography color="textSecondary" variant="overline" gutterBottom>
                Daily Sales
              </Typography>
              <Typography variant="h4">
                0
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Reports generated today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Typography color="textSecondary" variant="overline" gutterBottom>
                Scheduled Reports
              </Typography>
              <Typography variant="h4">
                0
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Active scheduled reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'success.main' }}>
            <CardContent>
              <Typography color="textSecondary" variant="overline" gutterBottom>
                Templates
              </Typography>
              <Typography variant="h4">
                3
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Saved report templates
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Typography color="textSecondary" variant="overline" gutterBottom>
                Storage Usage
              </Typography>
              <Typography variant="h4">
                12 MB
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Used for saved reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different report functions */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="report tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<AssessmentIcon />} label="Generate Report" />
          <Tab icon={<CalendarIcon />} label="Scheduled Reports" />
          <Tab icon={<DescriptionIcon />} label="Report Templates" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {renderTabPanel(tabValue)}

      {/* Report Preview Dialog */}
      <Dialog 
        open={openPreviewDialog} 
        onClose={() => setOpenPreviewDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Report Preview
          <IconButton
            aria-label="close"
            onClick={() => setOpenPreviewDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {reportData && (
            <Box
              component="pre"
              sx={{
                overflow: 'auto',
                fontSize: '0.875rem',
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1
              }}
            >
              {JSON.stringify(reportData, null, 2)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<DownloadIcon />}>
            Download
          </Button>
          <Button startIcon={<PrintIcon />}>
            Print
          </Button>
          <Button startIcon={<EmailIcon />}>
            Email
          </Button>
          <Button onClick={() => setOpenPreviewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Report Dialog */}
      <Dialog
        open={scheduleDialog}
        onClose={() => setScheduleDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Schedule Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="Report Type"
                >
                  <MenuItem value="">Select a report</MenuItem>
                  {reportCategories.flatMap(category => 
                    category.reports.map(report => (
                      <MenuItem key={report.id} value={report.id}>
                        {report.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={scheduleOptions.frequency}
                  onChange={(e) => handleScheduleOptionChange('frequency', e.target.value)}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {scheduleOptions.frequency === 'weekly' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Day of Week</InputLabel>
                  <Select
                    value={scheduleOptions.day}
                    onChange={(e) => handleScheduleOptionChange('day', e.target.value)}
                    label="Day of Week"
                  >
                    <MenuItem value={1}>Monday</MenuItem>
                    <MenuItem value={2}>Tuesday</MenuItem>
                    <MenuItem value={3}>Wednesday</MenuItem>
                    <MenuItem value={4}>Thursday</MenuItem>
                    <MenuItem value={5}>Friday</MenuItem>
                    <MenuItem value={6}>Saturday</MenuItem>
                    <MenuItem value={0}>Sunday</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {scheduleOptions.frequency === 'monthly' && (
              <Grid item xs={12}>
                <TextField
                  label="Day of Month"
                  type="number"
                  fullWidth
                  value={scheduleOptions.day}
                  onChange={(e) => handleScheduleOptionChange('day', e.target.value)}
                  inputProps={{ min: 1, max: 31 }}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                label="Email Recipients"
                fullWidth
                value={scheduleOptions.recipients}
                onChange={(e) => handleScheduleOptionChange('recipients', e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                helperText="Separate multiple emails with commas"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Report Format</InputLabel>
                <Select
                  value={scheduleOptions.format}
                  onChange={(e) => handleScheduleOptionChange('format', e.target.value)}
                  label="Report Format"
                >
                  <MenuItem value="pdf">PDF Document</MenuItem>
                  <MenuItem value="xlsx">Excel Spreadsheet</MenuItem>
                  <MenuItem value="csv">CSV File</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleScheduleReport}
            disabled={loading || !reportType || !scheduleOptions.frequency || !scheduleOptions.recipients}
          >
            {loading ? <CircularProgress size={24} /> : 'Schedule Report'}
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
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};


export default ReportsPage;