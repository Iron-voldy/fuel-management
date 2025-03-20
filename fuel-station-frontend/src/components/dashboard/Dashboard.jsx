// src/components/dashboard/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import SalesSummary from './SalesSummary';
import ExpenseSummary from './ExpenseSummary';
import CashPositionWidget from './CashPositionWidget';
import InventoryStatusWidget from './InventoryStatusWidget';
import api from '../../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    salesSummary: null,
    expenseSummary: null,
    cashPosition: null,
    inventoryStatus: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // You would replace these with actual API calls to your backend
        const salesResponse = await api.get('/sales/summary');
        const expensesResponse = await api.get('/expenses/summary');
        const cashResponse = await api.get('/finance/cash-position');
        const inventoryResponse = await api.get('/inventory/status');

        setDashboardData({
          salesSummary: salesResponse.data,
          expenseSummary: expensesResponse.data,
          cashPosition: cashResponse.data,
          inventoryStatus: inventoryResponse.data,
          loading: false,
          error: null
        });
      } catch (error) {
        setDashboardData(prevState => ({
          ...prevState,
          loading: false,
          error: 'Failed to load dashboard data'
        }));
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  if (dashboardData.loading) {
    return <div>Loading dashboard data...</div>;
  }

  if (dashboardData.error) {
    return <div>Error: {dashboardData.error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <div className="dashboard-widgets">
        <div className="widget-row">
          <SalesSummary data={dashboardData.salesSummary} />
          <ExpenseSummary data={dashboardData.expenseSummary} />
        </div>
        <div className="widget-row">
          <CashPositionWidget data={dashboardData.cashPosition} />
          <InventoryStatusWidget data={dashboardData.inventoryStatus} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;