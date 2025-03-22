// src/hooks/useFormValidation.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for form validation
 * @param {Object} initialValues - Initial form values
 * @param {Function} validateForm - Function to validate the entire form
 * @param {Function} validateField - Function to validate a single field
 * @param {Function} onSubmit - Function to call when form is submitted and valid
 * @returns {Object} - Form state and handlers
 */
const useFormValidation = (initialValues, validateForm, validateField, onSubmit) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Validate the entire form
  const validateAllFields = useCallback(() => {
    const result = validateForm(formData);
    setErrors(result.errors);
    setIsValid(result.isValid);
    return result.isValid;
  }, [formData, validateForm]);

  // Update form field
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: fieldValue
    }));
    
    setIsFormDirty(true);
    
    // Validate the field on change
    if (touched[name]) {
      const errorMessage = validateField(name, fieldValue, {
        ...formData,
        [name]: fieldValue
      });
      
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: errorMessage
      }));
    }
  }, [formData, touched, validateField]);

  // Handle nested field changes (e.g., contactInfo.email)
  const handleNestedChange = useCallback((name, value) => {
    const parts = name.split('.');
    
    if (parts.length === 2) {
      const [parent, child] = parts;
      
      setFormData(prevData => ({
        ...prevData,
        [parent]: {
          ...(prevData[parent] || {}),
          [child]: value
        }
      }));
      
      setIsFormDirty(true);
      
      // Validate the nested field on change
      if (touched[name]) {
        const errorMessage = validateField(name, value, {
          ...formData,
          [parent]: {
            ...(formData[parent] || {}),
            [child]: value
          }
        });
        
        setErrors(prevErrors => {
          const parentErrors = prevErrors[parent] || {};
          return {
            ...prevErrors,
            [parent]: {
              ...parentErrors,
              [child]: errorMessage
            }
          };
        });
      }
    } else if (parts.length > 2) {
      // Handle deeper nesting if needed in the future
      console.warn('Deep nesting not yet supported in handleNestedChange');
    }
  }, [formData, touched, validateField]);

  // Handle array field changes (e.g., items[0].name)
  const handleArrayChange = useCallback((arrayName, index, fieldName, value) => {
    setFormData(prevData => {
      const array = [...(prevData[arrayName] || [])];
      if (!array[index]) {
        array[index] = {};
      }
      array[index] = { ...array[index], [fieldName]: value };
      return {
        ...prevData,
        [arrayName]: array
      };
    });
    
    setIsFormDirty(true);
    
    // Validate the array field on change
    const fullFieldName = `${arrayName}[${index}].${fieldName}`;
    
    if (touched[fullFieldName]) {
      const updatedFormData = { ...formData };
      if (!updatedFormData[arrayName]) {
        updatedFormData[arrayName] = [];
      }
      if (!updatedFormData[arrayName][index]) {
        updatedFormData[arrayName][index] = {};
      }
      updatedFormData[arrayName][index][fieldName] = value;
      
      const errorMessage = validateField(fullFieldName, value, updatedFormData);
      
      setErrors(prevErrors => {
        const arrayErrors = prevErrors[arrayName] || [];
        const itemErrors = arrayErrors[index] || {};
        
        // Create a new array with the updated errors
        const newArrayErrors = [...arrayErrors];
        newArrayErrors[index] = {
          ...itemErrors,
          [fieldName]: errorMessage
        };
        
        return {
          ...prevErrors,
          [arrayName]: newArrayErrors
        };
      });
    }
  }, [formData, touched, validateField]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    setTouched(prevTouched => ({
      ...prevTouched,
      [name]: true
    }));
    
    const errorMessage = validateField(name, value, formData);
    
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: errorMessage
    }));
  }, [formData, validateField]);

  // Handle nested field blur
  const handleNestedBlur = useCallback((name, value) => {
    const parts = name.split('.');
    
    setTouched(prevTouched => ({
      ...prevTouched,
      [name]: true
    }));
    
    if (parts.length === 2) {
      const [parent, child] = parts;
      const errorMessage = validateField(name, value, formData);
      
      setErrors(prevErrors => {
        const parentErrors = prevErrors[parent] || {};
        return {
          ...prevErrors,
          [parent]: {
            ...parentErrors,
            [child]: errorMessage
          }
        };
      });
    }
  }, [formData, validateField]);

  // Handle array field blur
  const handleArrayBlur = useCallback((arrayName, index, fieldName, value) => {
    const fullFieldName = `${arrayName}[${index}].${fieldName}`;
    
    setTouched(prevTouched => ({
      ...prevTouched,
      [fullFieldName]: true
    }));
    
    const errorMessage = validateField(fullFieldName, value, formData);
    
    setErrors(prevErrors => {
      const arrayErrors = prevErrors[arrayName] || [];
      const itemErrors = arrayErrors[index] || {};
      
      // Create a new array with the updated errors
      const newArrayErrors = [...arrayErrors];
      newArrayErrors[index] = {
        ...itemErrors,
        [fieldName]: errorMessage
      };
      
      return {
        ...prevErrors,
        [arrayName]: newArrayErrors
      };
    });
  }, [formData, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    // Mark all fields as touched
    const allFields = Object.keys(formData);
    const allTouched = allFields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    setTouched(allTouched);
    
    // Validate all fields
    const isFormValid = validateAllFields();
    
    if (isFormValid) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        // Reset form dirty state after successful submission
        setIsFormDirty(false);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [formData, validateAllFields, onSubmit]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsFormDirty(false);
  }, [initialValues]);

  // Set a specific field value
  const setFieldValue = useCallback((name, value) => {
    if (name.includes('.')) {
      // Handle nested field
      handleNestedChange(name, value);
    } else if (name.includes('[') && name.includes(']')) {
      // Handle array field
      const matches = name.match(/([^\[]+)\[(\d+)\]\.(.+)/);
      if (matches && matches.length === 4) {
        const [_, arrayName, indexStr, fieldName] = matches;
        handleArrayChange(arrayName, parseInt(indexStr, 10), fieldName, value);
      } else {
        console.warn('Invalid array field format:', name);
      }
    } else {
      // Handle regular field
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
      
      setIsFormDirty(true);
    }
  }, [handleNestedChange, handleArrayChange]);

  // Set multiple field values at once
  const setFieldValues = useCallback((values) => {
    setFormData(prevData => ({
      ...prevData,
      ...values
    }));
    
    setIsFormDirty(true);
  }, []);

  // Set a specific field error
  const setFieldError = useCallback((name, error) => {
    if (name.includes('.')) {
      // Handle nested field error
      const [parent, child] = name.split('.');
      setErrors(prevErrors => {
        const parentErrors = prevErrors[parent] || {};
        return {
          ...prevErrors,
          [parent]: {
            ...parentErrors,
            [child]: error
          }
        };
      });
    } else if (name.includes('[') && name.includes(']')) {
      // Handle array field error
      const matches = name.match(/([^\[]+)\[(\d+)\]\.(.+)/);
      if (matches && matches.length === 4) {
        const [_, arrayName, indexStr, fieldName] = matches;
        const index = parseInt(indexStr, 10);
        
        setErrors(prevErrors => {
          const arrayErrors = prevErrors[arrayName] || [];
          const itemErrors = arrayErrors[index] || {};
          
          // Create a new array with the updated errors
          const newArrayErrors = [...arrayErrors];
          newArrayErrors[index] = {
            ...itemErrors,
            [fieldName]: error
          };
          
          return {
            ...prevErrors,
            [arrayName]: newArrayErrors
          };
        });
      }
    } else {
      // Handle regular field error
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: error
      }));
    }
  }, []);

  // Validate the form on initial load and when form data changes
  useEffect(() => {
    if (isFormDirty) {
      validateAllFields();
    }
  }, [formData, isFormDirty, validateAllFields]);

  // Utility to check if a field has an error
  const hasError = useCallback((name) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      return !!(errors[parent] && errors[parent][child]);
    } else if (name.includes('[') && name.includes(']')) {
      const matches = name.match(/([^\[]+)\[(\d+)\]\.(.+)/);
      if (matches && matches.length === 4) {
        const [_, arrayName, indexStr, fieldName] = matches;
        const index = parseInt(indexStr, 10);
        
        return !!(
          errors[arrayName] && 
          errors[arrayName][index] && 
          errors[arrayName][index][fieldName]
        );
      }
      return false;
    } else {
      return !!errors[name];
    }
  }, [errors]);

  // Utility to get an error message
  const getError = useCallback((name) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      return errors[parent] && errors[parent][child];
    } else if (name.includes('[') && name.includes(']')) {
      const matches = name.match(/([^\[]+)\[(\d+)\]\.(.+)/);
      if (matches && matches.length === 4) {
        const [_, arrayName, indexStr, fieldName] = matches;
        const index = parseInt(indexStr, 10);
        
        return errors[arrayName] && 
          errors[arrayName][index] && 
          errors[arrayName][index][fieldName];
      }
      return null;
    } else {
      return errors[name];
    }
  }, [errors]);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    isValid,
    isFormDirty,
    handleChange,
    handleNestedChange,
    handleArrayChange,
    handleBlur,
    handleNestedBlur,
    handleArrayBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldValues,
    setFieldError,
    hasError,
    getError,
    validateAllFields
  };
};

export default useFormValidation;