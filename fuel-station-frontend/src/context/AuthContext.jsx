import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

// Create auth context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios defaults
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add token to requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete api.defaults.headers.common['x-auth-token'];
    }
  }, [token, api.defaults.headers.common]);

  // Configure request interceptor to add token to every request
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      config => {
        // Get fresh token from localStorage for each request
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['x-auth-token'] = token;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    
    // Configure response interceptor to handle auth errors
    const responseInterceptor = api.interceptors.response.use(
      response => response,
      error => {
        // Handle authentication errors (401, 403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Clear token and user data
          logout();
        }
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptors on unmount
    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [api]);

  // Load user on mount or token change
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Check token expiration
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          // Token expired
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setError('Session expired. Please log in again.');
          setLoading(false);
          return;
        }

        // Get user data
        const res = await api.get('/auth/user');
        
        setUser(res.data);
        setIsAuthenticated(true);
        setError(null);
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(err.response?.data?.msg || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token, api]);

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        return true;
      } else {
        setError('Invalid login response');
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.msg || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post('/auth/register', userData);
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        return true;
      } else {
        setError('Invalid registration response');
        return false;
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.errors?.[0]?.msg || 
        err.response?.data?.msg || 
        'Registration failed'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Clear errors
  const clearErrors = () => {
    setError(null);
  };

  // Check if token is valid
  const checkTokenValidity = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return false;
      }
      
      // Verify token with backend
      const res = await api.get('/auth/verify');
      return res.data.valid === true;
    } catch (err) {
      console.error('Token validation error:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        error,
        login,
        register,
        logout,
        clearErrors,
        checkTokenValidity,
        api
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;