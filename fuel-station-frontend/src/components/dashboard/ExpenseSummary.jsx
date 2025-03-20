// src/components/dashboard/ExpenseSummary.jsx
import React from 'react';

const ExpenseSummary = ({ data }) => {
  return (
    <div className="widget">
      <h3>Expense Summary</h3>
      {data ? (
        <div className="expense-stats">
          <p>Total Expenses: ${data.totalExpenses?.toFixed(2) || '0.00'}</p>
          <p>Daily Average: ${data.dailyAverage?.toFixed(2) || '0.00'}</p>
          <p>Top Category: {data.topCategory || 'N/A'}</p>
        </div>
      ) : (
        <p>Loading expense data...</p>
      )}
    </div>
  );
};

export default ExpenseSummary;
