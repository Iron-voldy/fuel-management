const { validationResult } = require('express-validator');
const FuelInventory = require('../models/FuelInventory');
const Sales = require('../models/Sales');

/**
 * @desc    Get all fuel inventory items
 * @route   GET /api/inventory
 * @access  Private
 */
exports.getAllInventory = async (req, res) => {
  try {
    const { stationId, fuelType, status } = req.query;

    // Build filter object
    const filter = {};
    
    if (stationId) {
      filter.stationId = stationId;
    }
    
    if (fuelType) {
      filter.fuelType = fuelType;
    }
    
    if (status) {
      filter.status = status;
    }

    const inventory = await FuelInventory.find(filter).sort({ fuelType: 1 });

    // Calculate total inventory value
    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.currentVolume * item.costPrice);
    }, 0);

    res.json({
      success: true,
      count: inventory.length,
      totalValue,
      data: inventory
    });
  } catch (err) {
    console.error('Error fetching inventory:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get a single inventory item
 * @route   GET /api/inventory/:id
 * @access  Private
 */
exports.getInventoryById = async (req, res) => {
  try {
    const inventory = await FuelInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (err) {
    console.error('Error fetching inventory item:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Create new inventory item
 * @route   POST /api/inventory
 * @access  Private (Admin/Manager)
 */
exports.createInventory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Check if tank already exists for the station
    const existingTank = await FuelInventory.findOne({
      stationId: req.body.stationId,
      tankId: req.body.tankId
    });

    if (existingTank) {
      return res.status(400).json({
        success: false,
        error: 'Tank ID already exists for this station'
      });
    }

    // Create new inventory record
    const inventory = new FuelInventory(req.body);

    // Add initial stock history entry if there's initial stock
    if (req.body.currentVolume > 0) {
      inventory.stockHistory.push({
        date: new Date(),
        type: 'Purchase',
        volume: req.body.currentVolume,
        costPrice: req.body.costPrice,
        reference: 'Initial Stock',
        notes: 'Initial inventory setup'
      });
    }

    // Add initial price history entry
    inventory.priceHistory.push({
      date: new Date(),
      newPrice: req.body.sellingPrice,
      reason: 'Initial Price Setup'
    });

    await inventory.save();

    res.status(201).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    console.error('Error creating inventory item:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Update inventory item
 * @route   PUT /api/inventory/:id
 * @access  Private (Admin/Manager)
 */
exports.updateInventory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    let inventory = await FuelInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Check if selling price changed
    if (req.body.sellingPrice && req.body.sellingPrice !== inventory.sellingPrice) {
      // Add price history entry
      inventory.priceHistory.push({
        date: new Date(),
        oldPrice: inventory.sellingPrice,
        newPrice: req.body.sellingPrice,
        reason: req.body.priceChangeReason || 'Price Update'
      });
    }

    // Update fields
    const allowedUpdates = [
      'tankCapacity', 
      'sellingPrice', 
      'reorderLevel', 
      'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        inventory[field] = req.body[field];
      }
    });

    inventory.updatedAt = Date.now();

    await inventory.save();

    res.json({
      success: true,
      data: inventory
    });
  } catch (err) {
    console.error('Error updating inventory item:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Add stock to inventory
 * @route   POST /api/inventory/:id/add-stock
 * @access  Private (Admin/Manager)
 */
exports.addStock = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { volume, costPrice, reference, notes } = req.body;

    const inventory = await FuelInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Check volume
    if (volume <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Volume must be greater than 0'
      });
    }

    // Check cost price
    if (costPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cost price must be greater than 0'
      });
    }

    // Check if new total exceeds tank capacity
    if (inventory.currentVolume + volume > inventory.tankCapacity) {
      return res.status(400).json({
        success: false,
        error: 'Adding this volume would exceed tank capacity',
        currentVolume: inventory.currentVolume,
        tankCapacity: inventory.tankCapacity,
        volumeToAdd: volume,
        maxAllowedToAdd: inventory.tankCapacity - inventory.currentVolume
      });
    }

    // Add stock using the model method
    await inventory.addStock(volume, costPrice, reference, notes);

    res.json({
      success: true,
      message: `Successfully added ${volume} units of ${inventory.fuelType} to tank ${inventory.tankId}`,
      data: inventory
    });
  } catch (err) {
    console.error('Error adding stock:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Reduce stock manually
 * @route   POST /api/inventory/:id/reduce-stock
 * @access  Private (Admin/Manager)
 */
exports.reduceStock = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { volume, reason, notes } = req.body;

    const inventory = await FuelInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Check volume
    if (volume <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Volume must be greater than 0'
      });
    }

    // Check if there's enough stock
    if (volume > inventory.currentVolume) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        currentVolume: inventory.currentVolume,
        requestedVolume: volume
      });
    }

    // Reduce stock using the model method
    await inventory.reduceStock(volume, reason || 'Manual Adjustment', notes);

    res.json({
      success: true,
      message: `Successfully reduced ${volume} units of ${inventory.fuelType} from tank ${inventory.tankId}`,
      data: inventory
    });
  } catch (err) {
    console.error('Error reducing stock:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Update fuel price
 * @route   POST /api/inventory/:id/update-price
 * @access  Private (Admin/Manager)
 */
exports.updatePrice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { newPrice, reason } = req.body;

    const inventory = await FuelInventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Check price
    if (newPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be greater than 0'
      });
    }

    // Update price using the model method
    await inventory.updatePrice(newPrice, reason);

    res.json({
      success: true,
      message: `Successfully updated ${inventory.fuelType} price from ${inventory.priceHistory[inventory.priceHistory.length - 2].oldPrice} to ${newPrice}`,
      data: inventory
    });
  } catch (err) {
    console.error('Error updating price:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get inventory valuation report
 * @route   GET /api/inventory/valuation
 * @access  Private (Admin/Manager/Accountant)
 */
exports.getValuationReport = async (req, res) => {
  try {
    const { stationId } = req.query;

    // Build filter object
    const filter = {};
    
    if (stationId) {
      filter.stationId = stationId;
    }

    const inventory = await FuelInventory.find(filter);

    // Calculate valuation for each fuel type
    const valuationByFuelType = {};
    
    inventory.forEach(item => {
      if (!valuationByFuelType[item.fuelType]) {
        valuationByFuelType[item.fuelType] = {
          fuelType: item.fuelType,
          totalVolume: 0,
          averageCostPrice: 0,
          totalCostValue: 0,
          averageSellingPrice: 0,
          totalMarketValue: 0,
          potentialProfit: 0,
          tanks: []
        };
      }
      
      const tankValue = item.currentVolume * item.costPrice;
      const tankMarketValue = item.currentVolume * item.sellingPrice;
      
      valuationByFuelType[item.fuelType].totalVolume += item.currentVolume;
      valuationByFuelType[item.fuelType].totalCostValue += tankValue;
      valuationByFuelType[item.fuelType].totalMarketValue += tankMarketValue;
      
      valuationByFuelType[item.fuelType].tanks.push({
        tankId: item.tankId,
        volume: item.currentVolume,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        costValue: tankValue,
        marketValue: tankMarketValue
      });
    });
    
    // Calculate averages and potential profit
    Object.values(valuationByFuelType).forEach(fuelType => {
      if (fuelType.totalVolume > 0) {
        fuelType.averageCostPrice = fuelType.totalCostValue / fuelType.totalVolume;
        fuelType.averageSellingPrice = fuelType.totalMarketValue / fuelType.totalVolume;
      }
      
      fuelType.potentialProfit = fuelType.totalMarketValue - fuelType.totalCostValue;
    });

    // Calculate totals
    const totalVolume = Object.values(valuationByFuelType).reduce((sum, item) => sum + item.totalVolume, 0);
    const totalCostValue = Object.values(valuationByFuelType).reduce((sum, item) => sum + item.totalCostValue, 0);
    const totalMarketValue = Object.values(valuationByFuelType).reduce((sum, item) => sum + item.totalMarketValue, 0);
    const totalPotentialProfit = Object.values(valuationByFuelType).reduce((sum, item) => sum + item.potentialProfit, 0);

    res.json({
      success: true,
      data: {
        valuationDate: new Date(),
        valuationByFuelType: Object.values(valuationByFuelType),
        summary: {
          totalVolume,
          totalCostValue,
          totalMarketValue,
          totalPotentialProfit,
          potentialProfitMargin: totalMarketValue > 0 ? (totalPotentialProfit / totalMarketValue) * 100 : 0
        }
      }
    });
  } catch (err) {
    console.error('Error generating inventory valuation report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get inventory status report
 * @route   GET /api/inventory/status
 * @access  Private
 */
exports.getStatusReport = async (req, res) => {
  try {
    const { stationId } = req.query;

    // Build filter object
    const filter = {};
    
    if (stationId) {
      filter.stationId = stationId;
    }

    const inventory = await FuelInventory.find(filter);

    // Group by status
    const statusSummary = {
      Normal: 0,
      Low: 0,
      Critical: 0,
      Replenishing: 0
    };
    
    const lowStockItems = [];
    const criticalStockItems = [];
    
    inventory.forEach(item => {
      statusSummary[item.status]++;
      
      if (item.status === 'Low') {
        lowStockItems.push({
          id: item._id,
          stationId: item.stationId,
          fuelType: item.fuelType,
          tankId: item.tankId,
          currentVolume: item.currentVolume,
          reorderLevel: item.reorderLevel,
          tankCapacity: item.tankCapacity,
          percentageFull: (item.currentVolume / item.tankCapacity) * 100,
          daysRemaining: estimateDaysRemaining(item)
        });
      } else if (item.status === 'Critical') {
        criticalStockItems.push({
          id: item._id,
          stationId: item.stationId,
          fuelType: item.fuelType,
          tankId: item.tankId,
          currentVolume: item.currentVolume,
          reorderLevel: item.reorderLevel,
          tankCapacity: item.tankCapacity,
          percentageFull: (item.currentVolume / item.tankCapacity) * 100,
          daysRemaining: estimateDaysRemaining(item)
        });
      }
    });

    res.json({
      success: true,
      data: {
        reportDate: new Date(),
        statusSummary,
        lowStockItems,
        criticalStockItems,
        normalItems: statusSummary.Normal,
        totalTanks: inventory.length
      }
    });
  } catch (err) {
    console.error('Error generating inventory status report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get inventory movement report
 * @route   GET /api/inventory/movement
 * @access  Private (Admin/Manager/Accountant)
 */
exports.getMovementReport = async (req, res) => {
  try {
    const { stationId, fuelType, startDate, endDate } = req.query;

    // Set date range
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // Build filter object
    const filter = {};
    
    if (stationId) {
      filter.stationId = stationId;
    }
    
    if (fuelType) {
      filter.fuelType = fuelType;
    }

    const inventory = await FuelInventory.find(filter);

    // Extract movement data from stock history
    const movementData = [];
    
    inventory.forEach(item => {
      // Filter stock history entries within date range
      const relevantHistory = item.stockHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
      
      // Group by type
      const movements = {
        purchases: 0,
        sales: 0,
        adjustments: 0,
        losses: 0
      };
      
      relevantHistory.forEach(entry => {
        if (entry.type === 'Purchase') {
          movements.purchases += entry.volume;
        } else if (entry.type === 'Sale') {
          movements.sales += Math.abs(entry.volume);
        } else if (entry.type === 'Adjustment') {
          movements.adjustments += Math.abs(entry.volume);
        } else if (entry.type === 'Loss') {
          movements.losses += Math.abs(entry.volume);
        }
      });
      
      movementData.push({
        stationId: item.stationId,
        fuelType: item.fuelType,
        tankId: item.tankId,
        movements,
        netMovement: movements.purchases - movements.sales - movements.adjustments - movements.losses
      });
    });

    // Calculate totals
    const totalMovements = {
      purchases: movementData.reduce((sum, item) => sum + item.movements.purchases, 0),
      sales: movementData.reduce((sum, item) => sum + item.movements.sales, 0),
      adjustments: movementData.reduce((sum, item) => sum + item.movements.adjustments, 0),
      losses: movementData.reduce((sum, item) => sum + item.movements.losses, 0)
    };
    
    const totalNetMovement = totalMovements.purchases - totalMovements.sales - totalMovements.adjustments - totalMovements.losses;

    res.json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end
        },
        movementData,
        summary: {
          totalMovements,
          totalNetMovement
        }
      }
    });
  } catch (err) {
    console.error('Error generating inventory movement report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Reconcile inventory with sales
 * @route   POST /api/inventory/reconcile
 * @access  Private (Admin/Manager)
 */
exports.reconcileInventory = async (req, res) => {
  try {
    const { stationId, startDate, endDate } = req.body;

    if (!stationId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Station ID, start date, and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get inventory for the station
    const inventoryItems = await FuelInventory.find({ stationId });

    // Get sales for the station and date range
    const sales = await Sales.find({
      stationId,
      date: { $gte: start, $lte: end }
    });

    // Group sales by fuel type
    const salesByFuelType = {};
    
    sales.forEach(sale => {
      if (!salesByFuelType[sale.fuelType]) {
        salesByFuelType[sale.fuelType] = {
          quantity: 0,
          amount: 0
        };
      }
      
      salesByFuelType[sale.fuelType].quantity += sale.quantity;
      salesByFuelType[sale.fuelType].amount += sale.totalAmount;
    });

    // Prepare reconciliation report
    const reconciliationReport = [];
    
    inventoryItems.forEach(item => {
      // Extract movement data from stock history
      const stockHistory = item.stockHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
      
      const salesVolume = salesByFuelType[item.fuelType]?.quantity || 0;
      
      // Calculate stock movement from history
      const stockReductions = stockHistory
        .filter(entry => entry.volume < 0)
        .reduce((sum, entry) => sum + Math.abs(entry.volume), 0);
      
      // Calculate discrepancy
      const discrepancy = stockReductions - salesVolume;
      const discrepancyPercentage = salesVolume > 0 ? (discrepancy / salesVolume) * 100 : 0;
      
      reconciliationReport.push({
        stationId: item.stationId,
        fuelType: item.fuelType,
        tankId: item.tankId,
        salesRecord: {
          volume: salesVolume,
          amount: salesByFuelType[item.fuelType]?.amount || 0
        },
        stockReduction: stockReductions,
        discrepancy,
        discrepancyPercentage,
        isWithinTolerance: Math.abs(discrepancyPercentage) <= 2, // 2% tolerance
        reconciliationDate: new Date()
      });
    });

    res.json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end
        },
        stationId,
        reconciliationReport,
        summary: {
          totalSalesVolume: Object.values(salesByFuelType).reduce((sum, item) => sum + item.quantity, 0),
          totalStockReduction: reconciliationReport.reduce((sum, item) => sum + item.stockReduction, 0),
          totalDiscrepancy: reconciliationReport.reduce((sum, item) => sum + item.discrepancy, 0)
        }
      }
    });
  } catch (err) {
    console.error('Error reconciling inventory:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Helper function to estimate days until stock depletion
function estimateDaysRemaining(inventoryItem) {
  // Default to 30 days if no sales data or very low sales
  const defaultDays = 30;
  
  // Calculate average daily consumption based on last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const salesHistory = inventoryItem.stockHistory.filter(entry => {
    return entry.type === 'Sale' && new Date(entry.date) >= thirtyDaysAgo;
  });
  
  if (salesHistory.length === 0) {
    return defaultDays;
  }
  
  const totalSales = salesHistory.reduce((sum, entry) => sum + Math.abs(entry.volume), 0);
  const avgDailySales = totalSales / 30;
  
  if (avgDailySales <= 0) {
    return defaultDays;
  }
  
  // Calculate days remaining
  const daysRemaining = inventoryItem.currentVolume / avgDailySales;
  
  return Math.round(daysRemaining);
}