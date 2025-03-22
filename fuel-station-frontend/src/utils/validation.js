// src/utils/validation.js
/**
 * A collection of validation utilities for form validation across the application
 */

// Email validation using regex
export const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };
  
  // Phone number validation - supports multiple formats
  export const isValidPhone = (phone) => {
    // Allow various formats: XXX-XXX-XXXX, (XXX) XXX-XXXX, XXXXXXXXXX, XXX.XXX.XXXX, etc.
    const phoneRegex = /^(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?$/;
    return phoneRegex.test(phone);
  };
  
  // Validate numeric values
  export const isValidNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  };
  
  // Validate positive numbers (greater than 0)
  export const isPositiveNumber = (value) => {
    return isValidNumber(value) && parseFloat(value) > 0;
  };
  
  // Validate non-negative numbers (0 or greater)
  export const isNonNegativeNumber = (value) => {
    return isValidNumber(value) && parseFloat(value) >= 0;
  };
  
  // Validate required field has a value
  export const isNotEmpty = (value) => {
    if (value === null || value === undefined) return false;
    return value.toString().trim() !== '';
  };
  
  // Validate minimum string length
  export const hasMinLength = (value, minLength) => {
    return value && value.length >= minLength;
  };
  
  // Validate maximum string length
  export const hasMaxLength = (value, maxLength) => {
    return value && value.length <= maxLength;
  };
  
  // Validate string length is within range
  export const isLengthInRange = (value, minLength, maxLength) => {
    return hasMinLength(value, minLength) && hasMaxLength(value, maxLength);
  };
  
  // Validate password strength
  export const isStrongPassword = (password) => {
    // At least 8 characters, including one uppercase, one lowercase, one number, and one special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return strongPasswordRegex.test(password);
  };
  
  // Validate if two values match (e.g., password and confirm password)
  export const doValuesMatch = (value1, value2) => {
    return value1 === value2;
  };
  
  // Validate that a date is not in the future
  export const isNotFutureDate = (dateString) => {
    const inputDate = new Date(dateString);
    const today = new Date();
    return inputDate <= today;
  };
  
  // Validate that a date is not in the past
  export const isNotPastDate = (dateString) => {
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset hours to compare dates only
    return inputDate >= today;
  };
  
  // Validate URL format
  export const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  // Validate sri lankan vehicle number format
  export const isValidVehicleNumber = (number) => {
    // Regex for formats like ABC-1234, AB-1234, 123-1234, etc.
    const vehicleRegex = /^[A-Z0-9]{2,3}[-][0-9]{4}$/i;
    return vehicleRegex.test(number);
  };
  
  // Validate sri lankan NIC number
  export const isValidNIC = (nic) => {
    // Old format: 9 digits plus V/X OR new format: 12 digits
    const oldNICRegex = /^[0-9]{9}[vVxX]$/;
    const newNICRegex = /^[0-9]{12}$/;
    return oldNICRegex.test(nic) || newNICRegex.test(nic);
  };
  
  // Form field validation with custom message
  export const validateField = (value, validations) => {
    for (const validation of validations) {
      const { isValid, message } = validation;
      if (!isValid(value)) {
        return message;
      }
    }
    return null; // No errors
  };
  
  // Comprehensive form validation
  export const validateForm = (formData, validationRules) => {
    const errors = {};
    let isValid = true;
  
    Object.keys(validationRules).forEach(field => {
      const value = formData[field];
      const fieldRules = validationRules[field];
  
      for (const rule of fieldRules) {
        // Handle nested fields (e.g., contactInfo.email)
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          const nestedValue = formData[parent]?.[child];
          
          if (!rule.validator(nestedValue)) {
            if (!errors[parent]) errors[parent] = {};
            errors[parent][child] = rule.message;
            isValid = false;
            break;
          }
        } 
        // Handle regular fields
        else if (!rule.validator(value)) {
          errors[field] = rule.message;
          isValid = false;
          break;
        }
      }
    });
  
    return { isValid, errors };
  };
  
  export default {
    isValidEmail,
    isValidPhone,
    isValidNumber,
    isPositiveNumber,
    isNonNegativeNumber,
    isNotEmpty,
    hasMinLength,
    hasMaxLength,
    isLengthInRange,
    isStrongPassword,
    doValuesMatch,
    isNotFutureDate,
    isNotPastDate,
    isValidUrl,
    isValidVehicleNumber,
    isValidNIC,
    validateField,
    validateForm
  };