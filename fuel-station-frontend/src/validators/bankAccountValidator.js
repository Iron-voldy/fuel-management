// src/validators/bankAccountValidator.js
import validation from '../utils/validation';

/**
 * Validates a bank account form data object
 * @param {Object} accountData - The bank account data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateBankAccountForm = (accountData) => {
  const validationRules = {
    accountName: [
      { validator: validation.isNotEmpty, message: 'Account name is required' },
      { validator: (val) => validation.hasMinLength(val, 3), message: 'Account name must be at least 3 characters' }
    ],
    accountNumber: [
      { validator: validation.isNotEmpty, message: 'Account number is required' },
      { validator: (val) => /^[0-9]{8,20}$/.test(val.replace(/\s/g, '')), message: 'Please enter a valid account number (8-20 digits)' }
    ],
    bankName: [
      { validator: validation.isNotEmpty, message: 'Bank name is required' }
    ],
    branchName: [
      { validator: validation.isNotEmpty, message: 'Branch name is required' }
    ],
    accountType: [
      { validator: validation.isNotEmpty, message: 'Account type is required' }
    ],
    openingBalance: [
      { validator: validation.isNotEmpty, message: 'Opening balance is required' },
      { validator: validation.isValidNumber, message: 'Opening balance must be a valid number' }
    ],
    currentBalance: [
      { validator: validation.isValidNumber, message: 'Current balance must be a valid number' }
    ],
    reorderLevel: [
      { validator: validation.isNonNegativeNumber, message: 'Reorder level must be 0 or a positive number' }
    ]
  };

  // Optional fields that require validation if present
  if (accountData.routingNumber) {
    validationRules.routingNumber = [
      { validator: (val) => /^[0-9]{9}$/.test(val.replace(/\s/g, '')), message: 'Routing number must be 9 digits' }
    ];
  }

  if (accountData.swiftCode) {
    validationRules.swiftCode = [
      { validator: (val) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(val), message: 'Please enter a valid SWIFT code' }
    ];
  }

  // For credit card accounts, validate additional fields
  if (accountData.accountType === 'Credit Card') {
    validationRules.creditLimit = [
      { validator: validation.isNotEmpty, message: 'Credit limit is required for credit card accounts' },
      { validator: validation.isPositiveNumber, message: 'Credit limit must be a positive number' }
    ];
    
    if (accountData.cardNumber) {
      validationRules.cardNumber = [
        { validator: (val) => /^[0-9]{13,19}$/.test(val.replace(/\s/g, '')), message: 'Please enter a valid card number' }
      ];
    }
    
    if (accountData.expiryDate) {
      validationRules.expiryDate = [
        { validator: validation.isNotEmpty, message: 'Expiry date is required' },
        { validator: validation.isNotPastDate, message: 'Expiry date must be in the future' }
      ];
    }
  }

  // For loan accounts, validate additional fields
  if (accountData.accountType === 'Loan') {
    validationRules.loanAmount = [
      { validator: validation.isNotEmpty, message: 'Loan amount is required' },
      { validator: validation.isPositiveNumber, message: 'Loan amount must be a positive number' }
    ];
    
    validationRules.interestRate = [
      { validator: validation.isNotEmpty, message: 'Interest rate is required' },
      { validator: validation.isPositiveNumber, message: 'Interest rate must be a positive number' }
    ];
    
    validationRules.loanTerm = [
      { validator: validation.isNotEmpty, message: 'Loan term is required' },
      { validator: validation.isPositiveNumber, message: 'Loan term must be a positive number' }
    ];
    
    validationRules.startDate = [
      { validator: validation.isNotEmpty, message: 'Start date is required' }
    ];
    
    validationRules.endDate = [
      { validator: validation.isNotEmpty, message: 'End date is required' },
      { 
        validator: (val) => new Date(val) > new Date(accountData.startDate), 
        message: 'End date must be after start date' 
      }
    ];
  }

  return validation.validateForm(accountData, validationRules);
};

/**
 * Validates a single bank account field
 * @param {string} fieldName - The name of the field to validate
 * @param {any} value - The value of the field
 * @param {Object} formData - The complete form data object (for contextual validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateBankAccountField = (fieldName, value, formData) => {
  switch (fieldName) {
    case 'accountName':
      if (!validation.isNotEmpty(value)) return 'Account name is required';
      return validation.hasMinLength(value, 3) ? null : 'Account name must be at least 3 characters';
      
    case 'accountNumber':
      if (!validation.isNotEmpty(value)) return 'Account number is required';
      return /^[0-9]{8,20}$/.test(value.replace(/\s/g, '')) ? null : 'Please enter a valid account number (8-20 digits)';
      
    case 'bankName':
      return validation.isNotEmpty(value) ? null : 'Bank name is required';
      
    case 'branchName':
      return validation.isNotEmpty(value) ? null : 'Branch name is required';
      
    case 'accountType':
      return validation.isNotEmpty(value) ? null : 'Account type is required';
      
    case 'openingBalance':
      if (!validation.isNotEmpty(value)) return 'Opening balance is required';
      return validation.isValidNumber(value) ? null : 'Opening balance must be a valid number';
      
    case 'currentBalance':
      return validation.isValidNumber(value) ? null : 'Current balance must be a valid number';
      
    case 'reorderLevel':
      return validation.isNonNegativeNumber(value) ? null : 'Reorder level must be 0 or a positive number';
      
    case 'routingNumber':
      if (!value) return null; // Optional field
      return /^[0-9]{9}$/.test(value.replace(/\s/g, '')) ? null : 'Routing number must be 9 digits';
      
    case 'swiftCode':
      if (!value) return null; // Optional field
      return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value) ? null : 'Please enter a valid SWIFT code';
      
    // Credit card specific fields
    case 'creditLimit':
      if (formData.accountType !== 'Credit Card') return null;
      if (!validation.isNotEmpty(value)) return 'Credit limit is required for credit card accounts';
      return validation.isPositiveNumber(value) ? null : 'Credit limit must be a positive number';
      
    case 'cardNumber':
      if (formData.accountType !== 'Credit Card' || !value) return null;
      return /^[0-9]{13,19}$/.test(value.replace(/\s/g, '')) ? null : 'Please enter a valid card number';
      
    case 'expiryDate':
      if (formData.accountType !== 'Credit Card') return null;
      if (!validation.isNotEmpty(value)) return 'Expiry date is required';
      return validation.isNotPastDate(value) ? null : 'Expiry date must be in the future';
      
    // Loan specific fields
    case 'loanAmount':
      if (formData.accountType !== 'Loan') return null;
      if (!validation.isNotEmpty(value)) return 'Loan amount is required';
      return validation.isPositiveNumber(value) ? null : 'Loan amount must be a positive number';
      
    case 'interestRate':
      if (formData.accountType !== 'Loan') return null;
      if (!validation.isNotEmpty(value)) return 'Interest rate is required';
      return validation.isPositiveNumber(value) ? null : 'Interest rate must be a positive number';
      
    case 'loanTerm':
      if (formData.accountType !== 'Loan') return null;
      if (!validation.isNotEmpty(value)) return 'Loan term is required';
      return validation.isPositiveNumber(value) ? null : 'Loan term must be a positive number';
      
    case 'startDate':
      if (formData.accountType !== 'Loan') return null;
      return validation.isNotEmpty(value) ? null : 'Start date is required';
      
    case 'endDate':
      if (formData.accountType !== 'Loan') return null;
      if (!validation.isNotEmpty(value)) return 'End date is required';
      return (new Date(value) > new Date(formData.startDate)) ? 
        null : 'End date must be after start date';
      
    default:
      return null;
  }
};

export default {
  validateBankAccountForm,
  validateBankAccountField
};