const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Placeholder route
router.get('/', auth, (req, res) => {
  res.json({ msg: 'Sales API' });
});

module.exports = router;