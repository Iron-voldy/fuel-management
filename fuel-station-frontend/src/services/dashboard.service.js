// src/services/dashboard.service.js
import api from './api';

/**
 * Service for handling dashboard-related API calls with error handling
 */
const DashboardService = {
  /**
   * Get financial summary for dashboard
   * @param {Object} params - Query parameters (period, stationId, startDate, endDate)
   * @returns {Promise} - Promise with dashboard data
   */
  getFinancialSummary: async (params = {}) => {
    try {
      const response = await api.get('/dashboard/financial-summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      // Return fallback data structure when API call fails
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch dashboard data',
        data: {
          period: {
            name: params.period || 'month',
            startDate: params.startDate || new Date(),
            endDate: params.endDate || new Date()
          },
          salesSummary: {
            totalSales: 0,
            totalQuantity: 0,
            salesCount: 0,
            averageSaleAmount: 0
          },
          topSellingFuels: [],
          expenseSummary: {
            totalExpenses: 0,
            expenseCount: 0,
            averageExpenseAmount: 0
          },
          topExpenseCategories: [],
          profitSummary: {
            revenue: 0,
            expenses: 0,
            grossProfit: 0,
            profitMargin: 0
          },
          cashPosition: {
            bankAccounts: [],
            totalBankBalance: 0,
            pettyCash: [],
            totalPettyCash: 0,
            totalCashPosition: 0
          },
          financialRatios: {
            profitability: {
              grossProfitMargin: 0,
              operatingExpenseRatio: 0
            }
          },
          performanceMetrics: {
            currentPeriod: {
              revenue: 0,
              expenses: 0,
              profit: 0,
              profitMargin: 0
            },
            previousPeriod: {
              revenue: 0,
              expenses: 0,
              profit: 0,
              profitMargin: 0
            },
            changes: {
              revenueChange: 0,
              expenseChange: 0,
              profitChange: 0
            }
          },
          staffMetrics: {
            employeeCount: 0,
            payroll: {
              totalBasicSalary: 0,
              totalAllowances: 0,
              totalSalaryExpense: 0
            },
            loans: {
              activeLoansCount: 0,
              totalOutstandingAmount: 0
            }
          },
          recentActivity: {
            sales: [],
            expenses: []
          }
        }
      };
    }
  },

  /**
   * Get profit and loss statement
   * @param {Object} params - Query parameters (period, stationId, startDate, endDate)
   * @returns {Promise} - Promise with profit/loss data
   */
  getProfitLossStatement: async (params = {}) => {
    try {
      const response = await api.get('/dashboard/profit-loss', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching profit & loss statement:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch profit & loss data',
        data: {
          period: {
            name: params.period || 'month',
            startDate: params.startDate || new Date(),
            endDate: params.endDate || new Date()
          },
          revenue: {
            totalRevenue: 0,
            salesByFuelType: []
          },
          expenses: {
            totalExpenses: 0,
            expensesByCategory: []
          },
          summary: {
            grossProfit: 0,
            grossMargin: 0,
            netProfit: 0,
            netProfitMargin: 0
          },
          trends: []
        }
      };
    }
  },

  /**
   * Get cash flow statement
   * @param {Object} params - Query parameters (period, stationId, startDate, endDate)
   * @returns {Promise} - Promise with cash flow data
   */
  getCashFlowStatement: async (params = {}) => {
    try {
      const response = await api.get('/dashboard/cash-flow', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching cash flow statement:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch cash flow data',
        data: {
          period: {
            name: params.period || 'month',
            startDate: params.startDate || new Date(),
            endDate: params.endDate || new Date()
          },
          initialCashBalance: 0,
          operatingActivities: {
            inflows: [],
            totalInflows: 0,
            outflows: [],
            totalOutflows: 0,
            netCashFlow: 0
          },
          investingActivities: {
            inflows: [],
            totalInflows: 0,
            outflows: [],
            totalOutflows: 0,
            netCashFlow: 0
          },
          financingActivities: {
            inflows: [],
            totalInflows: 0,
            outflows: [],
            totalOutflows: 0,
            netCashFlow: 0
          },
          summary: {
            netOperatingCashFlow: 0,
            netInvestingCashFlow: 0,
            netFinancingCashFlow: 0,
            netCashFlow: 0,
            endingCashBalance: 0
          },
          trends: []
        }
      };
    }
  },

  /**
   * Get fuel price analysis
   * @param {Object} params - Query parameters (period, fuelType, startDate, endDate)
   * @returns {Promise} - Promise with fuel price analysis data
   */
  getFuelPriceAnalysis: async (params = {}) => {
    try {
      const response = await api.get('/dashboard/fuel-price-analysis', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching fuel price analysis:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch fuel price analysis',
        data: {
          period: {
            name: params.period || 'month',
            startDate: params.startDate || new Date(),
            endDate: params.endDate || new Date()
          },
          fuelPriceAnalysis: {},
          summary: {
            totalSales: 0,
            totalProfit: 0,
            totalQuantity: 0,
            averageProfitMargin: 0
          }
        }
      };
    }
  }
};

export default DashboardService;