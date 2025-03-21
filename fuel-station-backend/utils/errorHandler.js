// Error handling utility
exports.errorHandler = (res, error, defaultMessage = 'Server error') => {
    console.error(error);
    
    // Check for Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    // Check for Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please use a different value.`
      });
    }
    
    // Check for Mongoose cast error (invalid ID)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}`
      });
    }
    
    // Default server error
    res.status(500).json({
      success: false,
      message: defaultMessage,
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  };