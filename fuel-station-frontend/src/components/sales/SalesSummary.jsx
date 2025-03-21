import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Tooltip
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import {
  Refresh as RefreshIcon,
  LocalGasStation as GasIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';

const SalesSummary = ({ api, formatCurrency }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().slice(0, 10), // First day of current month
    endDate: new Date().toISOString().slice(0, 10) // Today
  });

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create query params based on timeframe and date range
      const params = { period: timeframe };
      if (timeframe === 'custom') {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      // Fetch sales data
      const salesRes = await api.get('/sales/summary', { params });
      
      // Fetch sales trends data (endpoint may vary based on your API)
      // If you don't have a specific endpoint for this, you might need to process
      // the data from the summary endpoint to create trend charts
      const trendsRes = await api.get('/sales/report', { params });
      
      if (salesRes.data && salesRes.data.data) {
        setSummaryData({
          ...salesRes.data.data,
          trends: trendsRes.data?.data?.trends || []
        });
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error fetching sales summary:', err);
      setError(err.response?.data?.error || 'Failed to load sales summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [timeframe]);

  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };

  const handleDateChange = (field, value) => {
    setDateRange({
      ...dateRange,
      [field]: value
    });
  };

  const handleRefresh = () => {
    fetchSummaryData();
  };

  // Generate random colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Loading state
  if (loading && !summaryData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
        <Typography variant="h6">
          Error: {error}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Unable to load sales analytics data. Please try again later.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={handleRefresh}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  // Placeholder data if API doesn't return what we need
  // In a real application, this would come from your API
  const placeholderData = {
    salesByFuelType: [
      { name: 'Petrol 92', value: 35 },
      { name: 'Petrol 95', value: 20 },
      { name: 'Auto Diesel', value: 30 },
      { name: 'Super Diesel', value: 10 },
      { name: 'Kerosene', value: 5 }
    ],
    salesTrend: [
      { name: 'Jan', value: 120000 },
      { name: 'Feb', value: 150000 },
      { name: 'Mar', value: 170000 },
      { name: 'Apr', value: 140000 },
      { name: 'May', value: 180000 },
      { name: 'Jun', value: 190000 }
    ],
    salesByPaymentMethod: [
      { name: 'Cash', value: 60 },
      { name: 'Card', value: 25 },
      { name: 'Credit', value: 10 },
      { name: 'Other', value: 5 }
    ],
    volumeTrend: [
      { name: 'Jan', Petrol92: 5000, Petrol95: 2000, AutoDiesel: 6000, SuperDiesel: 1500, Kerosene: 500 },
      { name: 'Feb', Petrol92: 5500, Petrol95: 2200, AutoDiesel: 6200, SuperDiesel: 1600, Kerosene: 450 },
      { name: 'Mar', Petrol92: 6000, Petrol95: 2400, AutoDiesel: 6500, SuperDiesel: 1700, Kerosene: 480 },
      { name: 'Apr', Petrol92: 5800, Petrol95: 2300, AutoDiesel: 6400, SuperDiesel: 1650, Kerosene: 470 },
      { name: 'May', Petrol92: 6200, Petrol95: 2500, AutoDiesel: 6700, SuperDiesel: 1800, Kerosene: 520 },
      { name: 'Jun', Petrol92: 6500, Petrol95: 2600, AutoDiesel: 7000, SuperDiesel: 1900, Kerosene: 550 }
    ]
  };

  // If we have real data from the API, use it. Otherwise use placeholder data
  const chartData = summaryData || { 
    salesByFuelType: placeholderData.salesByFuelType,
    salesTrend: placeholderData.salesTrend,
    salesByPaymentMethod: placeholderData.salesByPaymentMethod,
    volumeTrend: placeholderData.volumeTrend
  };

  return (
    <Box>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>Time Period:</Typography>
          <TextField
            select
            size="small"
            value={timeframe}
            onChange={handleTimeframeChange}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="day">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>
        </Box>
        
        {timeframe === 'custom' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button 
              variant="contained" 
              size="small"
              onClick={handleRefresh}
            >
              Apply
            </Button>
          </Box>
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title="Refresh data">
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>
      
      {/* Main Analytics */}
      <Grid container spacing={3}>
        {/* Sales By Fuel Type */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <GasIcon sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
              Sales by Fuel Type
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.salesByFuelType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.salesByFuelType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Sales By Payment Method */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <MoneyIcon sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
              Sales by Payment Method
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.salesByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.salesByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Sales Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
              Sales Trend
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData.salesTrend}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    name="Sales Amount"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Volume by Fuel Type */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              <GasIcon sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
              Volume by Fuel Type
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.volumeTrend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => `${value.toLocaleString()} L`} />
                  <Legend />
                  <Bar dataKey="Petrol92" name="Petrol 92" stackId="a" fill="#0088FE">
                    <LabelList dataKey="Petrol92" position="top" formatter={(value) => `${value}`} />
                  </Bar>
                  <Bar dataKey="Petrol95" name="Petrol 95" stackId="a" fill="#00C49F">
                    <LabelList dataKey="Petrol95" position="top" formatter={(value) => `${value}`} />
                  </Bar>
                  <Bar dataKey="AutoDiesel" name="Auto Diesel" stackId="a" fill="#FFBB28">
                    <LabelList dataKey="AutoDiesel" position="top" formatter={(value) => `${value}`} />
                  </Bar>
                  <Bar dataKey="SuperDiesel" name="Super Diesel" stackId="a" fill="#FF8042">
                    <LabelList dataKey="SuperDiesel" position="top" formatter={(value) => `${value}`} />
                  </Bar>
                  <Bar dataKey="Kerosene" name="Kerosene" stackId="a" fill="#8884d8">
                    <LabelList dataKey="Kerosene" position="top" formatter={(value) => `${value}`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesSummary;