// src/validators/stationValidator.js
import validation from '../utils/validation';

/**
 * Validates a fuel station form data object
 * @param {Object} stationData - The station data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateStationForm = (stationData) => {
  const validationRules = {
    // Basic station information
    name: [
      { validator: validation.isNotEmpty, message: 'Station name is required' },
      { validator: (val) => validation.hasMinLength(val, 3), message: 'Name must be at least 3 characters' }
    ],
    stationId: [
      { validator: validation.isNotEmpty, message: 'Station ID is required' },
      { validator: (val) => validation.hasMinLength(val, 2), message: 'Station ID must be at least 2 characters' }
    ],
    registrationNumber: [
      { validator: validation.isNotEmpty, message: 'Registration number is required' }
    ],
    type: [
      { validator: validation.isNotEmpty, message: 'Station type is required' }
    ],
    status: [
      { validator: validation.isNotEmpty, message: 'Status is required' }
    ],
    
    // Location information
    'location.address': [
      { validator: validation.isNotEmpty, message: 'Address is required' }
    ],
    'location.city': [
      { validator: validation.isNotEmpty, message: 'City is required' }
    ],
    'location.province': [
      { validator: validation.isNotEmpty, message: 'Province is required' }
    ],
    'location.postalCode': [
      { validator: validation.isNotEmpty, message: 'Postal code is required' }
    ],
    
    // Contact information
    'contactInfo.phoneNumber': [
      { validator: validation.isNotEmpty, message: 'Phone number is required' },
      { validator: validation.isValidPhone, message: 'Please enter a valid phone number' }
    ],
    'contactInfo.email': [
      { validator: validation.isNotEmpty, message: 'Email is required' },
      { validator: validation.isValidEmail, message: 'Please enter a valid email address' }
    ],
    
    // Manager information
    'manager.name': [
      { validator: validation.isNotEmpty, message: 'Manager name is required' }
    ],
    'manager.phoneNumber': [
      { validator: validation.isNotEmpty, message: 'Manager phone number is required' },
      { validator: validation.isValidPhone, message: 'Please enter a valid phone number' }
    ],
    'manager.email': [
      { validator: validation.isNotEmpty, message: 'Manager email is required' },
      { validator: validation.isValidEmail, message: 'Please enter a valid email address' }
    ],
    
    // Operating hours
    'operatingHours.openingTime': [
      { validator: validation.isNotEmpty, message: 'Opening time is required' }
    ],
    'operatingHours.closingTime': [
      { validator: validation.isNotEmpty, message: 'Closing time is required' }
    ],
    
    // Financial information
    'financialInfo.bankName': [
      { validator: validation.isNotEmpty, message: 'Bank name is required' }
    ],
    'financialInfo.accountNumber': [
      { validator: validation.isNotEmpty, message: 'Account number is required' }
    ],
    'financialInfo.taxId': [
      { validator: validation.isNotEmpty, message: 'Tax ID is required' }
    ]
  };

  // Add validation for fuel types if provided
  if (stationData.fuelTypes && stationData.fuelTypes.length > 0) {
    stationData.fuelTypes.forEach((fuelType, index) => {
      validationRules[`fuelTypes[${index}].type`] = [
        { validator: validation.isNotEmpty, message: 'Fuel type is required' }
      ];
      validationRules[`fuelTypes[${index}].capacity`] = [
        { validator: validation.isNotEmpty, message: 'Tank capacity is required' },
        { validator: validation.isPositiveNumber, message: 'Capacity must be a positive number' }
      ];
      validationRules[`fuelTypes[${index}].currentLevel`] = [
        { validator: validation.isNotEmpty, message: 'Current level is required' },
        { validator: validation.isNonNegativeNumber, message: 'Current level must be 0 or a positive number' },
        { 
          validator: (val) => stationData.fuelTypes[index].capacity ? 
            parseFloat(val) <= parseFloat(stationData.fuelTypes[index].capacity) : true, 
          message: 'Current level cannot exceed tank capacity' 
        }
      ];
    });
  }

  // Add validation for equipment if provided
  if (stationData.equipment && stationData.equipment.length > 0) {
    stationData.equipment.forEach((equipment, index) => {
      validationRules[`equipment[${index}].name`] = [
        { validator: validation.isNotEmpty, message: 'Equipment name is required' }
      ];
      validationRules[`equipment[${index}].model`] = [
        { validator: validation.isNotEmpty, message: 'Equipment model is required' }
      ];
      validationRules[`equipment[${index}].serialNumber`] = [
        { validator: validation.isNotEmpty, message: 'Serial number is required' }
      ];
      validationRules[`equipment[${index}].installationDate`] = [
        { validator: validation.isNotEmpty, message: 'Installation date is required' },
        { validator: validation.isNotFutureDate, message: 'Installation date cannot be in the future' }
      ];
    });
  }

  return validation.validateForm(stationData, validationRules);
};

/**
 * Validates a single station field
 * @param {string} fieldName - The name of the field to validate
 * @param {any} value - The value of the field
 * @param {Object} formData - The complete form data object (for contextual validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateStationField = (fieldName, value, formData) => {
  // Handle nested fields
  if (fieldName.includes('.')) {
    const [parent, child] = fieldName.split('.');
    
    // Handle array fields with indexes
    if (parent.includes('[') && parent.includes(']')) {
      const arrayMatch = parent.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        
        if (arrayName === 'fuelTypes') {
          switch (child) {
            case 'type':
              return validation.isNotEmpty(value) ? null : 'Fuel type is required';
            case 'capacity':
              if (!validation.isNotEmpty(value)) return 'Tank capacity is required';
              return validation.isPositiveNumber(value) ? null : 'Capacity must be a positive number';
            case 'currentLevel':
              if (!validation.isNotEmpty(value)) return 'Current level is required';
              if (!validation.isNonNegativeNumber(value)) return 'Current level must be 0 or a positive number';
              const capacity = formData.fuelTypes[index]?.capacity;
              return (capacity && parseFloat(value) <= parseFloat(capacity)) ? 
                null : 'Current level cannot exceed tank capacity';
            default:
              return null;
          }
        } else if (arrayName === 'equipment') {
          switch (child) {
            case 'name':
              return validation.isNotEmpty(value) ? null : 'Equipment name is required';
            case 'model':
              return validation.isNotEmpty(value) ? null : 'Equipment model is required';
            case 'serialNumber':
              return validation.isNotEmpty(value) ? null : 'Serial number is required';
            case 'installationDate':
              if (!validation.isNotEmpty(value)) return 'Installation date is required';
              return validation.isNotFutureDate(value) ? null : 'Installation date cannot be in the future';
            default:
              return null;
          }
        }
      }
    }
    
    // Regular nested fields
    switch (`${parent}.${child}`) {
      // Location fields
      case 'location.address':
        return validation.isNotEmpty(value) ? null : 'Address is required';
      case 'location.city':
        return validation.isNotEmpty(value) ? null : 'City is required';
      case 'location.province':
        return validation.isNotEmpty(value) ? null : 'Province is required';
      case 'location.postalCode':
        return validation.isNotEmpty(value) ? null : 'Postal code is required';
        
      // Contact fields
      case 'contactInfo.phoneNumber':
        if (!validation.isNotEmpty(value)) return 'Phone number is required';
        return validation.isValidPhone(value) ? null : 'Please enter a valid phone number';
      case 'contactInfo.email':
        if (!validation.isNotEmpty(value)) return 'Email is required';
        return validation.isValidEmail(value) ? null : 'Please enter a valid email address';
        
      // Manager fields
      case 'manager.name':
        return validation.isNotEmpty(value) ? null : 'Manager name is required';
      case 'manager.phoneNumber':
        if (!validation.isNotEmpty(value)) return 'Manager phone number is required';
        return validation.isValidPhone(value) ? null : 'Please enter a valid phone number';
      case 'manager.email':
        if (!validation.isNotEmpty(value)) return 'Manager email is required';
        return validation.isValidEmail(value) ? null : 'Please enter a valid email address';
        
      // Operating hours
      case 'operatingHours.openingTime':
        return validation.isNotEmpty(value) ? null : 'Opening time is required';
      case 'operatingHours.closingTime':
        return validation.isNotEmpty(value) ? null : 'Closing time is required';
        
      // Financial information
      case 'financialInfo.bankName':
        return validation.isNotEmpty(value) ? null : 'Bank name is required';
      case 'financialInfo.accountNumber':
        return validation.isNotEmpty(value) ? null : 'Account number is required';
      case 'financialInfo.taxId':
        return validation.isNotEmpty(value) ? null : 'Tax ID is required';
        
      default:
        return null;
    }
  }

  // Regular fields
  switch (fieldName) {
    case 'name':
      if (!validation.isNotEmpty(value)) return 'Station name is required';
      return validation.hasMinLength(value, 3) ? null : 'Name must be at least 3 characters';
    case 'stationId':
      if (!validation.isNotEmpty(value)) return 'Station ID is required';
      return validation.hasMinLength(value, 2) ? null : 'Station ID must be at least 2 characters';
    case 'registrationNumber':
      return validation.isNotEmpty(value) ? null : 'Registration number is required';
    case 'type':
      return validation.isNotEmpty(value) ? null : 'Station type is required';
    case 'status':
      return validation.isNotEmpty(value) ? null : 'Status is required';
    default:
      return null;
  }
};

export default {
  validateStationForm,
  validateStationField
};