const { validationResult } = require('express-validator');

/**
 * Validation middleware
 * Checks for validation errors and returns them if any
 */
module.exports = function(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  next();
};