const moment = require('moment');
const config = require('config');

// Get EPF/ETF rates from config
const epfEmployeeRate = config.get('epfEmployeeRate') / 100; // 8%
const epfEmployerRate = config.get('epfEmployerRate') / 100; // 12%
const etfRate = config.get('etfRate') / 100; // 3%
const loanInterestRate = config.get('loanInterestRate') / 100; // 23%

/**
 * Calculate EPF and ETF for an employee
 * @param {Number} grossSalary - The gross salary amount
 * @returns {Object} - EPF and ETF calculations
 */
exports.calculateEpfEtf = (grossSalary) => {
  const epfEmployee = grossSalary * epfEmployeeRate;
  const epfEmployer = grossSalary * epfEmployerRate;
  const etf = grossSalary * etfRate;
  
  return {
    epfEmployee: parseFloat(epfEmployee.toFixed(2)),
    epfEmployer: parseFloat(epfEmployer.toFixed(2)),
    etf: parseFloat(etf.toFixed(2)),
    totalEmployerContribution: parseFloat((epfEmployer + etf).toFixed(2))
  };
};

/**
 * Calculate loan repayment amount and schedule
 * @param {Number} principal - Loan amount
 * @param {Number} durationMonths - Loan duration in months
 * @param {Date} startDate - Start date of the loan
 * @returns {Object} - Loan calculations and repayment schedule
 */
exports.calculateLoanRepayment = (principal, durationMonths, startDate) => {
  // Monthly interest rate
  const monthlyRate = loanInterestRate / 12;
  
  // Calculate monthly installment (simple interest)
  const interestAmount = principal * loanInterestRate * (durationMonths / 12);
  const totalRepayable = principal + interestAmount;
  const monthlyInstallment = totalRepayable / durationMonths;
  
  // Generate repayment schedule
  const schedule = [];
  let remainingBalance = totalRepayable;
  const start = moment(startDate);
  
  for (let i = 0; i < durationMonths; i++) {
    const dueDate = moment(start).add(i + 1, 'months').toDate();
    const balanceAfterPayment = Math.max(0, remainingBalance - monthlyInstallment);
    
    schedule.push({
      installmentNumber: i + 1,
      dueDate,
      amount: parseFloat(monthlyInstallment.toFixed(2)),
      remainingBalance: parseFloat(balanceAfterPayment.toFixed(2)),
      status: 'pending'
    });
    
    remainingBalance = balanceAfterPayment;
  }
  
  return {
    principal,
    interestAmount: parseFloat(interestAmount.toFixed(2)),
    totalRepayable: parseFloat(totalRepayable.toFixed(2)),
    monthlyInstallment: parseFloat(monthlyInstallment.toFixed(2)),
    schedule
  };
};

/**
 * Calculate payroll details for an employee
 * @param {Object} employee - Employee object with salary details
 * @param {Array} loans - Array of active loans for the employee
 * @param {Object} additionalEarnings - Additional earnings (overtime, bonuses, etc.)
 * @param {Object} additionalDeductions - Additional deductions
 * @returns {Object} - Complete payroll calculation
 */
exports.calculatePayroll = (employee, loans = [], additionalEarnings = {}, additionalDeductions = {}) => {
  // Basic salary and allowances
  const { basic: basicSalary, allowances } = employee.salary;
  const totalAllowances = allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  
  // Additional earnings
  const overtime = additionalEarnings.overtime || 0;
  const bonuses = additionalEarnings.bonuses || 0;
  const otherEarnings = additionalEarnings.other || 0;
  
  // Calculate gross salary
  const grossSalary = basicSalary + totalAllowances + overtime + bonuses + otherEarnings;
  
  // Calculate EPF/ETF
  const { epfEmployee, epfEmployer, etf, totalEmployerContribution } = this.calculateEpfEtf(grossSalary);
  
  // Calculate loan deductions
  let totalLoanDeduction = 0;
  const loanDeductions = [];
  
  loans.forEach(loan => {
    if (loan.status === 'active') {
      // Find the next pending installment
      const pendingInstallment = loan.installments.find(installment => 
        installment.status === 'pending'
      );
      
      if (pendingInstallment) {
        totalLoanDeduction += pendingInstallment.amount;
        loanDeductions.push({
          loanId: loan._id,
          installmentNumber: pendingInstallment.installmentNumber,
          amount: pendingInstallment.amount
        });
      }
    }
  });
  
  // Additional deductions
  const advances = additionalDeductions.advances || 0;
  const otherDeductions = additionalDeductions.other || 0;
  
  // Calculate total deductions
  const totalDeductions = epfEmployee + totalLoanDeduction + advances + otherDeductions;
  
  // Calculate net salary
  const netSalary = grossSalary - totalDeductions;
  
  return {
    employeeId: employee._id,
    earnings: {
      basicSalary,
      allowances: employee.salary.allowances,
      overtime,
      bonuses,
      otherEarnings,
      totalEarnings: grossSalary
    },
    deductions: {
      epfEmployee,
      loanRepayment: totalLoanDeduction,
      loanDeductions,
      advances,
      otherDeductions,
      totalDeductions
    },
    contributions: {
      epfEmployer,
      etf,
      totalContributions: totalEmployerContribution
    },
    summary: {
      grossSalary,
      totalDeductions,
      netSalary: parseFloat(netSalary.toFixed(2)),
      costToCompany: parseFloat((grossSalary + totalEmployerContribution).toFixed(2))
    }
  };
};

/**
 * Calculate financial ratios for reporting
 * @param {Object} financialData - Revenue, expenses, assets, liabilities data
 * @returns {Object} - Financial ratios
 */
exports.calculateFinancialRatios = (financialData) => {
  const {
    revenue,
    costOfSales,
    grossProfit,
    expenses,
    netProfit,
    assets,
    liabilities,
    equity
  } = financialData;
  
  // Profitability ratios
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  // Liquidity ratios
  const currentRatio = liabilities.current > 0 
    ? assets.current / liabilities.current 
    : 0;
    
  // Leverage ratios
  const debtToEquity = equity > 0 
    ? liabilities.total / equity 
    : 0;
    
  const debtToAssets = assets.total > 0 
    ? liabilities.total / assets.total 
    : 0;
  
  return {
    profitability: {
      grossMargin: parseFloat(grossMargin.toFixed(2)),
      netMargin: parseFloat(netMargin.toFixed(2))
    },
    liquidity: {
      currentRatio: parseFloat(currentRatio.toFixed(2))
    },
    leverage: {
      debtToEquity: parseFloat(debtToEquity.toFixed(2)),
      debtToAssets: parseFloat(debtToAssets.toFixed(2))
    }
  };
};

/**
 * Calculate the cash flow for a period
 * @param {Array} inflows - Cash inflows for the period
 * @param {Array} outflows - Cash outflows for the period
 * @returns {Object} - Cash flow summary
 */
exports.calculateCashFlow = (inflows, outflows) => {
  // Categorize and sum inflows
  const totalInflows = inflows.reduce((sum, inflow) => sum + inflow.amount, 0);
  
  // Group inflows by category
  const inflowsByCategory = inflows.reduce((acc, inflow) => {
    if (!acc[inflow.category]) {
      acc[inflow.category] = 0;
    }
    acc[inflow.category] += inflow.amount;
    return acc;
  }, {});
  
  // Categorize and sum outflows
  const totalOutflows = outflows.reduce((sum, outflow) => sum + outflow.amount, 0);
  
  // Group outflows by category
  const outflowsByCategory = outflows.reduce((acc, outflow) => {
    if (!acc[outflow.category]) {
      acc[outflow.category] = 0;
    }
    acc[outflow.category] += outflow.amount;
    return acc;
  }, {});
  
  // Calculate net cash flow
  const netCashFlow = totalInflows - totalOutflows;
  
  return {
    totalInflows: parseFloat(totalInflows.toFixed(2)),
    totalOutflows: parseFloat(totalOutflows.toFixed(2)),
    netCashFlow: parseFloat(netCashFlow.toFixed(2)),
    inflowsByCategory,
    outflowsByCategory
  };
};

/**
 * Calculate fuel inventory value
 * @param {Array} inventory - Fuel inventory data with quantity and cost
 * @returns {Object} - Inventory valuation
 */
exports.calculateInventoryValue = (inventory) => {
  let totalValue = 0;
  const valuationByType = {};
  
  inventory.forEach(item => {
    const { fuelType, quantity, costPerUnit } = item;
    const value = quantity * costPerUnit;
    totalValue += value;
    
    valuationByType[fuelType] = {
      quantity,
      costPerUnit,
      value: parseFloat(value.toFixed(2))
    };
  });
  
  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    valuationByType
  };
};