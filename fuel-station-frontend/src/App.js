import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Context providers
import { AuthProvider } from './context/AuthContext';

// Components - Auth
import Login from './components/auth/Login';
import AuthDebug from './components/auth/AuthDebug';

// Components - Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Components - Dashboard
import Dashboard from './components/dashboard/Dashboard';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bank-accounts" element={<div>Bank Accounts Page (Coming Soon)</div>} />
                <Route path="/sales" element={<div>Sales Page (Coming Soon)</div>} />
                <Route path="/inventory" element={<div>Inventory Page (Coming Soon)</div>} />
                <Route path="/customers" element={<div>Customers Page (Coming Soon)</div>} />
                <Route path="/expenses" element={<div>Expenses Page (Coming Soon)</div>} />
                <Route path="/reports" element={<div>Reports Page (Coming Soon)</div>} />
              </Route>
            </Route>
            
            {/* Admin-only routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<Layout />}>
                <Route path="/admin" element={<div>Admin Page (Coming Soon)</div>} />
              </Route>
            </Route>
            
            {/* Fallback routes */}
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;