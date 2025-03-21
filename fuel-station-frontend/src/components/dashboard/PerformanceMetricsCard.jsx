import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  Divider, 
  LinearProgress 
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  AttachMoney, 
  ShowChart 
} from '@mui/icons-material';

const PerformanceMetricsCard = ({ data }) => {
  if (!data) {
    return (
      <Paper sx={{ p: 3, height: '100%', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography variant="body2" color="text.secondary">No performance data available</Typography>
        </Box>
      </Paper>
    );
  }

  const { currentPeriod, previousPeriod, changes } = data;

  // Format currency
  const formatCurrency = (value) => `LKR ${value.toLocaleString()}`;

  // Format percentage with + or - sign
  const formatPercentage = (value) => {
    if (value > 0) return `+${value.toFixed(1)}%`;
    return `${value.toFixed(1)}%`;
  };

  // Get icon and color based on trend
  const getTrendDisplay = (value) => {
    if (value > 0) {
      return {
        icon: <TrendingUp fontSize="small" />,
        color: 'success.main'
      };
    }
    return {
      icon: <TrendingDown fontSize="small" />,
      color: 'error.main'
    };
  };

  return (
    <Paper sx={{ p: 3, height: '100%', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Performance Metrics</Typography>
        <ShowChart color="primary" />
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {/* Revenue Comparison */}
        <Grid item xs={12}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1">Revenue</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendDisplay(changes.revenueChange).color }}>
                {getTrendDisplay(changes.revenueChange).icon}
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  {formatPercentage(changes.revenueChange)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Current</Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(currentPeriod.revenue)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Previous</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(previousPeriod.revenue)}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(100, (currentPeriod.revenue / previousPeriod.revenue) * 100)} 
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        </Grid>
        
        {/* Expenses Comparison */}
        <Grid item xs={12}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1">Expenses</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendDisplay(-changes.expenseChange).color }}>
                {getTrendDisplay(-changes.expenseChange).icon}
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  {formatPercentage(changes.expenseChange)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Current</Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(currentPeriod.expenses)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Previous</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(previousPeriod.expenses)}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(100, (currentPeriod.expenses / previousPeriod.expenses) * 100)} 
              color="error"
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        </Grid>
        
        {/* Profit Comparison */}
        <Grid item xs={12}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1">Profit</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendDisplay(changes.profitChange).color }}>
                {getTrendDisplay(changes.profitChange).icon}
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  {formatPercentage(changes.profitChange)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Current</Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(currentPeriod.profit)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Previous</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(previousPeriod.profit)}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(100, previousPeriod.profit > 0 ? 
                (currentPeriod.profit / previousPeriod.profit) * 100 : 100)} 
              color="success"
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PerformanceMetricsCard;