import React, { useState } from 'react';
import LoanForm from '../components/loans/LoanForm';
import LoanList from '../components/loans/LoanList';
import LoanDetails from '../components/loans/LoanDetails';

const LoansPage = () => {
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showLoanForm, setShowLoanForm] = useState(false);

  const handleLoanSubmit = (newLoan) => {
    // Optional: You could add a toast notification or refresh the list
    setShowLoanForm(false);
  };

  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
  };

  const handleCloseLoanDetails = () => {
    setSelectedLoan(null);
  };

  return (
    <div className="loans-page">
      <div className="loans-header">
        <h1>Loan Management</h1>
        <button onClick={() => setShowLoanForm(!showLoanForm)}>
          {showLoanForm ? 'Cancel' : 'Apply for New Loan'}
        </button>
      </div>

      {showLoanForm && (
        <LoanForm onLoanSubmit={handleLoanSubmit} />
      )}

      <LoanList onSelectLoan={handleSelectLoan} />

      {selectedLoan && (
        <LoanDetails 
          loan={selectedLoan} 
          onClose={handleCloseLoanDetails} 
        />
      )}
    </div>
  );
};

export default LoansPage;