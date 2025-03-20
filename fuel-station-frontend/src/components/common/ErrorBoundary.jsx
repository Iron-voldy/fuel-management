import React, { Component } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // You can also log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            
            <Typography variant="h5" gutterBottom color="error">
              Something went wrong
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              The application encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => window.location.href = '/'}
                sx={{ mr: 2 }}
              >
                Go to Dashboard
              </Button>
              
              <Button 
                variant="outlined"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </Box>
            
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Error Details (Development Only):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ 
                  overflow: 'auto',
                  background: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}>
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    // Otherwise, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;