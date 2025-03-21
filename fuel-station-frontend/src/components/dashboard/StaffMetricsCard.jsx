import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  Divider, 
  LinearProgress,
  Avatar
} from '@mui/material';
import { 
  People,
  AttachMoney,
  AccountBalance
} from '@mui/icons-material';

const StaffMetricsCard = ({ data }) => {
  if (!data) {
    return (
      <Paper sx={{ p: 3, height: '100%', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" gutterBottom>Staff Metrics</Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography variant="body2" color="text.secondary">No staff data available</Typography>
        </Box>
      </Paper>
    );
  }

  // Format currency
  const formatCurrency = (value) => `LKR ${value.toLocaleString()}`;

  return (
    <Paper sx={{ p: 3, height: '100%', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Staff Metrics</Typography>
        <People color="primary" />
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {/* Employee Count Metric */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <People />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="medium">{data.employeeCount}</Typography>
              <Typography variant="body2" color="text.secondary">Total Employees</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Payroll Expense Metric */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
              <AttachMoney />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="medium">{formatCurrency(data.payroll?.totalSalaryExpense || 0)}</Typography>
              <Typography variant="body2" color="text.secondary">Monthly Payroll</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Loans Metric */}
        <Grid item xs={12}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccountBalance fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="body1">Active Loans</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Count</Typography>
              <Typography variant="body2" fontWeight="medium">
                {data.loans?.activeLoansCount || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Outstanding Amount</Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(data.loans?.totalOutstandingAmount || 0)}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Salary Breakdown */}
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary" gutterBottom>Salary Breakdown</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2">Basic Salary</Typography>
              <LinearProgress 
                variant="determinate" 
                value={100} 
                sx={{ height: 8, borderRadius: 2, mb: 1 }}
              />
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(data.payroll?.totalBasicSalary || 0)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">Allowances</Typography>
              <LinearProgress 
                variant="determinate" 
                value={data.payroll?.totalBasicSalary ? 
                  Math.min(100, (data.payroll.totalAllowances / data.payroll.totalBasicSalary) * 100) : 0} 
                color="secondary"
                sx={{ height: 8, borderRadius: 2, mb: 1 }}
              />
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(data.payroll?.totalAllowances || 0)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StaffMetricsCard;