import validation from '../utils/validation';

// Validation rules and helper functions for employee data
export const employeeValidationRules = {
  // Basic validation rules for different fields
  employeeId: [
    { validator: validation.isNotEmpty, message: 'Employee ID is required' },
    { validator: (val) => /^EMP-\d{4,6}$/.test(val), message: 'Employee ID must be in format EMP-XXXX' }
  ],
  
  personalInfoName: [
    { validator: validation.isNotEmpty, message: 'Name is required' },
    { validator: (val) => validation.hasMinLength(val, 3), message: 'Name must be at least 3 characters' }
  ],
  
  personalInfoEmail: [
    { validator: validation.isNotEmpty, message: 'Email is required' },
    { validator: validation.isValidEmail, message: 'Please enter a valid email address' }
  ],
  
  personalInfoContact: [
    { validator: validation.isNotEmpty, message: 'Contact number is required' },
    { validator: validation.isValidPhone, message: 'Please enter a valid phone number' }
  ],
  
  position: [
    { validator: validation.isNotEmpty, message: 'Position is required' }
  ],
  
  basicSalary: [
    { validator: validation.isNotEmpty, message: 'Basic salary is required' },
    { validator: validation.isPositiveNumber, message: 'Basic salary must be a positive number' }
  ],
  
  bankName: [
    { validator: validation.isNotEmpty, message: 'Bank name is required' }
  ],
  
  accountNumber: [
    { validator: validation.isNotEmpty, message: 'Account number is required' },
    { validator: (val) => /^\d{8,20}$/.test(val.replace(/\s/g, '')), message: 'Account number must be 8-20 digits' }
  ]
};

/**
 * Validates the entire employee form
 * @param {Object} employeeData - Employee data to validate
 * @returns {Object} Validation result with isValid flag and errors
 */
export const validateEmployeeForm = (employeeData) => {
  const errors = {};
  
  // Validate personal info
  if (!employeeData.personalInfo) {
    errors.personalInfo = 'Personal information is required';
  } else {
    // Name validation
    if (!employeeValidationRules.personalInfoName[0].validator(employeeData.personalInfo.name)) {
      errors['personalInfo.name'] = employeeValidationRules.personalInfoName[0].message;
    } else if (!employeeValidationRules.personalInfoName[1].validator(employeeData.personalInfo.name)) {
      errors['personalInfo.name'] = employeeValidationRules.personalInfoName[1].message;
    }

    // Email validation
    if (!employeeValidationRules.personalInfoEmail[0].validator(employeeData.personalInfo.email)) {
      errors['personalInfo.email'] = employeeValidationRules.personalInfoEmail[0].message;
    } else if (!employeeValidationRules.personalInfoEmail[1].validator(employeeData.personalInfo.email)) {
      errors['personalInfo.email'] = employeeValidationRules.personalInfoEmail[1].message;
    }

    // Contact validation
    if (!employeeValidationRules.personalInfoContact[0].validator(employeeData.personalInfo.contact)) {
      errors['personalInfo.contact'] = employeeValidationRules.personalInfoContact[0].message;
    } else if (!employeeValidationRules.personalInfoContact[1].validator(employeeData.personalInfo.contact)) {
      errors['personalInfo.contact'] = employeeValidationRules.personalInfoContact[1].message;
    }
  }

  // Employee ID validation
  if (!employeeValidationRules.employeeId[0].validator(employeeData.employeeId)) {
    errors.employeeId = employeeValidationRules.employeeId[0].message;
  } else if (!employeeValidationRules.employeeId[1].validator(employeeData.employeeId)) {
    errors.employeeId = employeeValidationRules.employeeId[1].message;
  }

  // Position validation
  if (!employeeValidationRules.position[0].validator(employeeData.position)) {
    errors.position = employeeValidationRules.position[0].message;
  }

  // Salary validation
  if (!employeeData.salary || !employeeValidationRules.basicSalary[0].validator(employeeData.salary.basic)) {
    errors['salary.basic'] = employeeValidationRules.basicSalary[0].message;
  } else if (!employeeValidationRules.basicSalary[1].validator(employeeData.salary.basic)) {
    errors['salary.basic'] = employeeValidationRules.basicSalary[1].message;
  }

  // Bank details validation
  if (!employeeData.bankDetails) {
    errors.bankDetails = 'Bank details are required';
  } else {
    // Bank name validation
    if (!employeeValidationRules.bankName[0].validator(employeeData.bankDetails.bankName)) {
      errors['bankDetails.bankName'] = employeeValidationRules.bankName[0].message;
    }

    // Account number validation
    if (!employeeValidationRules.accountNumber[0].validator(employeeData.bankDetails.accountNumber)) {
      errors['bankDetails.accountNumber'] = employeeValidationRules.accountNumber[0].message;
    } else if (!employeeValidationRules.accountNumber[1].validator(employeeData.bankDetails.accountNumber)) {
      errors['bankDetails.accountNumber'] = employeeValidationRules.accountNumber[1].message;
    }
  }

  // Optional: Validate allowances
  if (employeeData.salary && employeeData.salary.allowances) {
    employeeData.salary.allowances.forEach((allowance, index) => {
      if (!allowance.type || !allowance.type.trim()) {
        errors[`salary.allowances[${index}].type`] = `Allowance type is required for row ${index + 1}`;
      }
      if (!allowance.amount || isNaN(Number(allowance.amount)) || Number(allowance.amount) <= 0) {
        errors[`salary.allowances[${index}].amount`] = `Allowance amount must be a positive number for row ${index + 1}`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates a single field in the employee form
 * @param {string} fieldName - Name of the field to validate
 * @param {any} value - Value of the field
 * @param {Object} formData - Entire form data for context
 * @returns {string|null} Error message or null if valid
 */
export const validateEmployeeField = (fieldName, value, formData) => {
  switch (fieldName) {
    case 'employeeId':
      if (!value) return 'Employee ID is required';
      if (!/^EMP-\d{4,6}$/.test(value)) return 'Employee ID must be in format EMP-XXXX';
      return null;

    case 'personalInfo.name':
      if (!value) return 'Name is required';
      if (value.length < 3) return 'Name must be at least 3 characters';
      return null;

    case 'personalInfo.email':
      if (!value) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
      return null;

    case 'personalInfo.contact':
      if (!value) return 'Contact number is required';
      if (!/^[+]?[(]?\d{3}[)]?[-\s.]?\d{3}[-\s.]?\d{4,6}$/.test(value)) 
        return 'Please enter a valid phone number';
      return null;

    case 'position':
      if (!value) return 'Position is required';
      return null;

    case 'salary.basic':
      if (!value) return 'Basic salary is required';
      if (isNaN(Number(value)) || Number(value) <= 0) return 'Basic salary must be a positive number';
      return null;

    case 'bankDetails.bankName':
      if (!value) return 'Bank name is required';
      return null;

    case 'bankDetails.accountNumber':
      if (!value) return 'Account number is required';
      if (!/^\d{8,20}$/.test(value.replace(/\s/g, ''))) 
        return 'Account number must be 8-20 digits';
      return null;

    default:
      return null;
  }
};

// Helper function to generate a unique employee ID
export const generateEmployeeId = () => {
  const prefix = 'EMP';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
};

export default {
  validateEmployeeForm,
  validateEmployeeField,
  generateEmployeeId
};