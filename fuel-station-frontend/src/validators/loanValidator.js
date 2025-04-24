import validation from '../utils/validation';

export const validateLoanForm = (loanData) => {
  const validationRules = {
    amount: [
      { validator: validation.isNotEmpty, message: 'Loan amount is required' },
      { validator: validation.isPositiveNumber, message: 'Loan amount must be a positive number' },
      { validator: (val) => val >= 1000, message: 'Minimum loan amount is 1000' }
    ],
    purpose: [
      { validator: validation.isNotEmpty, message: 'Loan purpose is required' },
      { validator: (val) => val.length >= 5, message: 'Purpose must be at least 5 characters long' }
    ],
    durationMonths: [
      { validator: validation.isNotEmpty, message: 'Loan duration is required' },
      { validator: validation.isPositiveNumber, message: 'Duration must be a positive number' },
      { validator: (val) => val >= 3 && val <= 36, message: 'Duration must be between 3 and 36 months' }
    ]
  };

  return validation.validateForm(loanData, validationRules);
};

export const validateLoanField = (fieldName, value, formData) => {
  switch (fieldName) {
    case 'amount':
      if (!validation.isNotEmpty(value)) return 'Loan amount is required';
      if (!validation.isPositiveNumber(value)) return 'Loan amount must be a positive number';
      return value >= 1000 ? null : 'Minimum loan amount is 1000';
    
    case 'purpose':
      if (!validation.isNotEmpty(value)) return 'Loan purpose is required';
      return value.length >= 5 ? null : 'Purpose must be at least 5 characters long';
    
    case 'durationMonths':
      if (!validation.isNotEmpty(value)) return 'Loan duration is required';
      if (!validation.isPositiveNumber(value)) return 'Duration must be a positive number';
      return (value >= 3 && value <= 36) ? null : 'Duration must be between 3 and 36 months';
    
    default:
      return null;
  }
};

export default {
  validateLoanForm,
  validateLoanField
};