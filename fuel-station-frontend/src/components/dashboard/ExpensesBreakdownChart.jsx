import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Box, Typography } from '@mui/material';

const ExpensesBreakdownChart = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div>No expense data available</div>;
  }

  // Define colors for different expense categories
  const backgroundColors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(199, 199, 199, 0.7)'
  ];

  // Format the data for the chart
  const chartData = {
    labels: data.map(item => item.category),
    datasets: [
      {
        data: data.map(item => item.amount),
        backgroundColor: backgroundColors.slice(0, data.length),
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentageValue = ((value / total) * 100).toFixed(1);
            return `${label}: LKR ${value.toLocaleString()} (${percentageValue}%)`;
          }
        }
      }
    }
  };

  // Calculate total expenses
  const totalExpenses = data.reduce((total, category) => total + category.amount, 0);

  return (
    <Box sx={{ height: 270 }}>
      <Pie data={chartData} options={options} />
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
        <Typography variant="h6">LKR {totalExpenses.toLocaleString()}</Typography>
      </Box>
    </Box>
  );
};

export default ExpensesBreakdownChart;