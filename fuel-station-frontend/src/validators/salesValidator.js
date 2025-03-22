// src/validators/salesValidator.js
import validation from '../utils/validation';

/**
 * Validates a sales form data object
 * @param {Object} salesData - The sales data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateSalesForm = (salesData) => {
  const errors = {};
  let isValid = true;
  
  // Validate fuel type
  if (!salesData.fuelType) {
    errors.fuelType = 'Fuel type is required';
    isValid = false;
  }
  
  // Validate quantity
  if (!salesData.quantity) {
    errors.quantity = 'Quantity is required';
    isValid = false;
  } else if (isNaN(parseFloat(salesData.quantity)) || parseFloat(salesData.quantity) <= 0) {
    errors.quantity = 'Quantity must be a positive number';
    isValid = false;
  }
  
  // Validate unit price
  if (!salesData.unitPrice) {
    errors.unitPrice = 'Unit price is required';
    isValid = false;
  } else if (isNaN(parseFloat(salesData.unitPrice)) || parseFloat(salesData.unitPrice) <= 0) {
    errors.unitPrice = 'Unit price must be a positive number';
    isValid = false;
  }
  
  // Validate total amount
  if (!salesData.totalAmount) {
    errors.totalAmount = 'Total amount is required';
    isValid = false;
  } else if (isNaN(parseFloat(salesData.totalAmount)) || parseFloat(salesData.totalAmount) <= 0) {
    errors.totalAmount = 'Total amount must be a positive number';
    isValid = false;
  } else {
    // Validate correct calculation of total amount
    const calculatedTotal = parseFloat(salesData.quantity || 0) * parseFloat(salesData.unitPrice || 0);
    const providedTotal = parseFloat(salesData.totalAmount || 0);
    
    // Allow small difference due to floating point calculation
    const isAmountCorrect = Math.abs(calculatedTotal - providedTotal) < 0.01;
    
    if (!isAmountCorrect) {
      errors.totalAmount = `Total amount should equal quantity × unit price (${calculatedTotal.toFixed(2)})`;
      isValid = false;
    }
  }
  
  // Validate payment method
  if (!salesData.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
    isValid = false;
  }
  
  // Validate customer for credit payments
  if (salesData.paymentMethod === 'Credit' && !salesData.customerId) {
    errors.customerId = 'Customer is required for credit sales';
    isValid = false;
  }
  
  // Validate vehicle number if provided
  if (salesData.vehicleNumber && !validation.isValidVehicleNumber(salesData.vehicleNumber)) {
    errors.vehicleNumber = 'Please enter a valid vehicle number (e.g. ABC-1234)';
    isValid = false;
  }
  
  // Validate date
  if (!salesData.date) {
    errors.date = 'Date and time are required';
    isValid = false;
  }
  
  // Validate station
  if (!salesData.stationId) {
    errors.stationId = 'Station is required';
    isValid = false;
  }
  
  return { isValid, errors };
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
      return value ? null : 'Fuel type is required';
      
    case 'quantity':
      if (!value) return 'Quantity is required';
      return (isNaN(parseFloat(value)) || parseFloat(value) <= 0) ? 
        'Quantity must be a positive number' : null;
      
    case 'unitPrice':
      if (!value) return 'Unit price is required';
      return (isNaN(parseFloat(value)) || parseFloat(value) <= 0) ? 
        'Unit price must be a positive number' : null;
      
    case 'totalAmount':
      if (!value) return 'Total amount is required';
      if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) return 'Total amount must be a positive number';
      
      // If we have quantity and unit price, validate the calculation
      if (formData.quantity && formData.unitPrice) {
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
      return value ? null : 'Payment method is required';
      
    case 'customerId':
      if (formData.paymentMethod === 'Credit' && !value) {
        return 'Customer is required for credit sales';
      }
      return null;
      
    case 'vehicleNumber':
      if (!value) return null; // Optional field
      return validation.isValidVehicleNumber(value) ? 
        null : 'Please enter a valid vehicle number (e.g. ABC-1234)';
      
    case 'date':
      return value ? null : 'Date and time are required';
      
    case 'stationId':
      return value ? null : 'Station is required';
      
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