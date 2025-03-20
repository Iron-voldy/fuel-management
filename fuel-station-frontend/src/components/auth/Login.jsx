import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Email as EmailIcon,
  LocalGasStation as GasStationIcon
} from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';

// Background and accent colors
const COLORS = {
  primary: '#1976d2',
  secondary: '#f50057',
  background: '#f8f9fa',
  accent: '#3f51b5',
  success: '#4caf50',
  card: '#ffffff',
  textPrimary: '#333333',
  textSecondary: '#666666',
  borderLight: 'rgba(0, 0, 0, 0.12)'
};

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, error, clearErrors, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Show alert when error changes
  useEffect(() => {
    if (error) {
      setShowAlert(true);
      setIsSubmitting(false);
    }
  }, [error]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error for this field when user types
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: undefined });
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Attempt login
    const success = await login(formData.email, formData.password);
    
    if (success) {
      navigate('/dashboard');
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
        padding: 2
      }}
    >
      <Container maxWidth="md">
        <Grid 
          container 
          component={Paper} 
          elevation={10}
          sx={{ 
            borderRadius: 4,
            overflow: 'hidden',
            height: isMobile ? 'auto' : '600px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Left side - illustration/branding */}
          {!isMobile && (
            <Grid 
              item 
              md={6} 
              sx={{ 
                background: `linear-gradient(rgba(25, 118, 210, 0.8), rgba(63, 81, 181, 0.9)), 
                             url('https://source.unsplash.com/random/1200x900/?fuel,station')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                padding: 5,
                position: 'relative'
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  zIndex: 1
                }} 
              />
              
              <Box sx={{ zIndex: 2, textAlign: 'center' }}>
                <GasStationIcon sx={{ fontSize: 70, mb: 3 }} />
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  Fuel Station
                </Typography>
                <Typography variant="h5" gutterBottom>
                  Management System
                </Typography>
                <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.5)', width: '50%', mx: 'auto' }} />
                <Typography variant="body1" sx={{ mt: 2, maxWidth: '80%', mx: 'auto' }}>
                  Welcome back! Your comprehensive solution for fuel station operations, 
                  inventory management, and business analytics.
                </Typography>
              </Box>
            </Grid>
          )}
          
          {/* Right side - login form */}
          <Grid 
            item 
            xs={12} 
            md={6} 
            sx={{ 
              p: isMobile ? 3 : 5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              {isMobile && <GasStationIcon sx={{ fontSize: 40, color: COLORS.primary, mb: 1 }} />}
              <Typography variant="h4" component="h1" fontWeight="bold" color={COLORS.textPrimary}>
                Welcome Back
              </Typography>
              <Typography variant="subtitle1" color={COLORS.textSecondary}>
                Please sign in to continue
              </Typography>
            </Box>
            
            {error && showAlert && (
              <Alert 
                severity="error" 
                variant="filled"
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                onClose={() => { setShowAlert(false); clearErrors(); }}
              >
                {error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={loading || isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: COLORS.primary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: COLORS.primary,
                    },
                  }
                }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={loading || isSubmitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: COLORS.primary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: COLORS.primary,
                    },
                  }
                }}
              />
              
              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Typography 
                  variant="body2" 
                  color={COLORS.primary}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Forgot password?
                </Typography>
              </Box>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || isSubmitting}
                sx={{ 
                  mt: 2, 
                  mb: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  background: `linear-gradient(45deg, ${COLORS.primary} 30%, ${COLORS.accent} 90%)`,
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                  }
                }}
              >
                {(loading || isSubmitting) ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>
              
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color={COLORS.textSecondary}>
                  OR
                </Typography>
              </Divider>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color={COLORS.textSecondary}>
                  Don't have an account?{' '}
                  <Typography
                    component="span"
                    variant="body2"
                    color={COLORS.primary}
                    sx={{ 
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Contact Admin
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Typography 
          variant="body2" 
          color="white" 
          align="center" 
          sx={{ mt: 3, opacity: 0.8 }}
        >
          &copy; {new Date().getFullYear()} Fuel Station Management System. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Login;