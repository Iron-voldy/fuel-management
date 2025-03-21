// Utility functions for working with expense data

// Format currency 
export const formatCurrency = (amount, currency = 'LKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  // Format date
  export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format short date (MM/DD/YYYY)
  export const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };
  
  // Get today's date formatted as YYYY-MM-DD for date inputs
  export const getTodayFormatted = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Calculate total expenses from an array of expense objects
  export const calculateTotalExpenses = (expenses) => {
    return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  };
  
  // Group expenses by category
  export const groupExpensesByCategory = (expenses) => {
    return expenses.reduce((groups, expense) => {
      const category = expense.category;
      if (!groups[category]) {
        groups[category] = {
          total: 0,
          count: 0,
          expenses: []
        };
      }
      
      groups[category].total += Number(expense.amount);
      groups[category].count += 1;
      groups[category].expenses.push(expense);
      
      return groups;
    }, {});
  };
  
  // Group expenses by month
  export const groupExpensesByMonth = (expenses) => {
    return expenses.reduce((groups, expense) => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!groups[monthYear]) {
        groups[monthYear] = {
          total: 0,
          count: 0,
          expenses: []
        };
      }
      
      groups[monthYear].total += Number(expense.amount);
      groups[monthYear].count += 1;
      groups[monthYear].expenses.push(expense);
      
      return groups;
    }, {});
  };
  
  // Get expense status color
  export const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return '#4caf50'; // Green
      case 'Rejected':
        return '#f44336'; // Red
      case 'Pending':
        return '#ff9800'; // Orange
      default:
        return '#9e9e9e'; // Grey
    }
  };
  
  // Validate expense fields
  export const validateExpense = (expense) => {
    const errors = {};
    
    if (!expense.category) {
      errors.category = 'Category is required';
    }
    
    if (!expense.description) {
      errors.description = 'Description is required';
    }
    
    if (!expense.amount) {
      errors.amount = 'Amount is required';
    } else if (isNaN(expense.amount) || Number(expense.amount) <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    
    if (!expense.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }
    
    if (!expense.date) {
      errors.date = 'Date is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Get expense categories
  export const expenseCategories = [
    'Fuel Purchase',
    'Electricity',
    'Water',
    'Rent',
    'Salaries',
    'Maintenance',
    'Equipment',
    'Office Supplies',
    'Marketing',
    'Insurance',
    'Taxes',
    'Transportation',
    'Utilities',
    'Other'
  ];
  
  // Get payment methods
  export const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'Credit Card',
    'Check',
    'Other'
  ];
  
  // Get approval status labels
  export const approvalStatuses = [
    'Pending',
    'Approved',
    'Rejected'
  ];
  
  export default {
    formatCurrency,
    formatDate,
    formatShortDate,
    getTodayFormatted,
    calculateTotalExpenses,
    groupExpensesByCategory,
    groupExpensesByMonth,
    getStatusColor,
    validateExpense,
    expenseCategories,
    paymentMethods,
    approvalStatuses
  };