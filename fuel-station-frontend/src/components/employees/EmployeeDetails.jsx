import React from 'react';

// Reusable Detail Row Component
const DetailRow = ({ label, value, icon = null }) => (
  <div className="flex items-start">
    {icon && <span className="flex-shrink-0 mr-3">{icon}</span>}
    <div>
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-gray-800 font-semibold">{value}</p>
    </div>
  </div>
);

const EmployeeDetails = ({ employee, onClose }) => {
  if (!employee) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  return (
    <div className="employee-details bg-white rounded-lg shadow-xl p-6">
      {/* Previous sections remain the same */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Previous sections ... */}
        
        {/* Bank Details Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Bank Details
          </h2>
          <div className="space-y-3">
            <DetailRow 
              label="Bank Name" 
              value={employee.bankDetails?.bankName || 'N/A'}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 1.104l-.707.707a1 1 0 00-.293.707V4H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5V2.511a1 1 0 00-.293-.707L10 1.104zm1 2.898V4H9v-.998l2 2zM4 6h12v10H4V6z" clipRule="evenodd" />
                </svg>
              }
            />
            <DetailRow 
              label="Account Number" 
              value={employee.bankDetails?.accountNumber || 'N/A'}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 100-2 1 1 0 000 2zm9-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
              }
            />
            <DetailRow 
              label="Branch Code" 
              value={employee.bankDetails?.branchCode || 'N/A'}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end mt-6 space-x-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default EmployeeDetails;