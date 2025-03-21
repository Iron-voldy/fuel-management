const express = require('express');
const router = express.Router();
const { 
  createStation, 
  getStations, 
  getStationById, 
  updateStation, 
  deleteStation,
  createMultipleStations,
  getStationsByStatus
} = require('../controllers/stationController');
const auth = require('../middleware/auth'); // Using existing auth middleware
const { admin } = require('../middleware/authMiddleware');

// Routes for stations
router.route('/')
  .post(auth, createStation)
  .get(auth, getStations);

router.route('/batch')
  .post(auth, createMultipleStations);

router.route('/status/:status')
  .get(auth, getStationsByStatus);

router.route('/:id')
  .get(auth, getStationById)
  .put(auth, updateStation)
  .delete(auth, deleteStation);

module.exports = router;