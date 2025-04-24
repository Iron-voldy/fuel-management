import React, { useState, useEffect } from 'react';
import loansService from '../../services/loans.service';

const LoanList = ({ onSelectLoan }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const response = await loansService.getAllLoans();
        
        // Check if response and data exist
        if (response && response.data) {
          setLoans(response.data);
        } else {
          setError('No loans data received');
        }
        setLoading(false);
      } catch (err) {
        console.error('Loan fetch error:', err);
        
        // Handle different types of errors
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setError(`Failed to fetch loans: ${err.response.data.message || 'Server error'}`);
        } else if (err.request) {
          // The request was made but no response was received
          setError('No response received from server. Please check your network connection.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError('Error setting up loan request. Please try again later.');
        }
        
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loans-loading">
          <p>Loading loans...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="loans-error">
          <h3>Error Fetching Loans</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      );
    }

    if (loans.length === 0) {
      return (
        <div className="loans-empty">
          <p>No loans found. You can apply for a new loan!</p>
        </div>
      );
    }

    return (
      <table className="loans-table">
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Amount</th>
            <th>Purpose</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map(loan => (
            <tr key={loan._id}>
              <td>{loan.loanId}</td>
              <td>LKR {loan.amount.toFixed(2)}</td>
              <td>{loan.purpose}</td>
              <td>{loan.status}</td>
              <td>
                <button onClick={() => onSelectLoan(loan)}>
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="loan-list">
      <h2>My Loans</h2>
      {renderContent()}
    </div>
  );
};

export default LoanList;