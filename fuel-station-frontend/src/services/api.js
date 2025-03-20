import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add token to every request if it exists in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getUser: () => api.get('/auth/user')
};

// Dashboard API
export const dashboardAPI = {
  getFinancialSummary: () => api.get('/dashboard/financial-summary'),
  getProfitLoss: (params) => api.get('/dashboard/profit-loss', { params }),
  getBalanceSheet: (params) => api.get('/dashboard/balance-sheet', { params }),
  getCashFlow: (params) => api.get('/dashboard/cash-flow', { params }),
  getFuelPriceAnalysis: (params) => api.get('/dashboard/fuel-price-analysis', { params })
};

// Bank Account API
export const bankAccountAPI = {
  getAll: () => api.get('/bank-book/accounts'),
  getById: (id) => api.get(`/bank-book/accounts/${id}`),
  create: (accountData) => api.post('/bank-book/accounts', accountData),
  update: (id, accountData) => api.put(`/bank-book/accounts/${id}`, accountData),
  delete: (id) => api.delete(`/bank-book/accounts/${id}`),
  getSummary: (id) => api.get(`/bank-book/accounts/${id}/summary`),
  reconcile: (id, data) => api.post(`/bank-book/accounts/${id}/reconcile`, data),
  transferFunds: (data) => api.post('/bank-book/transfer', data)
};

// Transaction API
export const transactionAPI = {
  getAll: (params) => api.get('/bank-book/transactions', { params }),
  getById: (id) => api.get(`/bank-book/transactions/${id}`),
  create: (transactionData) => api.post('/bank-book/transactions', transactionData),
  update: (id, transactionData) => api.put(`/bank-book/transactions/${id}`, transactionData),
  delete: (id) => api.delete(`/bank-book/transactions/${id}`),
  reconcile: (id) => api.put(`/bank-book/transactions/${id}/reconcile`),
  batchReconcile: (data) => api.post('/bank-book/transactions/batch-reconcile', data),
  getStats: (params) => api.get('/bank-book/transactions/stats', { params })
};

// Expense API
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (expenseData) => api.post('/expenses', expenseData),
  update: (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  delete: (id) => api.delete(`/expenses/${id}`),
  approve: (id, data) => api.put(`/expenses/${id}/approve`, data),
  reject: (id, data) => api.put(`/expenses/${id}/reject`, data),
  getSummary: (params) => api.get('/expenses/summary', { params })
};

// Sales API
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (saleData) => api.post('/sales', saleData),
  createIoT: (iotData) => api.post('/sales/iot', iotData),
  update: (id, saleData) => api.put(`/sales/${id}`, saleData),
  delete: (id) => api.delete(`/sales/${id}`),
  getSummary: (params) => api.get('/sales/summary', { params }),
  getReport: (params) => api.get('/sales/report', { params }),
  reconcile: (data) => api.post('/sales/reconcile', data)
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (inventoryData) => api.post('/inventory', inventoryData),
  update: (id, inventoryData) => api.put(`/inventory/${id}`, inventoryData),
  addStock: (id, data) => api.post(`/inventory/${id}/add-stock`, data),
  reduceStock: (id, data) => api.post(`/inventory/${id}/reduce-stock`, data),
  updatePrice: (id, data) => api.post(`/inventory/${id}/update-price`, data),
  getValuation: (params) => api.get('/inventory/valuation', { params }),
  getStatus: (params) => api.get('/inventory/status', { params }),
  getMovement: (params) => api.get('/inventory/movement', { params }),
  reconcile: (data) => api.post('/inventory/reconcile', data)
};

// Customer API
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (customerData) => api.post('/customers', customerData),
  update: (id, customerData) => api.put(`/customers/${id}`, customerData),
  delete: (id) => api.delete(`/customers/${id}`),
  setupCreditAccount: (id, data) => api.post(`/customers/${id}/credit-account`, data),
  updateCreditAccount: (id, data) => api.put(`/customers/${id}/credit-account`, data),
  getCreditReport: (id, params) => api.get(`/customers/${id}/credit-report`, { params })
};

// Invoice API
export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (invoiceData) => api.post('/invoices', invoiceData),
  update: (id, invoiceData) => api.put(`/invoices/${id}`, invoiceData),
  cancel: (id) => api.put(`/invoices/${id}/cancel`),
  recordPayment: (id, paymentData) => api.post(`/invoices/${id}/payment`, paymentData),
  generateFromSales: (data) => api.post('/invoices/generate-from-sales', data),
  getAgingReport: (params) => api.get('/invoices/aging-report', { params })
};

export default api;