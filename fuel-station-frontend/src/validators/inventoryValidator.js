// src/validators/inventoryValidator.js
import validation from '../utils/validation';

/**
 * Validates a fuel inventory form data object
 * @param {Object} inventoryData - The inventory data to validate
 * @returns {Object} - Object with isValid flag and errors object
 */
export const validateInventoryForm = (inventoryData) => {
  const validationRules = {
    // Basic inventory information
    stationId: [
      { validator: validation.isNotEmpty, message: 'Station ID is required' }
    ],
    fuelType: [
      { validator: validation.isNotEmpty, message: 'Fuel type is required' }
    ],
    tankId: [
      { validator: validation.isNotEmpty, message: 'Tank ID is required' }
    ],
    tankCapacity: [
      { validator: validation.isNotEmpty, message: 'Tank capacity is required' },
      { validator: validation.isPositiveNumber, message: 'Tank capacity must be a positive number' }
    ],
    currentVolume: [
      { validator: validation.isNotEmpty, message: 'Current volume is required' },
      { validator: validation.isNonNegativeNumber, message: 'Current volume must be 0 or a positive number' },
      { 
        validator: (val) => inventoryData.tankCapacity ? 
          parseFloat(val) <= parseFloat(inventoryData.tankCapacity) : true, 
        message: 'Current volume cannot exceed tank capacity' 
      }
    ],
    
    // Financial information
    costPrice: [
      { validator: validation.isNotEmpty, message: 'Cost price is required' },
      { validator: validation.isPositiveNumber, message: 'Cost price must be a positive number' }
    ],
    sellingPrice: [
      { validator: validation.isNotEmpty, message: 'Selling price is required' },
      { validator: validation.isPositiveNumber, message: 'Selling price must be a positive number' }
    ],
    
    // Inventory management
    reorderLevel: [
      { validator: validation.isNotEmpty, message: 'Reorder level is required' },
      { validator: validation.isPositiveNumber, message: 'Reorder level must be a positive number' },
      { 
        validator: (val) => inventoryData.tankCapacity ? 
          parseFloat(val) <= parseFloat(inventoryData.tankCapacity) : true, 
        message: 'Reorder level cannot exceed tank capacity' 
      }
    ],
    status: [
      { validator: validation.isNotEmpty, message: 'Status is required' }
    ]
  };

  // Add validation for fuel additive if provided
  if (inventoryData.additives && inventoryData.additives.length > 0) {
    inventoryData.additives.forEach((additive, index) => {
      validationRules[`additives[${index}].name`] = [
        { validator: validation.isNotEmpty, message: 'Additive name is required' }
      ];
      validationRules[`additives[${index}].quantity`] = [
        { validator: validation.isNotEmpty, message: 'Additive quantity is required' },
        { validator: validation.isPositiveNumber, message: 'Quantity must be a positive number' }
      ];
      validationRules[`additives[${index}].unit`] = [
        { validator: validation.isNotEmpty, message: 'Unit is required' }
      ];
    });
  }

  // Add validation for stock movement if it's a stock addition or reduction form
  if (inventoryData.volume !== undefined) {
    validationRules.volume = [
      { validator: validation.isNotEmpty, message: 'Volume is required' },
      { validator: validation.isPositiveNumber, message: 'Volume must be a positive number' }
    ];
    
    // For stock reduction, ensure we don't reduce more than current volume
    if (inventoryData.operation === 'reduce') {
      validationRules.volume.push({
        validator: (val) => parseFloat(val) <= parseFloat(inventoryData.currentVolume || 0),
        message: 'Reduction volume cannot exceed current volume'
      });
    }
    
    // For stock addition, ensure we don't exceed tank capacity
    if (inventoryData.operation === 'add') {
      validationRules.volume.push({
        validator: (val) => {
          const newVolume = parseFloat(val) + parseFloat(inventoryData.currentVolume || 0);
          return newVolume <= parseFloat(inventoryData.tankCapacity || 0);
        },
        message: 'Addition would exceed tank capacity'
      });
    }
    
    if (inventoryData.operation === 'add') {
      validationRules.reference = [
        { validator: validation.isNotEmpty, message: 'Reference is required for stock addition' }
      ];
    }
    
    if (inventoryData.operation === 'reduce') {
      validationRules.reason = [
        { validator: validation.isNotEmpty, message: 'Reason is required for stock reduction' }
      ];
    }
  }

  // Add validation for price update
  if (inventoryData.newPrice !== undefined) {
    validationRules.newPrice = [
      { validator: validation.isNotEmpty, message: 'New price is required' },
      { validator: validation.isPositiveNumber, message: 'New price must be a positive number' }
    ];
    
    validationRules.reason = [
      { validator: validation.isNotEmpty, message: 'Reason for price change is required' }
    ];
  }

  return validation.validateForm(inventoryData, validationRules);
};

/**
 * Validates a single inventory field
 * @param {string} fieldName - The name of the field to validate
 * @param {any} value - The value of the field
 * @param {Object} formData - The complete form data object (for contextual validation)
 * @returns {string|null} - Error message or null if valid
 */
export const validateInventoryField = (fieldName, value, formData) => {
  // Handle nested fields
  if (fieldName.includes('.')) {
    const [parent, child] = fieldName.split('.');
    
    // Handle array fields with indexes
    if (parent.includes('[') && parent.includes(']')) {
      const arrayMatch = parent.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        
        if (arrayName === 'additives') {
          switch (child) {
            case 'name':
              return validation.isNotEmpty(value) ? null : 'Additive name is required';
            case 'quantity':
              if (!validation.isNotEmpty(value)) return 'Additive quantity is required';
              return validation.isPositiveNumber(value) ? null : 'Quantity must be a positive number';
            case 'unit':
              return validation.isNotEmpty(value) ? null : 'Unit is required';
            default:
              return null;
          }
        }
      }
    }
    
    return null; // No other nested fields to validate
  }

  // Regular fields
  switch (fieldName) {
    case 'stationId':
      return validation.isNotEmpty(value) ? null : 'Station ID is required';
      
    case 'fuelType':
      return validation.isNotEmpty(value) ? null : 'Fuel type is required';
      
    case 'tankId':
      return validation.isNotEmpty(value) ? null : 'Tank ID is required';
      
    case 'tankCapacity':
      if (!validation.isNotEmpty(value)) return 'Tank capacity is required';
      return validation.isPositiveNumber(value) ? null : 'Tank capacity must be a positive number';
      
    case 'currentVolume':
      if (!validation.isNotEmpty(value)) return 'Current volume is required';
      if (!validation.isNonNegativeNumber(value)) return 'Current volume must be 0 or a positive number';
      return (formData.tankCapacity && parseFloat(value) <= parseFloat(formData.tankCapacity)) ? 
        null : 'Current volume cannot exceed tank capacity';
      
    case 'costPrice':
      if (!validation.isNotEmpty(value)) return 'Cost price is required';
      return validation.isPositiveNumber(value) ? null : 'Cost price must be a positive number';
      
    case 'sellingPrice':
      if (!validation.isNotEmpty(value)) return 'Selling price is required';
      return validation.isPositiveNumber(value) ? null : 'Selling price must be a positive number';
      
    case 'reorderLevel':
      if (!validation.isNotEmpty(value)) return 'Reorder level is required';
      if (!validation.isPositiveNumber(value)) return 'Reorder level must be a positive number';
      return (formData.tankCapacity && parseFloat(value) <= parseFloat(formData.tankCapacity)) ? 
        null : 'Reorder level cannot exceed tank capacity';
      
    case 'status':
      return validation.isNotEmpty(value) ? null : 'Status is required';
      
    // Stock movement fields
    case 'volume':
      if (!validation.isNotEmpty(value)) return 'Volume is required';
      if (!validation.isPositiveNumber(value)) return 'Volume must be a positive number';
      
      if (formData.operation === 'reduce') {
        return (parseFloat(value) <= parseFloat(formData.currentVolume || 0)) ?
          null : 'Reduction volume cannot exceed current volume';
      }
      
      if (formData.operation === 'add') {
        const newVolume = parseFloat(value) + parseFloat(formData.currentVolume || 0);
        return (newVolume <= parseFloat(formData.tankCapacity || 0)) ?
          null : 'Addition would exceed tank capacity';
      }
      
      return null;
      
    case 'reference':
      if (formData.operation === 'add') {
        return validation.isNotEmpty(value) ? null : 'Reference is required for stock addition';
      }
      return null;
      
    case 'reason':
      if (formData.operation === 'reduce' || formData.newPrice !== undefined) {
        return validation.isNotEmpty(value) ? null : 'Reason is required';
      }
      return null;
      
    // Price update fields
    case 'newPrice':
      if (!validation.isNotEmpty(value)) return 'New price is required';
      return validation.isPositiveNumber(value) ? null : 'New price must be a positive number';
      
    default:
      return null;
  }
};

export default {
  validateInventoryForm,
  validateInventoryField
};