const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/customers/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and common document types
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

/**
 * @route   GET api/customers
 * @desc    Get all customers
 * @access  Private
 */
router.get('/', auth, customerController.getAllCustomers);

/**
 * @route   GET api/customers/:id
 * @desc    Get a single customer
 * @access  Private
 */
router.get('/:id', auth, customerController.getCustomerById);

/**
 * @route   POST api/customers
 * @desc    Create a new customer
 * @access  Private
 */
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('type', 'Type is required').isIn(['Individual', 'Corporate', 'Government']),
      check('contactInfo.address', 'Address is required').not().isEmpty(),
      check('contactInfo.city', 'City is required').not().isEmpty(),
      check('contactInfo.phone', 'Phone number is required').not().isEmpty(),
      check('contactInfo.email', 'Please include a valid email').isEmail()
    ]
  ],
  customerController.createCustomer
);

/**
 * @route   PUT api/customers/:id
 * @desc    Update a customer
 * @access  Private
 */
router.put(
  '/:id',
  [
    auth,
    [
      check('name', 'Name is required').optional().not().isEmpty(),
      check('type', 'Type must be valid').optional().isIn(['Individual', 'Corporate', 'Government']),
      check('contactInfo.email', 'Please include a valid email').optional().isEmail(),
      check('status', 'Status must be valid').optional().isIn(['Active', 'Inactive', 'Blacklisted'])
    ]
  ],
  customerController.updateCustomer
);

/**
 * @route   DELETE api/customers/:id
 * @desc    Delete a customer
 * @access  Private (Admin)
 */
router.delete('/:id', auth, customerController.deleteCustomer);

/**
 * @route   POST api/customers/:id/credit-account
 * @desc    Set up credit account for a customer
 * @access  Private (Admin/Manager)
 */
router.post(
  '/:id/credit-account',
  [
    auth,
    [
      check('creditLimit', 'Credit limit is required and must be a positive number').isFloat({ min: 0.01 }),
      check('paymentTerms', 'Payment terms must be a positive number').optional().isInt({ min: 1 })
    ]
  ],
  customerController.setupCreditAccount
);

/**
 * @route   PUT api/customers/:id/credit-account
 * @desc    Update credit account settings
 * @access  Private (Admin/Manager)
 */
router.put(
  '/:id/credit-account',
  [
    auth,
    [
      check('creditLimit', 'Credit limit must be a positive number').optional().isFloat({ min: 0.01 }),
      check('paymentTerms', 'Payment terms must be a positive number').optional().isInt({ min: 1 }),
      check('status', 'Status must be valid').optional().isIn(['Active', 'Suspended', 'Closed'])
    ]
  ],
  customerController.updateCreditAccount
);

/**
 * @route   GET api/customers/:id/credit-report
 * @desc    Get customer credit usage report
 * @access  Private
 */
router.get('/:id/credit-report', auth, customerController.getCreditReport);

/**
 * @route   POST api/customers/:id/documents
 * @desc    Upload customer document
 * @access  Private
 */
router.post(
  '/:id/documents',
  [
    auth, 
    upload.single('document'),
    [
      check('type', 'Document type is required').isIn(['Registration', 'Contract', 'ID', 'Other'])
    ]
  ],
  customerController.uploadDocument
);

/**
 * @route   DELETE api/customers/:id/documents/:documentId
 * @desc    Delete customer document
 * @access  Private
 */
router.delete('/:id/documents/:documentId', auth, customerController.deleteDocument);

module.exports = router;