// src/validators/salesValidator.js
import validation from '../utils/validation';

/**
 * Validates a sales form data object
 * @param {Object} salesData - The sales data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateSalesForm = (salesData) => {
  const validationRules = {
    // Basic sale information
    fuelType: [
      { validator: validation.isNotEmpty, message: 'Fuel type is required' }
    ],
    quantity: [
      { validator: validation.isNotEmpty, message: 'Quantity is required' },
      { validator: validation.isPositiveNumber, message: 'Quantity must be a positive number' }
    ],
    unitPrice: [
      { validator: validation.isNotEmpty, message: 'Unit price is required' },
      { validator: validation.isPositiveNumber, message: 'Unit price must be a positive number' }
    ],
    totalAmount: [
      { validator: validation.isNotEmpty, message: 'Total amount is required' },
      { validator: validation.isPositiveNumber, message: 'Total amount must be a positive number' }
    ],
    paymentMethod: [
      { validator: validation.isNotEmpty, message: 'Payment method is required' }
    ],
    date: [
      { validator: validation.isNotEmpty, message: 'Date is required' }
    ],
    stationId: [
      { validator: validation.isNotEmpty, message: 'Station ID is required' }
    ]
  };

  // Add validation for credit sales
  if (salesData.paymentMethod === 'Credit') {
    validationRules.customerId = [
      { validator: validation.isNotEmpty, message: 'Customer is required for credit sales' }
    ];
    
    // For credit sales, validate the credit limit if it's a new customer transaction
    if (salesData.customerId && salesData.isNewCustomerTransaction) {
      validationRules.creditLimit = [
        { validator: validation.isPositiveNumber, message: 'Credit limit must be a positive number' },
        { 
          validator: (val) => {
            // Check if total amount is within the remaining credit limit
            const remainingCredit = parseFloat(val) - parseFloat(salesData.outstandingBalance || 0);
            return parseFloat(salesData.totalAmount) <= remainingCredit;
          }, 
          message: 'Transaction exceeds available credit limit' 
        }
      ];
    }
  }

  // Add validation for vehicle number if provided
  if (salesData.vehicleNumber) {
    validationRules.vehicleNumber = [
      { validator: validation.isValidVehicleNumber, message: 'Please enter a valid vehicle number (e.g. ABC-1234)' }
    ];
  }

  // Validate correct calculation of total amount
  const calculatedTotal = parseFloat(salesData.quantity || 0) * parseFloat(salesData.unitPrice || 0);
  const providedTotal = parseFloat(salesData.totalAmount || 0);
  
  // Allow small difference due to floating point calculation
  const isAmountCorrect = Math.abs(calculatedTotal - providedTotal) < 0.01;
  
  if (!isAmountCorrect) {
    // Add validation error for totalAmount field
    if (!validationRules.totalAmount) {
      validationRules.totalAmount = [];
    }
    
    validationRules.totalAmount.push({
      validator: () => isAmountCorrect,
      message: `Total amount should equal quantity × unit price (${calculatedTotal.toFixed(2)})`
    });
  }

  return validation.validateForm(salesData, validationRules);
};

/**
 * Validates a single sales field
 * @param {string} fieldName - The name of the field to validate
 * @param {any} value - The value of the field
 * @param {Object} formData - The complete form data object (for contextual validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateSalesField = (fieldName, value, formData) => {
  switch (fieldName) {
    case 'fuelType':
      return validation.isNotEmpty(value) ? null : 'Fuel type is required';
      
    case 'quantity':
      if (!validation.isNotEmpty(value)) return 'Quantity is required';
      return validation.isPositiveNumber(value) ? null : 'Quantity must be a positive number';
      
    case 'unitPrice':
      if (!validation.isNotEmpty(value)) return 'Unit price is required';
      return validation.isPositiveNumber(value) ? null : 'Unit price must be a positive number';
      
    case 'totalAmount':
      if (!validation.isNotEmpty(value)) return 'Total amount is required';
      if (!validation.isPositiveNumber(value)) return 'Total amount must be a positive number';
      
      // Validate total amount calculation if all required fields are present
      if (formData.quantity && formData.unitPrice && value) {
        const calculatedTotal = parseFloat(formData.quantity) * parseFloat(formData.unitPrice);
        const providedTotal = parseFloat(value);
        
        // Allow small difference due to floating point calculation
        const isAmountCorrect = Math.abs(calculatedTotal - providedTotal) < 0.01;
        
        if (!isAmountCorrect) {
          return `Total amount should equal quantity × unit price (${calculatedTotal.toFixed(2)})`;
        }
      }
      
      return null;
      
    case 'paymentMethod':
      return validation.isNotEmpty(value) ? null : 'Payment method is required';
      
    case 'date':
      return validation.isNotEmpty(value) ? null : 'Date is required';
      
    case 'stationId':
      return validation.isNotEmpty(value) ? null : 'Station ID is required';
      
    case 'customerId':
      if (formData.paymentMethod === 'Credit') {
        return validation.isNotEmpty(value) ? null : 'Customer is required for credit sales';
      }
      return null;
      
    case 'vehicleNumber':
      if (!value) return null; // Optional field
      return validation.isValidVehicleNumber(value) ? null : 'Please enter a valid vehicle number (e.g. ABC-1234)';
      
    case 'creditLimit':
      if (formData.paymentMethod !== 'Credit' || !formData.isNewCustomerTransaction) return null;
      
      if (!validation.isPositiveNumber(value)) {
        return 'Credit limit must be a positive number';
      }
      
      // Check if total amount is within the remaining credit limit
      const remainingCredit = parseFloat(value) - parseFloat(formData.outstandingBalance || 0);
      return parseFloat(formData.totalAmount) <= remainingCredit ? 
        null : 'Transaction exceeds available credit limit';
      
    default:
      return null;
  }
};

/**
 * Calculates and validates the total amount based on quantity and unit price
 * @param {number} quantity - The quantity of fuel
 * @param {number} unitPrice - The price per unit
 * @param {number} currentTotal - The current total amount (optional)
 * @returns {Object} - Object with calculated total and validation result
 */
export const calculateAndValidateTotal = (quantity, unitPrice, currentTotal = null) => {
  // Return early if either quantity or unit price is missing
  if (!quantity || !unitPrice) {
    return {
      calculatedTotal: currentTotal || 0,
      isValid: false,
      message: 'Both quantity and unit price are required to calculate total'
    };
  }
  
  const parsedQuantity = parseFloat(quantity);
  const parsedUnitPrice = parseFloat(unitPrice);
  
  // Validate inputs are numbers
  if (isNaN(parsedQuantity) || isNaN(parsedUnitPrice)) {
    return {
      calculatedTotal: currentTotal || 0,
      isValid: false,
      message: 'Both quantity and unit price must be valid numbers'
    };
  }
  
  // Calculate the total
  const calculatedTotal = parsedQuantity * parsedUnitPrice;
  
  // Check if the current total matches the calculated total (if provided)
  const isMatch = currentTotal === null || 
    Math.abs(parseFloat(currentTotal) - calculatedTotal) < 0.01;
  
  return {
    calculatedTotal: calculatedTotal.toFixed(2),
    isValid: isMatch,
    message: isMatch ? null : `Total amount should equal quantity × unit price (${calculatedTotal.toFixed(2)})`
  };
};

export default {
  validateSalesForm,
  validateSalesField,
  calculateAndValidateTotal
};