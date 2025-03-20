// src/components/dashboard/InventoryStatusWidget.jsx
import React from 'react';

const InventoryStatusWidget = ({ data }) => {
  return (
    <div className="widget">
      <h3>Inventory Status</h3>
      {data ? (
        <div className="inventory-stats">
          <p>Total Stock Value: ${data.totalValue?.toFixed(2) || '0.00'}</p>
          <p>Low Stock Items: {data.lowStockItems || 0}</p>
          <p>Out of Stock Items: {data.outOfStockItems || 0}</p>
        </div>
      ) : (
        <p>Loading inventory data...</p>
      )}
    </div>
  );
};

export default InventoryStatusWidget;