// src/components/dashboard/Dashboard.jsx
import React, { useContext, useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  CircularProgress,
  Divider,
  Button,
  useTheme,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { 
  TrendingUp, 
  Refresh, 
  LocalGasStation,
  MoreVert,
  ReceiptLong,
  AttachMoney
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import SalesOverviewChart from './SalesOverviewChart';
import TopSellingFuelsChart from './TopSellingFuelsChart';
import ExpensesBreakdownChart from './ExpensesBreakdownChart';
import PerformanceMetricsCard from './PerformanceMetricsCard';
import StaffMetricsCard from './StaffMetricsCard';
import InfoCard from './InfoCard';

// Register ChartJS components
ChartJS.register(...registerables);

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { api, user, logout } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [profitLossData, setProfitLossData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPL, setLoadingPL] = useState(true);
  const [loadingCF, setLoadingCF] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [tabValue, setTabValue] = useState(0);
  const [authError, setAuthError] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    fetchDashboardData(newTimeframe);
    fetchProfitLossData(newTimeframe);
    fetchCashFlowData(newTimeframe);
  };

  // Handle unauthorized errors consistently
  const handleAuthError = (err) => {
    console.error('Authentication error:', err);
    setAuthError(true);
    
    // Clear any stale token data
    localStorage.removeItem('token');
    
    // Log the user out if we have logout function
    if (logout && typeof logout === 'function') {
      logout();
    }
    
    // Redirect to login page
    navigate('/login', { 
      state: { 
        message: 'Your session has expired. Please log in again.' 
      } 
    });
  };

  const fetchDashboardData = async (period = 'month') => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard summary data
      const res = await api.get(`/dashboard/financial-summary?period=${period}`);
      
      if (res.data && res.data.data) {
        setDashboardData(res.data.data);
      } else {
        throw new Error('Invalid dashboard data structure');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      
      // Check if error is due to authentication
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleAuthError(err);
      } else {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProfitLossData = async (period = 'month') => {
    try {
      setLoadingPL(true);
      
      // Fetch profit & loss data
      const res = await api.get(`/dashboard/profit-loss?period=${period}`);
      
      if (res.data && res.data.data) {
        setProfitLossData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching profit & loss data:', err);
      
      // Check if error is due to authentication
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleAuthError(err);
      }
    } finally {
      setLoadingPL(false);
    }
  };
  
  const fetchCashFlowData = async (period = 'month') => {
    try {
      setLoadingCF(true);
      
      // Fetch cash flow data
      const res = await api.get(`/dashboard/cash-flow?period=${period}`);
      
      if (res.data && res.data.data) {
        setCashFlowData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      
      // Check if error is due to authentication
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleAuthError(err);
      }
    } finally {
      setLoadingCF(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated before making API calls
    const token = localStorage.getItem('token');
    
    if (!token) {
      handleAuthError(new Error('No authentication token found'));
      return;
    }
    
    // Only fetch data if we have a token
    fetchDashboardData();
    fetchProfitLossData();
    fetchCashFlowData();
  }, []);

  // If authentication error occurred, don't show any dashboard content
  if (authError) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6">
            Authentication Error
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Your session has expired or you're not authorized to view this page.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6">
            Error: {error}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Please try refreshing the page or contact support if the problem persists.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.name || 'Admin'}! Here's what's happening with your fuel station.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant={timeframe === 'day' ? 'contained' : 'outlined'} 
            size="small"
            onClick={() => handleTimeframeChange('day')}
          >
            Today
          </Button>
          <Button 
            variant={timeframe === 'week' ? 'contained' : 'outlined'} 
            size="small"
            onClick={() => handleTimeframeChange('week')}
          >
            Week
          </Button>
          <Button 
            variant={timeframe === 'month' ? 'contained' : 'outlined'} 
            size="small"
            onClick={() => handleTimeframeChange('month')}
          >
            Month
          </Button>
          <Button 
            variant={timeframe === 'quarter' ? 'contained' : 'outlined'} 
            size="small"
            onClick={() => handleTimeframeChange('quarter')}
          >
            Quarter
          </Button>
          <Button 
            variant={timeframe === 'year' ? 'contained' : 'outlined'} 
            size="small"
            onClick={() => handleTimeframeChange('year')}
          >
            Year
          </Button>
          <IconButton 
            color="primary" 
            onClick={() => {
              fetchDashboardData(timeframe);
              fetchProfitLossData(timeframe);
              fetchCashFlowData(timeframe);
            }}
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard 
            title="Total Sales" 
            value={dashboardData?.salesSummary?.totalSales || 0} 
            icon={<ReceiptLong />}
            color="#4caf50"
            subtitle={`${dashboardData?.salesSummary?.totalQuantity?.toLocaleString() || 0} liters`}
            trend={dashboardData?.performanceMetrics?.changes?.revenueChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard 
            title="Total Expenses" 
            value={dashboardData?.expenseSummary?.totalExpenses || 0}
            icon={<AttachMoney />}
            color="#ff9800"
            subtitle={`${dashboardData?.expenseSummary?.expenseCount || 0} transactions`}
            trend={dashboardData?.performanceMetrics?.changes?.expenseChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard 
            title="Gross Profit" 
            value={dashboardData?.profitSummary?.grossProfit || 0}
            icon={<TrendingUp />}
            color="#2196f3"
            subtitle={`${dashboardData?.profitSummary?.profitMargin?.toFixed(2) || 0}% margin`}
            trend={dashboardData?.performanceMetrics?.changes?.profitChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard 
            title="Cash Position" 
            value={dashboardData?.cashPosition?.totalCashPosition || 0}
            icon={<AttachMoney />}
            color="#9c27b0"
            subtitle={`${dashboardData?.cashPosition?.bankAccounts?.length || 0} accounts`}
          />
        </Grid>
      </Grid>
      
      {/* Tabs for different dashboard sections */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            mb: 2,
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 3
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Fuel Sales" />
          <Tab label="Finances" />
          <Tab label="Performance" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Sales Overview Chart */}
          <Grid item xs={12} md={8}>
            <Paper 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Sales Overview</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dashboardData?.period?.name} - {new Date(dashboardData?.period?.startDate).toLocaleDateString()} to {new Date(dashboardData?.period?.endDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              {!loadingPL && profitLossData ? (
                <SalesOverviewChart data={profitLossData} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Top Selling Fuels */}
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Top Selling Fuels</Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              {dashboardData?.topSellingFuels ? (
                <TopSellingFuelsChart data={dashboardData.topSellingFuels} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No fuel sales data available
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Cash Flow & Expenses */}
          <Grid item xs={12} md={8}>
            <Paper 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Cash Flow</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(dashboardData?.period?.startDate).toLocaleDateString()} to {new Date(dashboardData?.period?.endDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              {!loadingCF && cashFlowData ? (
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={{
                      labels: cashFlowData?.summary?.trends?.map(t => t.period) || [],
                      datasets: [
                        {
                          label: 'Inflows',
                          data: cashFlowData?.summary?.trends?.map(t => t.inflow) || [],
                          backgroundColor: theme.palette.success.light,
                          borderColor: theme.palette.success.main,
                          borderWidth: 1
                        },
                        {
                          label: 'Outflows',
                          data: cashFlowData?.summary?.trends?.map(t => t.outflow) || [],
                          backgroundColor: theme.palette.error.light,
                          borderColor: theme.palette.error.main,
                          borderWidth: 1
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: false
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            drawBorder: false
                          }
                        },
                        x: {
                          grid: {
                            display: false
                          }
                        }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Total Inflows</Typography>
                  <Typography variant="h6" color="success.main">
                    LKR {cashFlowData?.summary?.totalInflows?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Total Outflows</Typography>
                  <Typography variant="h6" color="error.main">
                    LKR {cashFlowData?.summary?.totalOutflows?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Net Cash Flow</Typography>
                  <Typography variant="h6" color={cashFlowData?.summary?.netCashFlow >= 0 ? 'success.main' : 'error.main'}>
                    LKR {cashFlowData?.summary?.netCashFlow?.toLocaleString() || 0}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          {/* Expense Breakdown */}
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Expense Breakdown</Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              {dashboardData?.topExpenseCategories ? (
                <ExpensesBreakdownChart data={dashboardData.topExpenseCategories} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No expense data available
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Performance Metrics */}
          <Grid item xs={12} md={6}>
            <PerformanceMetricsCard data={dashboardData?.performanceMetrics} />
          </Grid>
          
          {/* Staff Metrics */}
          <Grid item xs={12} md={6}>
            <StaffMetricsCard data={dashboardData?.staffMetrics} />
          </Grid>
          
          {/* Recent Activity */}
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: 3,
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Typography variant="h6" gutterBottom>Recent Activity</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Recent Sales</Typography>
                  {dashboardData?.recentActivity?.sales && dashboardData.recentActivity.sales.length > 0 ? (
                    <Box component="ul" sx={{ pl: 2 }}>
                      {dashboardData.recentActivity.sales.map((sale, index) => (
                        <Box 
                          component="li" 
                          key={index} 
                          sx={{ 
                            mb: 1,
                            '&::marker': {
                              color: theme.palette.primary.main
                            }
                          }}
                        >
                          <Typography variant="body2">
                            {sale.fuelType} - {sale.quantity} liters - LKR {sale.totalAmount.toLocaleString()} ({new Date(sale.date).toLocaleDateString()})
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recent sales found
                    </Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Recent Expenses</Typography>
                  {dashboardData?.recentActivity?.expenses && dashboardData.recentActivity.expenses.length > 0 ? (
                    <Box component="ul" sx={{ pl: 2 }}>
                      {dashboardData.recentActivity.expenses.map((expense, index) => (
                        <Box 
                          component="li" 
                          key={index} 
                          sx={{ 
                            mb: 1,
                            '&::marker': {
                              color: theme.palette.error.main
                            }
                          }}
                        >
                          <Typography variant="body2">
                            {expense.category} - {expense.description.substring(0, 30)}{expense.description.length > 30 ? '...' : ''} - LKR {expense.amount.toLocaleString()} ({new Date(expense.date).toLocaleDateString()})
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recent expenses found
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Fuel Sales Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Typography variant="h6" gutterBottom>Fuel Sales Analysis</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Coming soon - Detailed fuel sales analysis including volume trends, price analysis, and profit margins
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Button variant="contained" color="primary" startIcon={<LocalGasStation />}>
                Go to Full Sales Dashboard
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Finances Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
          <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Typography variant="h6" gutterBottom>Financial Dashboard</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Coming soon - Detailed financial analysis including balance sheets, profit & loss statements, and cash flow analysis
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Button variant="contained" color="primary" startIcon={<AttachMoney />}>
                Go to Full Financial Dashboard
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Performance Tab */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
            >
              <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Coming soon - Detailed performance analysis including KPIs, benchmarks, and business intelligence
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Button variant="contained" color="primary" startIcon={<TrendingUp />}>
                Go to Full Performance Dashboard
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;