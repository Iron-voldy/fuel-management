const Station = require('../models/Station');
const { errorHandler } = require('../utils/errorHandler');

// @desc    Create new station
// @route   POST /api/stations
// @access  Private/Admin
exports.createStation = async (req, res) => {
  try {
    // Generate unique station ID if not provided
    if (!req.body.stationId) {
      req.body.stationId = Station.generateStationId();
    }

    // Add user ID as creator if authenticated
    if (req.user) {
      req.body.createdBy = req.user.id;
      req.body.updatedBy = req.user.id;
    }

    const station = new Station(req.body);
    const createdStation = await station.save();

    res.status(201).json({
      success: true,
      data: createdStation
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to create station');
  }
};

// @desc    Get all stations
// @route   GET /api/stations
// @access  Private
exports.getStations = async (req, res) => {
  try {
    const stations = await Station.find({})
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to fetch stations');
  }
};

// @desc    Get single station
// @route   GET /api/stations/:id
// @access  Private
exports.getStationById = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    res.status(200).json({
      success: true,
      data: station
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to fetch station');
  }
};

// @desc    Update station
// @route   PUT /api/stations/:id
// @access  Private/Admin
exports.updateStation = async (req, res) => {
  try {
    // Add user ID as updater if authenticated
    if (req.user) {
      req.body.updatedBy = req.user.id;
      req.body.updatedAt = Date.now();
    }

    const station = await Station.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('manager', 'name email');

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    res.status(200).json({
      success: true,
      data: station
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to update station');
  }
};

// @desc    Delete station
// @route   DELETE /api/stations/:id
// @access  Private/Admin
exports.deleteStation = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    await station.remove();

    res.status(200).json({
      success: true,
      message: 'Station deleted successfully'
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to delete station');
  }
};

// @desc    Create multiple stations (batch import)
// @route   POST /api/stations/batch
// @access  Private/Admin
exports.createMultipleStations = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array of stations'
      });
    }

    const stationsToCreate = req.body.map(station => {
      // Generate unique station ID if not provided
      if (!station.stationId) {
        station.stationId = Station.generateStationId();
      }

      // Add user ID as creator if authenticated
      if (req.user) {
        station.createdBy = req.user.id;
        station.updatedBy = req.user.id;
      }

      return station;
    });

    const createdStations = await Station.insertMany(stationsToCreate, { 
      ordered: false // Continues insertion even if some documents fail
    });

    res.status(201).json({
      success: true,
      count: createdStations.length,
      data: createdStations
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to create stations in batch');
  }
};

// @desc    Get stations by status
// @route   GET /api/stations/status/:status
// @access  Private
exports.getStationsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    // Validate status is one of the enum values
    const validStatuses = ['Active', 'Inactive', 'Under Maintenance', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const stations = await Station.find({ status })
      .populate('manager', 'name email')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    errorHandler(res, error, 'Failed to fetch stations by status');
  }
};