import { useState } from 'react';
import loanValidator from '../validators/loanValidator';

// Change to a named export and default export
export const useLoanForm = (initialValues = {}, onSubmit) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is changed
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const validateField = (name, value) => {
    const error = loanValidator.validateLoanField(name, value, formData);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    return !error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate entire form
    const { isValid, errors: validationErrors } = loanValidator.validateLoanForm(formData);
    
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Loan submission error:', error);
      // Handle submission error if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    validateField,
    setFormData
  };
};

// Add default export
export default useLoanForm;