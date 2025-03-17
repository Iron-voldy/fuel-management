const moment = require('moment');
const PettyCash = require('../models/PettyCash');
const PettyCashBalance = require('../models/PettyCashBalance');
const pettyCashUtils = require('../utils/pettyCashUtils');

/**
 * Generate petty cash transaction report
 * @param {Object} reportOptions - Report options
 * @returns {Object} - Petty cash transaction report
 */
exports.generateTransactionReport = async (reportOptions) => {
  try {
    const {
      stationId,
      startDate,
      endDate,
      transactionType,
      category,
      format = 'json'
    } = reportOptions;

    // Build query
    const query = {
      approvalStatus: 'Approved',
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (stationId) {
      query.stationId = stationId;
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (category) {
      query.category = category;
    }

    // Get transactions
    const transactions = await PettyCash.find(query)
      .sort({ date: 1 })
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    // Generate the ledger report
    const ledgerReport = await pettyCashUtils.generatePettyCashLedger(stationId, startDate, endDate);

    // Format transactions for the report
    const formattedTransactions = transactions.map(transaction => ({
      transactionId: transaction.transactionId,
      date: moment(transaction.date).format('YYYY-MM-DD HH:mm'),
      type: transaction.transactionType,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      requestedBy: transaction.requestedBy ? transaction.requestedBy.name : 'Unknown',
      approvedBy: transaction.approvedBy ? transaction.approvedBy.name : 'Unknown',
      hasReceipt: !!transaction.receiptUrl
    }));

    // Group by category for statistics
    const statsByCategory = {};
    transactions.forEach(transaction => {
      if (!statsByCategory[transaction.category]) {
        statsByCategory[transaction.category] = {
          count: 0,
          totalAmount: 0
        };
      }

      statsByCategory[transaction.category].count += 1;
      statsByCategory[transaction.category].totalAmount += transaction.amount;
    });

    // Format the report based on format requested
    switch (format) {
      case 'csv':
        // Generate CSV format
        const csvHeader = 'Transaction ID,Date,Type,Category,Description,Amount,Requested By,Approved By,Has Receipt\n';
        const csvRows = formattedTransactions.map(tx =>
          `${tx.transactionId},${tx.date},${tx.type},${tx.category},"${tx.description.replace(/"/g, '""')}",${tx.amount},${tx.requestedBy},${tx.approvedBy},${tx.hasReceipt}`
        ).join('\n');
        
        return {
          format: 'csv',
          content: csvHeader + csvRows
        };

      case 'pdf':
        // Return data formatted for PDF generation
        return {
          format: 'pdf',
          title: 'Petty Cash Transaction Report',
          period: `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}`,
          summary: ledgerReport.summary,
          transactions: formattedTransactions,
          statistics: statsByCategory,
          generatedAt: new Date()
        };

      case 'json':
      default:
        // Return JSON data
        return {
          reportType: 'Petty Cash Transaction Report',
          period: {
            startDate,
            endDate
          },
          stationId,
          generatedAt: new Date(),
          summary: ledgerReport.summary,
          transactions: formattedTransactions,
          statistics: {
            byCategory: statsByCategory,
            totalCount: transactions.length,
            totalWithdrawalAmount: transactions
              .filter(tx => tx.transactionType === 'withdrawal')
              .reduce((sum, tx) => sum + tx.amount, 0),
            totalReplenishmentAmount: transactions
              .filter(tx => tx.transactionType === 'replenishment')
              .reduce((sum, tx) => sum + tx.amount, 0)
          }
        };
    }
  } catch (error) {
    console.error('Error generating petty cash transaction report:', error);
    throw error;
  }
};

/**
 * Generate petty cash balance report
 * @param {String} reportDate - Date to generate report for
 * @returns {Object} - Petty cash balance report
 */
exports.generateBalanceReport = async (reportDate = new Date()) => {
  try {
    // Get all station balances
    const balances = await PettyCashBalance.find();

    // Format the report data
    const stationBalances = await Promise.all(balances.map(async (balance) => {
      // Get last 5 transactions for the station
      const recentTransactions = await PettyCash.find({
        stationId: balance.stationId,
        approvalStatus: 'Approved'
      })
        .sort({ date: -1 })
        .limit(5)
        .populate('requestedBy', 'name')
        .populate('approvedBy', 'name');

      // Get pending withdrawals
      const pendingWithdrawals = await PettyCash.find({
        stationId: balance.stationId,
        approvalStatus: 'Pending',
        transactionType: 'withdrawal'
      }).sort({ date: 1 });

      const totalPendingAmount = pendingWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);

      return {
        stationId: balance.stationId,
        currentBalance: balance.currentBalance,
        maxLimit: balance.maxLimit,
        minLimit: balance.minLimit,
        needsReplenishment: balance.currentBalance < balance.minLimit,
        lastReplenishmentDate: balance.lastReplenishmentDate,
        lastReplenishmentAmount: balance.lastReplenishmentAmount,
        recentTransactions: recentTransactions.map(tx => ({
          transactionId: tx.transactionId,
          date: moment(tx.date).format('YYYY-MM-DD HH:mm'),
          type: tx.transactionType,
          amount: tx.amount,
          description: tx.description
        })),
        pendingWithdrawals: {
          count: pendingWithdrawals.length,
          amount: totalPendingAmount
        }
      };
    }));

    // Calculate totals
    const totalCurrentBalance = stationBalances.reduce((sum, station) => sum + station.currentBalance, 0);
    const stationsNeedingReplenishment = stationBalances.filter(station => station.needsReplenishment);

    return {
      reportType: 'Petty Cash Balance Report',
      reportDate: reportDate,
      generatedAt: new Date(),
      summary: {
        totalStations: stationBalances.length,
        totalCurrentBalance,
        stationsNeedingReplenishment: stationsNeedingReplenishment.length,
        totalReplenishmentNeeded: stationsNeedingReplenishment.reduce(
          (sum, station) => sum + (station.minLimit - station.currentBalance), 0
        )
      },
      stationBalances
    };
  } catch (error) {
    console.error('Error generating petty cash balance report:', error);
    throw error;
  }
};

/**
 * Generate petty cash replenishment recommendation report
 * @returns {Object} - Petty cash replenishment recommendation report
 */
exports.generateReplenishmentRecommendationReport = async () => {
  try {
    // Use the utility function to check replenishment needs
    const replenishmentNeeds = await pettyCashUtils.checkReplenishmentNeeds();

    // If no replenishment needed, return basic report
    if (!replenishmentNeeds.needsReplenishment) {
      return {
        reportType: 'Petty Cash Replenishment Recommendation',
        generatedAt: new Date(),
        needsReplenishment: false,
        message: 'All stations have sufficient petty cash balance.'
      };
    }

    // Get historical spending data to provide context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stationReports = await Promise.all(replenishmentNeeds.stations.map(async (station) => {
      // Get recent withdrawals for the station
      const recentWithdrawals = await PettyCash.find({
        stationId: station.stationId,
        approvalStatus: 'Approved',
        transactionType: 'withdrawal',
        date: { $gte: thirtyDaysAgo }
      });

      const totalWithdrawalAmount = recentWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);
      const avgDailyWithdrawal = totalWithdrawalAmount / 30;

      // Calculate days until depletion based on average spending
      const daysUntilDepletion = station.currentBalance > 0 && avgDailyWithdrawal > 0
        ? Math.floor(station.currentBalance / avgDailyWithdrawal)
        : 0;

      return {
        ...station,
        recentActivity: {
          withdrawalCount: recentWithdrawals.length,
          totalWithdrawalAmount,
          avgDailyWithdrawal,
          daysUntilDepletion
        }
      };
    }));

    // Format the final report
    return {
      reportType: 'Petty Cash Replenishment Recommendation',
      generatedAt: new Date(),
      needsReplenishment: true,
      summary: {
        stationsNeedingReplenishment: replenishmentNeeds.stations.length,
        totalReplenishmentNeeded: replenishmentNeeds.totalReplenishmentNeeded,
        urgentStations: stationReports.filter(station => station.recentActivity.daysUntilDepletion <= 3).length
      },
      stationReports: stationReports.sort((a, b) => a.recentActivity.daysUntilDepletion - b.recentActivity.daysUntilDepletion)
    };
  } catch (error) {
    console.error('Error generating replenishment recommendation report:', error);
    throw error;
  }
};