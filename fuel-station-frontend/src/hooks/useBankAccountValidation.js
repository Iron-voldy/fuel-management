import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for bank account form validation
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Function} onSubmit - Function to call when form is submitted and valid
 * @returns {Object} - Form state and handlers
 */
const useBankAccountValidation = (initialValues, onSubmit) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate a single field
  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'accountName':
        if (!value.trim()) {
          error = 'Account name is required';
        } else if (value.trim().length < 3) {
          error = 'Account name must be at least 3 characters';
        }
        break;
      case 'accountNumber':
        if (!value.trim()) {
          error = 'Account number is required';
        } else if (!/^\d{5,20}$/.test(value.replace(/\s/g, ''))) {
          error = 'Account number must contain 5-20 digits';
        }
        break;
      case 'bankName':
        if (!value.trim()) {
          error = 'Bank name is required';
        }
        break;
      case 'branchName':
        if (!value.trim()) {
          error = 'Branch name is required';
        }
        break;
      case 'accountType':
        if (!value) {
          error = 'Account type is required';
        }
        break;
      case 'openingBalance':
        if (value === '') {
          error = 'Opening balance is required';
        } else if (isNaN(value) || Number(value) < 0) {
          error = 'Opening balance must be a non-negative number';
        }
        break;
      case 'routingNumber':
        if (value && !/^\d{9}$/.test(value.replace(/\s/g, ''))) {
          error = 'Routing number must be 9 digits';
        }
        break;
      default:
        break;
    }

    return error;
  };

  // Validate the entire form
  const validateForm = useCallback(() => {
    const newErrors = {};
    let formIsValid = true;

    // Validate each field
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        formIsValid = false;
      }
    });

    setErrors(newErrors);
    setIsValid(formIsValid);
    return formIsValid;
  }, [formData]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle field blur to validate on blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    const isFormValid = validateForm();
    
    if (isFormValid) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Set a specific field value
  const setFieldValue = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field value is set programmatically
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Check if field has error
  const hasError = (field) => {
    return !!(touched[field] && errors[field]);
  };

  // Get error message for a field
  const getError = (field) => {
    return touched[field] ? errors[field] || '' : '';
  };

  // Validate form when form data changes
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateForm();
    }
  }, [formData, validateForm]);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    hasError,
    getError
  };
};

export default useBankAccountValidation;