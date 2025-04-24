import api from './api';

const employeeAPI = {
  // Get all employees with optional filtering and pagination
  getAll: (params = {}) => {
    return api.get('/employees', { 
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search || '',
        sortBy: params.sortBy || 'personalInfo.name',
        sortOrder: params.sortOrder || 'asc',
        ...params
      }
    });
  },

  // Get employee by ID
  getById: (id) => {
    if (!id) {
      throw new Error('Employee ID is required');
    }
    return api.get(`/employees/${id}`);
  },

  // Create a new employee
  create: (employeeData) => {
    // Basic validation
    if (!employeeData) {
      throw new Error('Employee data is required');
    }
    
    // Validate required fields
    const requiredFields = [
      'employeeId', 
      'personalInfo.name', 
      'personalInfo.contact', 
      'personalInfo.email',
      'position',
      'salary.basic',
      'bankDetails.bankName',
      'bankDetails.accountNumber'
    ];

    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj && obj[key], employeeData);
      if (!value) {
        throw new Error(`${field} is required`);
      }
    });

    return api.post('/employees', employeeData);
  },

  // Update an existing employee
  update: (id, employeeData) => {
    if (!id) {
      throw new Error('Employee ID is required');
    }

    if (!employeeData) {
      throw new Error('Employee data is required');
    }

    return api.put(`/employees/${id}`, employeeData);
  },

  // Delete an employee
  delete: (id) => {
    if (!id) {
      throw new Error('Employee ID is required');
    }

    return api.delete(`/employees/${id}`);
  },

  // Advanced search with multiple criteria
  search: (criteria) => {
    return api.get('/employees/search', { 
      params: criteria 
    });
  },

  // Export employees to various formats
  export: (format = 'csv', filters = {}) => {
    return api.get('/employees/export', {
      params: {
        format, // 'csv', 'xlsx', 'pdf'
        ...filters
      },
      responseType: 'blob' // For file download
    });
  }
};

export default employeeAPI;