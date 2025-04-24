import axios from 'axios';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

const API_URL = 'http://localhost:5000/api/loans';

const loansService = {
  // Centralized error handling
  handleError: (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        // Token might be expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject('Authentication failed. Please log in again.');
      }
      return Promise.reject(error.response.data.message || 'Server error');
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject('No response from server. Check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject('Error setting up request. Please try again.');
    }
  },

  // Get all loans
  getAllLoans: async (params = {}) => {
    try {
      const token = getToken();
      const response = await axios.get(API_URL, {
        params,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token 
        }
      });
      return response.data;
    } catch (error) {
      return loansService.handleError(error);
    }
  },

  // Get loan by ID
  getLoanById: async (id) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token 
        }
      });
      return response.data;
    } catch (error) {
      return loansService.handleError(error);
    }
  },

  // Apply for a new loan
  applyForLoan: async (loanData) => {
    try {
      const token = getToken();
      const response = await axios.post(API_URL, loanData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token 
        }
      });
      return response.data;
    } catch (error) {
      return loansService.handleError(error);
    }
  },

  // Update loan details
  updateLoan: async (id, loanData) => {
    try {
      const token = getToken();
      const response = await axios.put(`${API_URL}/${id}`, loanData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token 
        }
      });
      return response.data;
    } catch (error) {
      return loansService.handleError(error);
    }
  },

  // Get employee loans
  getEmployeeLoans: async (employeeId) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/employee/${employeeId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token 
        }
      });
      return response.data;
    } catch (error) {
      return loansService.handleError(error);
    }
  }
};

export default loansService;