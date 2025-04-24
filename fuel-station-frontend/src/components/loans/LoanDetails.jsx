import React from 'react';

const LoanDetails = ({ loan, onClose }) => {
  if (!loan) return null;

  return (
    <div className="loan-details">
      <h2>Loan Details</h2>
      <div className="loan-info">
        <p><strong>Loan ID:</strong> {loan.loanId}</p>
        <p><strong>Amount:</strong> LKR {loan.amount.toFixed(2)}</p>
        <p><strong>Purpose:</strong> {loan.purpose}</p>
        <p><strong>Status:</strong> {loan.status}</p>
        <p><strong>Duration:</strong> {loan.durationMonths} months</p>
        <p><strong>Total Repayable:</strong> LKR {loan.totalRepayable.toFixed(2)}</p>
        <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
        
        <h3>Installments</h3>
        <table>
          <thead>
            <tr>
              <th>Installment #</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loan.installments.map(installment => (
              <tr key={installment.installmentNumber}>
                <td>{installment.installmentNumber}</td>
                <td>{new Date(installment.dueDate).toLocaleDateString()}</td>
                <td>LKR {installment.amount.toFixed(2)}</td>
                <td>{installment.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default LoanDetails;