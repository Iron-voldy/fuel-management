import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Box, Typography } from '@mui/material';

const TopSellingFuelsChart = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div>No fuel sales data available</div>;
  }

  // Define colors for different fuel types
  const backgroundColors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)'
  ];

  // Format the data for the chart
  const chartData = {
    labels: data.map(item => item.fuelType),
    datasets: [
      {
        data: data.map(item => item.amount),
        backgroundColor: backgroundColors.slice(0, data.length),
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
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
            const percentage = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentageValue = ((value / total) * 100).toFixed(1);
            return `${label}: LKR ${value.toLocaleString()} (${percentageValue}%)`;
          }
        }
      }
    },
    cutout: '60%'
  };

  // Calculate total fuel sales
  const totalSales = data.reduce((total, fuel) => total + fuel.amount, 0);
  const totalQuantity = data.reduce((total, fuel) => total + fuel.quantity, 0);

  return (
    <Box sx={{ position: 'relative', height: 270 }}>
      <Doughnut data={chartData} options={options} />
      <Box 
        sx={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        <Typography variant="body2" color="text.secondary">Total Sales</Typography>
        <Typography variant="h6">LKR {totalSales.toLocaleString()}</Typography>
        <Typography variant="body2" color="text.secondary">
          {totalQuantity.toLocaleString()} liters
        </Typography>
      </Box>
    </Box>
  );
};

export default TopSellingFuelsChart;