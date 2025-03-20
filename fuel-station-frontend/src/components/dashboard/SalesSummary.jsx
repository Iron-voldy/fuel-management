// src/components/dashboard/SalesSummary.jsx
import React from 'react';

const SalesSummary = ({ data }) => {
  return (
    <div className="widget">
      <h3>Sales Summary</h3>
      {data ? (
        <div className="sales-stats">
          <p>Total Sales: ${data.totalSales?.toFixed(2) || '0.00'}</p>
          <p>Daily Average: ${data.dailyAverage?.toFixed(2) || '0.00'}</p>
          <p>Total Transactions: {data.totalTransactions || 0}</p>
        </div>
      ) : (
        <p>Loading sales data...</p>
      )}
    </div>
  );
};

export default SalesSummary;

