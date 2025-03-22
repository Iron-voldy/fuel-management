// src/services/reports.service.js
import api from './api';

/**
 * Service for handling report-related API calls
 */
const ReportsService = {
  /**
   * Generate a sales report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generateSalesReport(params = {}) {
    return api.get('/reports/sales', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Generate a financial report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generateFinancialReport(params = {}) {
    return api.get('/reports/financial', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Generate an inventory report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generateInventoryReport(params = {}) {
    return api.get('/reports/inventory', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Generate a customer report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generateCustomerReport(params = {}) {
    return api.get('/reports/customers', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Generate a banking report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generateBankingReport(params = {}) {
    return api.get('/reports/banking', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Generate a petty cash transaction report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generatePettyCashTransactionReport(params = {}) {
    return api.get('/reports/petty-cash/transactions', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Generate a petty cash balance report
   * @param {Object} params - Report parameters
   * @returns {Promise} - Promise with report data
   */
  generatePettyCashBalanceReport(params = {}) {
    return api.get('/reports/petty-cash/balance', { params, responseType: params.format === 'json' ? 'json' : 'blob' });
  },

  /**
   * Get scheduled reports
   * @returns {Promise} - Promise with scheduled reports data
   */
  getScheduledReports() {
    return api.get('/reports/schedule');
  },

  /**
   * Schedule a report
   * @param {Object} scheduleData - Report schedule data
   * @returns {Promise} - Promise with schedule result
   */
  scheduleReport(scheduleData) {
    return api.post('/reports/schedule', scheduleData);
  },

  /**
   * Delete a scheduled report
   * @param {string} id - Scheduled report ID
   * @returns {Promise} - Promise with deletion result
   */
  deleteScheduledReport(id) {
    return api.delete(`/reports/schedule/${id}`);
  }
};

export default ReportsService;