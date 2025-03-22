// src/validators/customerValidator.js
import validation from '../utils/validation';

/**
 * Validates a customer form data object
 * @param {Object} customerData - The customer data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateCustomerForm = (customerData) => {
  const validationRules = {
    name: [
      { validator: validation.isNotEmpty, message: 'Customer name is required' },
      { validator: (val) => validation.hasMinLength(val, 3), message: 'Name must be at least 3 characters' }
    ],
    type: [
      { validator: validation.isNotEmpty, message: 'Customer type is required' }
    ],
    'contactInfo.address': [
      { validator: validation.isNotEmpty, message: 'Address is required' }
    ],
    'contactInfo.city': [
      { validator: validation.isNotEmpty, message: 'City is required' }
    ],
    'contactInfo.phone': [
      { validator: validation.isNotEmpty, message: 'Phone number is required' },
      { validator: validation.isValidPhone, message: 'Please enter a valid phone number' }
    ],
    'contactInfo.email': [
      { validator: validation.isNotEmpty, message: 'Email is required' },
      { validator: validation.isValidEmail, message: 'Please enter a valid email address' }
    ],
    status: [
      { validator: validation.isNotEmpty, message: 'Status is required' }
    ]
  };

  // Add conditional validation for credit customers
  if (customerData.type === 'Corporate' || customerData.type === 'Government') {
    validationRules['creditLimit'] = [
      { validator: validation.isNotEmpty, message: 'Credit limit is required for corporate customers' },
      { validator: validation.isPositiveNumber, message: 'Credit limit must be a positive number' }
    ];

    if (customerData.authorizedPersons && customerData.authorizedPersons.length > 0) {
      customerData.authorizedPersons.forEach((person, index) => {
        validationRules[`authorizedPersons[${index}].name`] = [
          { validator: validation.isNotEmpty, message: 'Authorized person name is required' }
        ];
        validationRules[`authorizedPersons[${index}].position`] = [
          { validator: validation.isNotEmpty, message: 'Position is required' }
        ];
        validationRules[`authorizedPersons[${index}].contactNumber`] = [
          { validator: validation.isNotEmpty, message: 'Contact number is required' },
          { validator: validation.isValidPhone, message: 'Please enter a valid phone number' }
        ];
      });
    }
  }

  // Validate vehicle information if provided
  if (customerData.authorizedVehicles && customerData.authorizedVehicles.length > 0) {
    customerData.authorizedVehicles.forEach((vehicle, index) => {
      validationRules[`authorizedVehicles[${index}].vehicleNumber`] = [
        { validator: validation.isNotEmpty, message: 'Vehicle number is required' },
        { validator: validation.isValidVehicleNumber, message: 'Please enter a valid vehicle number (e.g. ABC-1234)' }
      ];
      validationRules[`authorizedVehicles[${index}].vehicleType`] = [
        { validator: validation.isNotEmpty, message: 'Vehicle type is required' }
      ];
    });
  }

  return validation.validateForm(customerData, validationRules);
};

/**
 * Validates a single customer field
 * @param {string} fieldName - The name of the field to validate
 * @param {any} value - The value of the field
 * @param {Object} formData - The complete form data object (for contextual validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateCustomerField = (fieldName, value, formData) => {
  // Handle nested fields
  if (fieldName.includes('.')) {
    const [parent, child] = fieldName.split('.');
    
    // Handle array fields with indexes
    if (parent.includes('[') && parent.includes(']')) {
      const [arrayName, indexStr] = parent.match(/(\w+)\[(\d+)\]/).slice(1);
      const index = parseInt(indexStr, 10);
      
      if (arrayName === 'authorizedPersons') {
        switch (child) {
          case 'name':
            return validation.isNotEmpty(value) ? null : 'Name is required';
          case 'position':
            return validation.isNotEmpty(value) ? null : 'Position is required';
          case 'contactNumber':
            if (!validation.isNotEmpty(value)) return 'Contact number is required';
            return validation.isValidPhone(value) ? null : 'Please enter a valid phone number';
          default:
            return null;
        }
      } else if (arrayName === 'authorizedVehicles') {
        switch (child) {
          case 'vehicleNumber':
            if (!validation.isNotEmpty(value)) return 'Vehicle number is required';
            return validation.isValidVehicleNumber(value) ? null : 'Please enter a valid vehicle number (e.g. ABC-1234)';
          case 'vehicleType':
            return validation.isNotEmpty(value) ? null : 'Vehicle type is required';
          default:
            return null;
        }
      }
    }
    
    // Regular nested fields
    switch (`${parent}.${child}`) {
      case 'contactInfo.address':
        return validation.isNotEmpty(value) ? null : 'Address is required';
      case 'contactInfo.city':
        return validation.isNotEmpty(value) ? null : 'City is required';
      case 'contactInfo.phone':
        if (!validation.isNotEmpty(value)) return 'Phone number is required';
        return validation.isValidPhone(value) ? null : 'Please enter a valid phone number';
      case 'contactInfo.email':
        if (!validation.isNotEmpty(value)) return 'Email is required';
        return validation.isValidEmail(value) ? null : 'Please enter a valid email address';
      default:
        return null;
    }
  }

  // Regular fields
  switch (fieldName) {
    case 'name':
      if (!validation.isNotEmpty(value)) return 'Customer name is required';
      return validation.hasMinLength(value, 3) ? null : 'Name must be at least 3 characters';
    case 'type':
      return validation.isNotEmpty(value) ? null : 'Customer type is required';
    case 'status':
      return validation.isNotEmpty(value) ? null : 'Status is required';
    case 'creditLimit':
      if (formData.type === 'Corporate' || formData.type === 'Government') {
        if (!validation.isNotEmpty(value)) return 'Credit limit is required for corporate customers';
        return validation.isPositiveNumber(value) ? null : 'Credit limit must be a positive number';
      }
      return null;
    default:
      return null;
  }
};

export default {
  validateCustomerForm,
  validateCustomerField
};