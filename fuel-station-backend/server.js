const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('config');
const fs = require('fs');

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors());
app.use(morgan('dev'));

// Create uploads directory for file storage if it doesn't exist
const uploadDir = config.get('fileStorage');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ msg: 'Welcome to Fuel Station Management API' });
});

// Define Routes one by one with try/catch to identify the problematic one
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded successfully');
} catch (err) {
  console.error('Error loading auth routes:', err.message);
}

try {
  const bankBookRoutes = require('./routes/bankBook');
  app.use('/api/bank-book', bankBookRoutes);
  console.log('Bank Book routes loaded successfully');
} catch (err) {
  console.error('Error loading bank book routes:', err.message);
}

try {
  const stationRoutes = require('./routes/stationRoutes');
  app.use('/api/stations', stationRoutes);
  console.log('Station routes loaded successfully');
} catch (err) {
  console.error('Error loading station routes:', err.message);
}

try {
  const employeeRoutes = require('./routes/employees');
  app.use('/api/employees', employeeRoutes);
  console.log('Employee routes loaded successfully');
} catch (err) {
  console.error('Error loading employee routes:', err.message);
}

try {
  const expenseRoutes = require('./routes/expenses');
  app.use('/api/expenses', expenseRoutes);
  console.log('Expense routes loaded successfully');
} catch (err) {
  console.error('Error loading expense routes:', err.message);
}

try {
  const loanRoutes = require('./routes/loans');
  app.use('/api/loans', loanRoutes);
  console.log('Loan routes loaded successfully');
} catch (err) {
  console.error('Error loading loan routes:', err.message);
}

try {
  const payrollRoutes = require('./routes/payroll');
  app.use('/api/payroll', payrollRoutes);
  console.log('Payroll routes loaded successfully');
} catch (err) {
  console.error('Error loading payroll routes:', err.message);
}

try {
  const pettyCashRoutes = require('./routes/pettyCash');
  app.use('/api/petty-cash', pettyCashRoutes);
  console.log('Petty Cash routes loaded successfully');
} catch (err) {
  console.error('Error loading petty cash routes:', err.message);
}

// In server.js, ensure this part is working:
try {
  const reportRoutes = require('./routes/reports');
  app.use('/api/reports', reportRoutes);
  console.log('Report routes loaded successfully');
} catch (err) {
  console.error('Error loading report routes:', err.message);
}

try {
  const salesRoutes = require('./routes/sales');
  app.use('/api/sales', salesRoutes);
  console.log('Sales routes loaded successfully');
} catch (err) {
  console.error('Error loading sales routes:', err.message);
}

try {
  const transactionRoutes = require('./routes/transactions');
  app.use('/api/transactions', transactionRoutes);
  console.log('Transaction routes loaded successfully');
} catch (err) {
  console.error('Error loading transaction routes:', err.message);
}

try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('Dashboard routes loaded successfully');
} catch (err) {
  console.error('Error loading dashboard routes:', err.message);
}

try {
  const customerRoutes = require('./routes/customers');
  app.use('/api/customers', customerRoutes);
  console.log('Customer routes loaded successfully');
} catch (err) {
  console.error('Error loading customer routes:', err.message);
}

try {
  const invoiceRoutes = require('./routes/invoices');
  app.use('/api/invoices', invoiceRoutes);
  console.log('Invoice routes loaded successfully');
} catch (err) {
  console.error('Error loading invoice routes:', err.message);
}

// Create required upload directories
const uploadDirs = [
  './uploads/attachments', 
  './uploads/expenses', 
  './uploads/petty-cash',
  './uploads/customers'  // Add directory for customer documents
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

try {
  const inventoryRoutes = require('./routes/inventory');
  app.use('/api/inventory', inventoryRoutes);
  console.log('Inventory routes loaded successfully');
} catch (err) {
  console.error('Error loading inventory routes:', err.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Start server
const PORT = config.get('port') || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));