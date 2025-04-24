import React, { useState, useEffect } from 'react';
import employeeAPI from '../../services/employees.service';
import { validateEmployeeForm, validateEmployeeField } from '../../validators/employeeValidator';

const EmployeeForm = ({ employee, onSubmitSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    personalInfo: {
      name: '',
      address: '',
      contact: '',
      email: '',
      joinDate: new Date().toISOString().split('T')[0]
    },
    position: '',
    stationId: '',
    salary: {
      basic: '',
      allowances: []
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      branchCode: ''
    }
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowances, setAllowances] = useState([]);

  // Populate form with existing employee data when editing
  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee,
        personalInfo: {
          ...employee.personalInfo,
          joinDate: employee.personalInfo.joinDate 
            ? new Date(employee.personalInfo.joinDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        }
      });
      
      // Populate allowances if exists
      if (employee.salary && employee.salary.allowances) {
        setAllowances(employee.salary.allowances);
      }
    }
  }, [employee]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    const nameParts = name.split('.');
    
    // Handle nested fields
    if (nameParts.length > 1) {
      setFormData(prev => ({
        ...prev,
        [nameParts[0]]: {
          ...(prev[nameParts[0]] || {}),
          [nameParts[1]]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear specific field error
    const errorCopy = { ...errors };
    delete errorCopy[name];
    setErrors(errorCopy);
  };

  // Add allowance
  const addAllowance = () => {
    setAllowances([...allowances, { type: '', amount: '' }]);
  };

  // Remove allowance
  const removeAllowance = (index) => {
    const newAllowances = allowances.filter((_, i) => i !== index);
    setAllowances(newAllowances);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        allowances: newAllowances
      }
    }));
  };

  // Handle allowance change
  const handleAllowanceChange = (index, field, value) => {
    const newAllowances = [...allowances];
    newAllowances[index][field] = value;
    
    setAllowances(newAllowances);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        allowances: newAllowances
      }
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Final form data preparation
    const finalFormData = {
      ...formData,
      salary: {
        ...formData.salary,
        allowances: allowances
      }
    };

    // Validate form
    const validationResult = validateEmployeeForm(finalFormData);

    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (employee) {
        // Update existing employee
        await employeeAPI.update(employee._id, finalFormData);
      } else {
        // Create new employee
        await employeeAPI.create(finalFormData);
      }
      onSubmitSuccess();
    } catch (error) {
      alert('Failed to save employee');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render input field with error handling
  const renderInputField = (name, label, type = 'text', nested = false) => {
    const fieldName = nested ? name : name;
    const value = nested 
      ? formData[name.split('.')[0]][name.split('.')[1]] 
      : formData[name];
    
    return (
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={fieldName}>
          {label}
        </label>
        <input
          type={type}
          id={fieldName}
          name={fieldName}
          value={value || ''}
          onChange={handleChange}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 ${
            errors[fieldName] 
              ? 'border-red-500 focus:ring-red-300' 
              : 'border-gray-300 focus:ring-blue-300'
          }`}
        />
        {errors[fieldName] && (
          <p className="text-red-500 text-xs italic mt-1">{errors[fieldName]}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
          {renderInputField('employeeId', 'Employee ID')}
          {renderInputField('personalInfo.name', 'Full Name', 'text', true)}
          {renderInputField('personalInfo.address', 'Address', 'text', true)}
          {renderInputField('personalInfo.contact', 'Contact Number', 'tel', true)}
          {renderInputField('personalInfo.email', 'Email', 'email', true)}
          {renderInputField('personalInfo.joinDate', 'Join Date', 'date', true)}
        </div>

        {/* Employment Details Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Employment Details</h2>
          {renderInputField('position', 'Position')}
          {renderInputField('stationId', 'Station ID')}
          
          {/* Salary Section */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Salary Details</h3>
            {renderInputField('salary.basic', 'Basic Salary', 'number')}
            
            {/* Allowances */}
            <div className="mt-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Allowances
              </label>
              {allowances.map((allowance, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <div className="flex-grow">
                    <input
                      type="text"
                      placeholder="Allowance Type"
                      value={allowance.type}
                      onChange={(e) => handleAllowanceChange(index, 'type', e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div className="flex-grow">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={allowance.amount}
                      onChange={(e) => handleAllowanceChange(index, 'amount', e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAllowance(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAllowance}
                className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Allowance
              </button>
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Bank Details</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {renderInputField('bankDetails.bankName', 'Bank Name')}
            {renderInputField('bankDetails.accountNumber', 'Account Number')}
            {renderInputField('bankDetails.branchCode', 'Branch Code')}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`bg-blue-500 text-white px-4 py-2 rounded transition-colors ${
            isSubmitting 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'
          }`}
        >
          {isSubmitting 
            ? (employee ? 'Updating...' : 'Creating...') 
            : (employee ? 'Update Employee' : 'Create Employee')
          }
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;