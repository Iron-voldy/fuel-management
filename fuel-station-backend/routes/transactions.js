const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// @route   GET api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', auth, (req, res) => {
  res.json({ msg: 'Transactions API' });
});

// Add other transaction routes as needed
// For example:
// router.get('/all', auth, transactionController.getAllTransactions);

module.exports = router;