// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import AuthService from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const user = AuthService.getCurrentUser();
    if (user && AuthService.isAuthenticated()) {
      setCurrentUser(user);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await AuthService.login(email, password);
      setCurrentUser(AuthService.getCurrentUser());
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await AuthService.register(userData);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setCurrentUser(null);
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await AuthService.forgotPassword(email);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process forgot password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await AuthService.resetPassword(token, newPassword);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    isLoading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    isAuthenticated: () => AuthService.isAuthenticated()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};