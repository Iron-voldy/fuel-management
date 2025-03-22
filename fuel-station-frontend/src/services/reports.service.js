// src/services/reports.service.js
import api from './api';

const ReportsService = {
  generateSalesReport: (params, format = 'json') => {
    return api.get('/reports/sales', { 
      params,
      responseType: format !== 'json' ? 'blob' : 'json'
    });
  },
  
  generateFinancialReport: (params, format = 'json') => {
    return api.get('/reports/financial', { 
      params,
      responseType: format !== 'json' ? 'blob' : 'json'
    });
  },
  
  generateInventoryReport: (params, format = 'json') => {
    return api.get('/reports/inventory', { 
      params,
      responseType: format !== 'json' ? 'blob' : 'json'
    });
  },
  
  generateCustomerReport: (params, format = 'json') => {
    return api.get('/reports/customers', { 
      params,
      responseType: format !== 'json' ? 'blob' : 'json'
    });
  },
  
  generateBankingReport: (params, format = 'json') => {
    return api.get('/reports/banking', { 
      params,
      responseType: format !== 'json' ? 'blob' : 'json'
    });
  },
  
  scheduleReport: (reportData) => {
    return api.post('/reports/schedule', reportData);
  },
  
  getScheduledReports: () => {
    return api.get('/reports/schedule');
  },
  
  deleteScheduledReport: (id) => {
    return api.delete(`/reports/schedule/${id}`);
  }
};

export default ReportsService;