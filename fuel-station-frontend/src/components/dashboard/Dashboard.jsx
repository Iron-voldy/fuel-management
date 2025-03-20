import React, { useContext, useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import AuthContext from '../../context/AuthContext';

const Dashboard = () => {
  const { api, user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard summary data
        const res = await api.get('/dashboard/financial-summary');
        
        if (res.data && res.data.data) {
          setDashboardData(res.data.data);
        } else {
          throw new Error('Invalid dashboard data structure');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [api]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Error: {error}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Please try refreshing the page or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4 }}>
        Welcome back, {user?.name || 'User'}!
      </Typography>
      
      {dashboardData ? (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" color="primary">Total Sales</Typography>
              <Typography variant="h4">
                LKR {dashboardData.salesSummary?.totalSales?.toLocaleString() || '0'}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" color="primary">Total Expenses</Typography>
              <Typography variant="h4">
                LKR {dashboardData.expenseSummary?.totalExpenses?.toLocaleString() || '0'}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" color="primary">Gross Profit</Typography>
              <Typography variant="h4" color={dashboardData.profitSummary?.grossProfit >= 0 ? 'success.main' : 'error.main'}>
                LKR {dashboardData.profitSummary?.grossProfit?.toLocaleString() || '0'}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" color="primary">Profit Margin</Typography>
              <Typography variant="h4" color={dashboardData.profitSummary?.profitMargin >= 0 ? 'success.main' : 'error.main'}>
                {dashboardData.profitSummary?.profitMargin?.toFixed(2) || '0'}%
              </Typography>
            </Paper>
          </Grid>
          
          {/* Top Selling Fuels */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Top Selling Fuels</Typography>
              
              {dashboardData.topSellingFuels && dashboardData.topSellingFuels.length > 0 ? (
                dashboardData.topSellingFuels.map((fuel, index) => (
                  <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>{fuel.fuelType}</Typography>
                    <Typography>{fuel.quantity.toLocaleString()} L</Typography>
                    <Typography>LKR {fuel.amount.toLocaleString()}</Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No fuel sales data available
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Top Expense Categories */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Top Expense Categories</Typography>
              
              {dashboardData.topExpenseCategories && dashboardData.topExpenseCategories.length > 0 ? (
                dashboardData.topExpenseCategories.map((expense, index) => (
                  <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>{expense.category}</Typography>
                    <Typography>LKR {expense.amount.toLocaleString()}</Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No expense data available
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Typography variant="body1" color="text.secondary">
          No dashboard data available
        </Typography>
      )}
    </Box>
  );
};

export default Dashboard;