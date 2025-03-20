import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import AuthContext from '../../context/AuthContext';

// Handle both loading state and authentication
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for role-based access if allowedRoles are specified
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but not authorized for this route
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and authorized (or no specific roles required)
  return <Outlet />;
};

export default ProtectedRoute;