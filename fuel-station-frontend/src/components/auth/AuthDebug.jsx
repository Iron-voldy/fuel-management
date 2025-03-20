import React, { useContext } from 'react';
import { Box, Typography, Paper, Divider, Button } from '@mui/material';
import AuthContext from '../../context/AuthContext';
import jwtDecode from 'jwt-decode';

// This component is for debugging authentication issues
// It should only be used during development
const AuthDebug = () => {
  const { user, token, isAuthenticated, loading, error } = useContext(AuthContext);

  // Parse JWT token if it exists
  const parseJwt = (token) => {
    try {
      if (!token) return null;
      return jwtDecode(token);
    } catch (error) {
      console.error('Invalid token format:', error);
      return null;
    }
  };

  const parsedToken = parseJwt(token);
  const tokenExpiry = parsedToken ? new Date(parsedToken.exp * 1000).toLocaleString() : 'N/A';
  const tokenIssuedAt = parsedToken ? new Date(parsedToken.iat * 1000).toLocaleString() : 'N/A';
  const isTokenExpired = parsedToken ? Date.now() > parsedToken.exp * 1000 : false;

  const clearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Authentication Debug Panel
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This panel shows the current authentication state for debugging purposes.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          Authentication Status:
        </Typography>
        <Typography 
          variant="body1" 
          color={isAuthenticated ? 'success.main' : 'error.main'}
          sx={{ mb: 2 }}
        >
          {isAuthenticated ? 'Authenticated' : 'Not Authenticated'} 
          {loading ? ' (Loading...)' : ''}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          User Data:
        </Typography>
        {user ? (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2">ID: {user._id || user.id}</Typography>
            <Typography variant="body2">Name: {user.name}</Typography>
            <Typography variant="body2">Email: {user.email}</Typography>
            <Typography variant="body2">Role: {user.role}</Typography>
            <Typography variant="body2">Created: {new Date(user.date).toLocaleString()}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No user data available
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          JWT Token:
        </Typography>
        {token ? (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography 
              variant="body2" 
              color={isTokenExpired ? 'error.main' : 'text.primary'}
            >
              Token Status: {isTokenExpired ? 'EXPIRED' : 'Valid'}
            </Typography>
            <Typography variant="body2">Issued At: {tokenIssuedAt}</Typography>
            <Typography variant="body2">Expires: {tokenExpiry}</Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all', mt: 1 }}>
              Token: {token.substring(0, 20)}...{token.substring(token.length - 20)}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No token available
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight="bold">
          Error State:
        </Typography>
        {error ? (
          <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
            {error}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No errors
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={clearLocalStorage}
          >
            Clear Local Storage
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AuthDebug;