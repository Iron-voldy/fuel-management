import React, { useState } from 'react';

import EmployeeList from '../components/employees/EmployeeList';
import EmployeeForm from '../components/employees/EmployeeForm';
import EmployeeDetails from '../components/employees/EmployeeDetails';

const EmployeesPage = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleAddNewEmployee = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setIsDetailsOpen(true);
  };

  const handleSubmitSuccess = () => {
    setIsFormOpen(false);
    setSelectedEmployee(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
        <button 
          onClick={handleAddNewEmployee}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Employee
        </button>
      </div>

      {/* Employee List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <EmployeeList 
          onEditEmployee={handleEditEmployee}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Modals for Form and Details */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <EmployeeForm 
              employee={selectedEmployee}
              onSubmitSuccess={handleSubmitSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {isDetailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <EmployeeDetails 
              employee={selectedEmployee}
              onClose={() => setIsDetailsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;