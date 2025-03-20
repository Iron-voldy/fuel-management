// src/routes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Pages
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import ExpensesPage from './pages/ExpensesPage';
import InventoryPage from './pages/InventoryPage';
import BankBookPage from './pages/BankBookPage';
import PettyCashPage from './pages/PettyCashPage';
import CustomersPage from './pages/CustomersPage';
import InvoicesPage from './pages/InvoicesPage';
import EmployeesPage from './pages/EmployeesPage';
import PayrollPage from './pages/PayrollPage';
import LoansPage from './pages/LoansPage';
import ReportsPage from './pages/ReportsPage';
import NotFoundPage from './pages/NotFoundPage';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/sales/*" element={<PrivateRoute><SalesPage /></PrivateRoute>} />
      <Route path="/expenses/*" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
      <Route path="/inventory/*" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
      <Route path="/bank-book/*" element={<PrivateRoute><BankBookPage /></PrivateRoute>} />
      <Route path="/petty-cash/*" element={<PrivateRoute><PettyCashPage /></PrivateRoute>} />
      <Route path="/customers/*" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
      <Route path="/invoices/*" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
      <Route path="/employees/*" element={<PrivateRoute><EmployeesPage /></PrivateRoute>} />
      <Route path="/payroll/*" element={<PrivateRoute><PayrollPage /></PrivateRoute>} />
      <Route path="/loans/*" element={<PrivateRoute><LoansPage /></PrivateRoute>} />
      <Route path="/reports/*" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;