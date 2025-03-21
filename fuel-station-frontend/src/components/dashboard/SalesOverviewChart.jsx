import React from 'react';
import { Line } from 'react-chartjs-2';

const SalesOverviewChart = ({ data }) => {
  if (!data || !data.trends || !Array.isArray(data.trends)) {
    return <div>No sales data available</div>;
  }
  
  // Format the data for the chart
  const chartData = {
    labels: data.trends.map(item => item.period),
    datasets: [
      {
        label: 'Revenue',
        data: data.trends.map(item => item.revenue),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4
      },
      {
        label: 'Expenses',
        data: data.trends.map(item => item.expenses),
        fill: false,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        tension: 0.4
      },
      {
        label: 'Profit',
        data: data.trends.map(item => item.profit),
        fill: false,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: LKR ${context.raw.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'LKR ' + value.toLocaleString();
          }
        },
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
  };

  return (
    <div style={{ height: 300 }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SalesOverviewChart;