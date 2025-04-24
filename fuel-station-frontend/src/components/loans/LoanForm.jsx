import React from 'react';
import useLoanForm from '../../hooks/useLoanForm';
import loansService from '../../services/loans.service';

const LoanForm = ({ onLoanSubmit }) => {
  const initialValues = {
    amount: '',
    purpose: '',
    durationMonths: ''
  };

  const { 
    formData, 
    errors, 
    isSubmitting, 
    handleChange, 
    handleSubmit 
  } = useLoanForm(initialValues, async (loanData) => {
    const response = await loansService.applyForLoan(loanData);
    onLoanSubmit && onLoanSubmit(response);
  });

  return (
    <div className="loan-form">
      <h2>Apply for a Loan</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Loan Amount</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter loan amount"
          />
          {errors.amount && <span className="error">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label>Purpose</label>
          <input
            type="text"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            placeholder="Describe loan purpose"
          />
          {errors.purpose && <span className="error">{errors.purpose}</span>}
        </div>

        <div className="form-group">
          <label>Duration (Months)</label>
          <input
            type="number"
            name="durationMonths"
            value={formData.durationMonths}
            onChange={handleChange}
            placeholder="Loan duration in months"
          />
          {errors.durationMonths && <span className="error">{errors.durationMonths}</span>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Apply for Loan'}
        </button>
      </form>
    </div>
  );
};

export default LoanForm;