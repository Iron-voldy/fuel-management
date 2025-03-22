// src/validators/expenseValidator.js
import validation from '../utils/validation';

/**
 * Validates an expense form data object
 * @param {Object} expenseData - The expense data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateExpenseForm = (expenseData) => {
  const validationRules = {
    // Basic expense information
    category: [
      { validator: validation.isNotEmpty, message: 'Category is required' }
    ],
    description: [
      { validator: validation.isNotEmpty, message: 'Description is required' },
      { validator: (val) => validation.hasMinLength(val, 3), message: 'Description must be at least 3 characters' }
    ],
    amount: [
      { validator: validation.isNotEmpty, message: 'Amount is required' },
      { validator: validation.isPositiveNumber, message: 'Amount must be a positive number' }
    ],
    paymentMethod: [
      { validator: validation.isNotEmpty, message: 'Payment method is required' }
    ],
    date: [
      { validator: validation.isNotEmpty, message: 'Date is required' },
      { validator: validation.isNotFutureDate, message: 'Date cannot be in the future' }
    ],
    stationId: [
      { validator: validation.isNotEmpty, message: 'Station ID is required' }
    ]
  };

  // Add validation for specific payment methods
  if (expenseData.paymentMethod === 'Bank Transfer') {
    validationRules.bankAccountId = [
      { validator: validation.isNotEmpty, message: 'Bank account is required for bank transfers' }
    ];
    
    validationRules.transactionReference = [
      { validator: validation.isNotEmpty, message: 'Transaction reference is required for bank transfers' }
    ];
  }

  if (expenseData.paymentMethod === 'Check') {
    validationRules.checkNumber = [
      { validator: validation.isNotEmpty, message: 'Check number is required' }
    ];
    
    validationRules.bankAccountId = [
      { validator: validation.isNotEmpty, message: 'Bank account is required for check payments' }
    ];
  }

  // Add validation for specific expense categories
  if (expenseData.category === 'Fuel Purchase') {
    validationRules.fuelType = [
      { validator: validation.isNotEmpty, message: 'Fuel type is required for fuel purchases' }
    ];
    
    validationRules.quantity = [
      { validator: validation.isNotEmpty, message: 'Quantity is required for fuel purchases' },
      { validator: validation.isPositiveNumber, message: 'Quantity must be a positive number' }
    ];
    
    validationRules.unitPrice = [
      { validator: validation.isNotEmpty, message: 'Unit price is required for fuel purchases' },
      { validator: validation.isPositiveNumber, message: 'Unit price must be a positive number' }
    ];
    
    // Validate total amount calculation
    const calculatedTotal = parseFloat(expenseData.quantity || 0) * parseFloat(expenseData.unitPrice || 0);
    const providedAmount = parseFloat(expenseData.amount || 0);
    
    // Allow small difference due to floating point calculation
    const isAmountCorrect = Math.abs(calculatedTotal - providedAmount) < 0.01;
    
    if (!isAmountCorrect) {
      validationRules.amount.push({
        validator: () => isAmountCorrect,
        message: `Amount should equal quantity × unit price (${calculatedTotal.toFixed(2)})`
      });
    }
  }

  if (expenseData.category === 'Salaries' || expenseData.category === 'Wages') {
    validationRules.employeeId = [
      { validator: validation.isNotEmpty, message: 'Employee is required for salary/wage expenses' }
    ];
    
    validationRules.period = [
      { validator: validation.isNotEmpty, message: 'Period is required for salary/wage expenses' }
    ];
  }

  if (expenseData.category === 'Utilities') {
    validationRules.utilityType = [
      { validator: validation.isNotEmpty, message: 'Utility type is required' }
    ];
    
    validationRules.billNumber = [
      { validator: validation.isNotEmpty, message: 'Bill number is required for utility expenses' }
    ];
    
    validationRules.billPeriod = [
      { validator: validation.isNotEmpty, message: 'Billing period is required for utility expenses' }
    ];
  }

  if (expenseData.category === 'Rent') {
    validationRules.period = [
      { validator: validation.isNotEmpty, message: 'Rental period is required' }
    ];
    
    validationRules.propertyDetails = [
      { validator: validation.isNotEmpty, message: 'Property details are required for rent expenses' }
    ];
  }

  // Validation for approval-related fields (if expense is being approved/rejected)
  if (expenseData.status === 'Rejected' && expenseData.isApprovalAction) {
    validationRules.rejectionReason = [
      { validator: validation.isNotEmpty, message: 'Rejection reason is required' }
    ];
  }

  // Validation for attachments if required by company policy
  if (expenseData.amount > 10000 && !expenseData.hasAttachments) { // Example threshold
    validationRules.attachments = [
      { validator: () => expenseData.hasAttachments, message: 'Supporting documents are required for expenses over LKR 10,000' }
    ];
  }

  return validation.validateForm(expenseData, validationRules);
};

/**
 * Validates a single expense field
 * @param {string} fieldName - The name of the field to validate
 * @param {any} value - The value of the field
 * @param {Object} formData - The complete form data object (for contextual validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateExpenseField = (fieldName, value, formData) => {
  switch (fieldName) {
    case 'category':
      return validation.isNotEmpty(value) ? null : 'Category is required';
      
    case 'description':
      if (!validation.isNotEmpty(value)) return 'Description is required';
      return validation.hasMinLength(value, 3) ? null : 'Description must be at least 3 characters';
      
    case 'amount':
      if (!validation.isNotEmpty(value)) return 'Amount is required';
      if (!validation.isPositiveNumber(value)) return 'Amount must be a positive number';
      
      // Validate amount calculation for fuel purchases
      if (formData.category === 'Fuel Purchase' && formData.quantity && formData.unitPrice) {
        const calculatedTotal = parseFloat(formData.quantity) * parseFloat(formData.unitPrice);
        const providedAmount = parseFloat(value);
        
        // Allow small difference due to floating point calculation
        const isAmountCorrect = Math.abs(calculatedTotal - providedAmount) < 0.01;
        
        if (!isAmountCorrect) {
          return `Amount should equal quantity × unit price (${calculatedTotal.toFixed(2)})`;
        }
      }
      
      return null;
      
    case 'paymentMethod':
      return validation.isNotEmpty(value) ? null : 'Payment method is required';
      
    case 'date':
      if (!validation.isNotEmpty(value)) return 'Date is required';
      return validation.isNotFutureDate(value) ? null : 'Date cannot be in the future';
      
    case 'stationId':
      return validation.isNotEmpty(value) ? null : 'Station ID is required';
      
    // Bank transfer specific fields
    case 'bankAccountId':
      if (formData.paymentMethod === 'Bank Transfer' || formData.paymentMethod === 'Check') {
        return validation.isNotEmpty(value) ? null : 'Bank account is required';
      }
      return null;
      
    case 'transactionReference':
      if (formData.paymentMethod === 'Bank Transfer') {
        return validation.isNotEmpty(value) ? null : 'Transaction reference is required';
      }
      return null;
      
    case 'checkNumber':
      if (formData.paymentMethod === 'Check') {
        return validation.isNotEmpty(value) ? null : 'Check number is required';
      }
      return null;
      
    // Fuel purchase specific fields
    case 'fuelType':
      if (formData.category === 'Fuel Purchase') {
        return validation.isNotEmpty(value) ? null : 'Fuel type is required';
      }
      return null;
      
    case 'quantity':
      if (formData.category === 'Fuel Purchase') {
        if (!validation.isNotEmpty(value)) return 'Quantity is required';
        return validation.isPositiveNumber(value) ? null : 'Quantity must be a positive number';
      }
      return null;
      
    case 'unitPrice':
      if (formData.category === 'Fuel Purchase') {
        if (!validation.isNotEmpty(value)) return 'Unit price is required';
        return validation.isPositiveNumber(value) ? null : 'Unit price must be a positive number';
      }
      return null;
      
    // Salary/wage specific fields
    case 'employeeId':
      if (formData.category === 'Salaries' || formData.category === 'Wages') {
        return validation.isNotEmpty(value) ? null : 'Employee is required';
      }
      return null;
      
    case 'period':
      if (formData.category === 'Salaries' || formData.category === 'Wages' || formData.category === 'Rent') {
        return validation.isNotEmpty(value) ? null : 'Period is required';
      }
      return null;
      
    // Utility specific fields
    case 'utilityType':
      if (formData.category === 'Utilities') {
        return validation.isNotEmpty(value) ? null : 'Utility type is required';
      }
      return null;
      
    case 'billNumber':
      if (formData.category === 'Utilities') {
        return validation.isNotEmpty(value) ? null : 'Bill number is required';
      }
      return null;
      
    case 'billPeriod':
      if (formData.category === 'Utilities') {
        return validation.isNotEmpty(value) ? null : 'Billing period is required';
      }
      return null;
      
    // Rent specific fields
    case 'propertyDetails':
      if (formData.category === 'Rent') {
        return validation.isNotEmpty(value) ? null : 'Property details are required';
      }
      return null;
      
    // Approval related fields
    case 'rejectionReason':
      if (formData.status === 'Rejected' && formData.isApprovalAction) {
        return validation.isNotEmpty(value) ? null : 'Rejection reason is required';
      }
      return null;
      
    // Attachments validation
    case 'attachments':
      if (formData.amount > 10000) { // Example threshold
        return formData.hasAttachments ? null : 'Supporting documents are required for expenses over LKR 10,000';
      }
      return null;
      
    default:
      return null;
  }
};

/**
 * Calculates and validates the expense amount based on quantity and unit price
 * @param {number} quantity - The quantity 
 * @param {number} unitPrice - The price per unit
 * @param {number} currentAmount - The current amount (optional)
 * @returns {Object} - Object with calculated amount and validation result
 */
export const calculateAndValidateAmount = (quantity, unitPrice, currentAmount = null) => {
  // Return early if either quantity or unit price is missing
  if (!quantity || !unitPrice) {
    return {
      calculatedAmount: currentAmount || 0,
      isValid: false,
      message: 'Both quantity and unit price are required to calculate amount'
    };
  }
  
  const parsedQuantity = parseFloat(quantity);
  const parsedUnitPrice = parseFloat(unitPrice);
  
  // Validate inputs are numbers
  if (isNaN(parsedQuantity) || isNaN(parsedUnitPrice)) {
    return {
      calculatedAmount: currentAmount || 0,
      isValid: false,
      message: 'Both quantity and unit price must be valid numbers'
    };
  }
  
  // Calculate the amount
  const calculatedAmount = parsedQuantity * parsedUnitPrice;
  
  // Check if the current amount matches the calculated amount (if provided)
  const isMatch = currentAmount === null || 
    Math.abs(parseFloat(currentAmount) - calculatedAmount) < 0.01;
  
  return {
    calculatedAmount: calculatedAmount.toFixed(2),
    isValid: isMatch,
    message: isMatch ? null : `Amount should equal quantity × unit price (${calculatedAmount.toFixed(2)})`
  };
};

export default {
  validateExpenseForm,
  validateExpenseField,
  calculateAndValidateAmount
};