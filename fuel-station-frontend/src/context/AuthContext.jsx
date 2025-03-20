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
    baseURL: 'http://localhost:5000/api',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
  };

  // Clear errors
  const clearErrors = () => {
    setError(null);
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
        api
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;