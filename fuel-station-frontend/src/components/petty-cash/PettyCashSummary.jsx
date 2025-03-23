import React, { useState } from 'react';
import { 
  Box, Grid, Paper, Typography, Divider, 
  FormControl, InputLabel, Select, MenuItem, 
  Card, CardContent, CircularProgress
} from '@mui/material';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PettyCashSummary = ({ summary }) => {
  const [period, setPeriod] = useState('month');
  
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

  // Handle period change
  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
    // In a real implementation, you would fetch data for the new period
  };

  // Loading state
  if (!summary) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Prepare data for withdrawals by category pie chart
  const withdrawalsByCategory = summary.summary.withdrawalsByCategory
    ? Object.entries(summary.summary.withdrawalsByCategory).map(([category, amount]) => ({
        name: category,
        value: amount
      }))
    : [];

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28BFF', '#FF6B6B', '#4D4D4D'];

  // Prepare data for trends chart
  const trendsData = summary.trend || [];

  return (
    <Box>
      {/* Period Selector */}
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            onChange={handlePeriodChange}
            label="Period"
          >
            <MenuItem value="day">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Current Balance
              </Typography>
              <Typography variant="h5" component="div">
                {formatCurrency(summary.summary.currentBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Withdrawals
              </Typography>
              <Typography variant="h5" component="div" color="error.main">
                {formatCurrency(summary.summary.totalWithdrawals)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.summary.withdrawalCount} transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Replenishments
              </Typography>
              <Typography variant="h5" component="div" color="success.main">
                {formatCurrency(summary.summary.totalReplenishments)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.summary.replenishmentCount} transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Net Change
              </Typography>
              <Typography 
                variant="h5" 
                component="div"
                color={summary.summary.netChange >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(summary.summary.netChange)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.period.name} ({formatDate(summary.period.startDate)} - {formatDate(summary.period.endDate)})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={4}>
        {/* Withdrawals by Category Pie Chart */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Withdrawals by Category
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {withdrawalsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={withdrawalsByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {withdrawalsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">
                  No withdrawal data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Trend Chart */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Cash Flow Trends
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={trendsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="replenishments" name="Replenishments" fill="#00C49F" />
                  <Bar yAxisId="left" dataKey="withdrawals" name="Withdrawals" fill="#FF8042" />
                  <Bar yAxisId="right" dataKey="net" name="Net Change" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">
                  No trend data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Stations Needing Replenishment */}
      {summary.stationsNeedingReplenishment && summary.stationsNeedingReplenishment.length > 0 && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Stations Needing Replenishment
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {summary.stationsNeedingReplenishment.map((station) => (
              <Grid item xs={12} sm={6} md={4} key={station.stationId}>
                <Card sx={{ bgcolor: 'error.light' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Station ID: {station.stationId}
                    </Typography>
                    <Typography variant="body2">
                      Current Balance: {formatCurrency(station.currentBalance)}
                    </Typography>
                    <Typography variant="body2">
                      Minimum Threshold: {formatCurrency(station.minLimit)}
                    </Typography>
                    <Typography variant="body2" color="error" fontWeight="bold">
                      Shortfall: {formatCurrency(station.shortfall)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* Top Categories */}
      {summary.summary.topCategories && summary.summary.topCategories.length > 0 && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Top Expense Categories
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {summary.summary.topCategories.map((category, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {category.category}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(category.amount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default PettyCashSummary;