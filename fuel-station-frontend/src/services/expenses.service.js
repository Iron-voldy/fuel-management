import api from './api';

// Expense Service
const ExpenseService = {
  // Get all expenses with optional filtering
  getAllExpenses: async (params = {}) => {
    try {
      const response = await api.get('/expenses', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get expense summary for dashboard
  getExpenseSummary: async (params = {}) => {
    try {
      const response = await api.get('/expenses/summary', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get expense by ID
  getExpenseById: async (id) => {
    try {
      const response = await api.get(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create a new expense
  createExpense: async (expenseData) => {
    try {
      const response = await api.post('/expenses', expenseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update an expense
  updateExpense: async (id, expenseData) => {
    try {
      const response = await api.put(`/expenses/${id}`, expenseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete an expense
  deleteExpense: async (id) => {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Approve an expense
  approveExpense: async (id, data = {}) => {
    try {
      const response = await api.put(`/expenses/${id}/approve`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reject an expense
  rejectExpense: async (id, rejectionReason = '') => {
    try {
      const response = await api.put(`/expenses/${id}/reject`, { rejectionReason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload expense attachment
  uploadAttachment: async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('attachment', file);
      
      const response = await api.post(`/expenses/${id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete expense attachment
  deleteAttachment: async (expenseId, attachmentId) => {
    try {
      const response = await api.delete(`/expenses/${expenseId}/attachments/${attachmentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default ExpenseService;