import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import UUID package

const useTransferFundsValidation = (initialState, accounts, onSubmit) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromAccount, setFromAccount] = useState(null);
  const [toAccount, setToAccount] = useState(null);

  // Find and set source and destination accounts based on selection
  useEffect(() => {
    if (formData.fromAccountId) {
      const account = accounts.find(acc => acc._id === formData.fromAccountId);
      setFromAccount(account || null);
    } else {
      setFromAccount(null);
    }
    
    if (formData.toAccountId) {
      const account = accounts.find(acc => acc._id === formData.toAccountId);
      setToAccount(account || null);
    } else {
      setToAccount(null);
    }
  }, [formData.fromAccountId, formData.toAccountId, accounts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when field is updated
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    validateField(name);
  };

  const validateField = (fieldName) => {
    let fieldError = '';
    
    switch(fieldName) {
      case 'fromAccountId':
        if (!formData.fromAccountId) {
          fieldError = 'Please select a source account';
        } else if (formData.fromAccountId === formData.toAccountId) {
          fieldError = 'Source and destination accounts must be different';
        }
        break;
        
      case 'toAccountId':
        if (!formData.toAccountId) {
          fieldError = 'Please select a destination account';
        } else if (formData.fromAccountId === formData.toAccountId) {
          fieldError = 'Source and destination accounts must be different';
        }
        break;
        
      case 'amount':
        if (!formData.amount) {
          fieldError = 'Please enter an amount';
        } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
          fieldError = 'Amount must be a positive number';
        } else if (fromAccount && Number(formData.amount) > fromAccount.currentBalance) {
          fieldError = 'Insufficient funds in the source account';
        }
        break;
        
      case 'date':
        if (!formData.date) {
          fieldError = 'Please select a date';
        }
        break;
        
      case 'description':
        if (!formData.description || formData.description.trim() === '') {
          fieldError = 'Please enter a description';
        } else if (formData.description.length > 100) {
          fieldError = 'Description must be less than 100 characters';
        }
        break;
        
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [fieldName]: fieldError }));
    return !fieldError;
  };

  const validateForm = () => {
    // Fields to validate
    const fieldsToValidate = ['fromAccountId', 'toAccountId', 'amount', 'date', 'description'];
    
    // Validate each field
    const validationResults = fieldsToValidate.map(field => validateField(field));
    
    // Additional validations
    if (formData.fromAccountId === formData.toAccountId && formData.fromAccountId) {
      setErrors(prev => ({
        ...prev,
        fromAccountId: 'Source and destination accounts must be different',
        toAccountId: 'Source and destination accounts must be different'
      }));
      return false;
    }
    
    // Form is valid if all fields are valid
    return validationResults.every(isValid => isValid);
  };

  const handleSwapAccounts = () => {
    if (formData.fromAccountId && formData.toAccountId) {
      setFormData(prev => ({
        ...prev,
        fromAccountId: prev.toAccountId,
        toAccountId: prev.fromAccountId
      }));
      
      // Clear related errors
      setErrors(prev => ({
        ...prev,
        fromAccountId: '',
        toAccountId: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate transaction IDs using UUID
      const withdrawalTransactionId = uuidv4();
      const depositTransactionId = uuidv4();
      
      // Prepare data with transaction IDs
      const transferData = {
        ...formData,
        amount: Number(formData.amount),
        withdrawalTransactionId,
        depositTransactionId
      };
      
      // Submit form data with generated transaction IDs
      await onSubmit(transferData);
      
      // Reset form on success if needed
      // setFormData(initialState);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'An error occurred during the transfer'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions for accessing errors
  const hasError = (fieldName) => Boolean(errors[fieldName]);
  const getError = (fieldName) => errors[fieldName] || '';

  return {
    formData,
    errors,
    isSubmitting,
    fromAccount,
    toAccount,
    handleChange,
    handleBlur,
    handleSubmit,
    handleSwapAccounts,
    hasError,
    getError
  };
};

export default useTransferFundsValidation;