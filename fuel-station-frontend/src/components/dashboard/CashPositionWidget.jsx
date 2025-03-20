
// src/components/dashboard/CashPositionWidget.jsx
import React from 'react';

const CashPositionWidget = ({ data }) => {
  return (
    <div className="widget">
      <h3>Cash Position</h3>
      {data ? (
        <div className="cash-stats">
          <p>Bank Balance: ${data.bankBalance?.toFixed(2) || '0.00'}</p>
          <p>Petty Cash: ${data.pettyCash?.toFixed(2) || '0.00'}</p>
          <p>Total Cash: ${data.totalCash?.toFixed(2) || '0.00'}</p>
        </div>
      ) : (
        <p>Loading cash position data...</p>
      )}
    </div>
  );
};

export default CashPositionWidget;

