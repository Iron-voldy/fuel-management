// src/services/customers.service.js
import api from './api';

/**
 * Service for handling customer-related API calls
 */
const CustomersService = {
  /**
   * Get all customers with optional filtering
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise} - Promise with customer data
   */
  getAllCustomers(params = {}) {
    return api.get('/customers', { params });
  },

  /**
   * Get a customer by ID
   * @param {string} id - Customer ID
   * @returns {Promise} - Promise with customer data
   */
  getCustomerById(id) {
    return api.get(`/customers/${id}`);
  },

  /**
   * Create a new customer
   * @param {Object} customerData - Customer data to create
   * @returns {Promise} - Promise with created customer
   */
  createCustomer(customerData) {
    return api.post('/customers', customerData);
  },

  /**
   * Update an existing customer
   * @param {string} id - Customer ID
   * @param {Object} customerData - Updated customer data
   * @returns {Promise} - Promise with updated customer
   */
  updateCustomer(id, customerData) {
    return api.put(`/customers/${id}`, customerData);
  },

  /**
   * Delete a customer
   * @param {string} id - Customer ID
   * @returns {Promise} - Promise with delete result
   */
  deleteCustomer(id) {
    return api.delete(`/customers/${id}`);
  },

  /**
   * Set up credit account for a customer
   * @param {string} id - Customer ID
   * @param {Object} creditData - Credit account data
   * @returns {Promise} - Promise with result
   */
  setupCreditAccount(id, creditData) {
    return api.post(`/customers/${id}/credit-account`, creditData);
  },

  /**
   * Update credit account settings
   * @param {string} id - Customer ID
   * @param {Object} creditData - Updated credit account data
   * @returns {Promise} - Promise with result
   */
  updateCreditAccount(id, creditData) {
    return api.put(`/customers/${id}/credit-account`, creditData);
  },

  /**
   * Get credit report for a customer
   * @param {string} id - Customer ID
   * @param {Object} params - Query parameters (start date, end date)
   * @returns {Promise} - Promise with credit report
   */
  getCreditReport(id, params = {}) {
    return api.get(`/customers/${id}/credit-report`, { params });
  },

  /**
   * Upload document for a customer
   * @param {string} id - Customer ID
   * @param {FormData} formData - Form data with file and document type
   * @returns {Promise} - Promise with result
   */
  uploadDocument(id, formData) {
    return api.post(`/customers/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Delete document from a customer
   * @param {string} customerId - Customer ID
   * @param {string} documentId - Document ID
   * @returns {Promise} - Promise with result
   */
  deleteDocument(customerId, documentId) {
    return api.delete(`/customers/${customerId}/documents/${documentId}`);
  }
};

export default CustomersService;