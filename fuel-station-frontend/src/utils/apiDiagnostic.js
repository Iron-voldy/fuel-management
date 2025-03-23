// src/utils/apiDiagnostic.js
/**
 * Utility for diagnosing API connection issues
 */

// Function to test API connectivity with detailed logging
export const testApiConnection = async (apiEndpoint, options = {}) => {
    console.log(`Testing connection to: ${apiEndpoint}`);
    
    try {
      const startTime = performance.now();
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-auth-token': token } : {}),
        ...options.headers
      };
      
      // Make the request
      const response = await fetch(apiEndpoint, {
        method: options.method || 'GET',
        headers,
        ...options
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Log response details
      console.log(`Response status: ${response.status} ${response.statusText}`);
      console.log(`Response time: ${responseTime.toFixed(2)}ms`);
      
      // Try to parse the response as JSON
      try {
        const data = await response.json();
        console.log('Response data:', data);
        return { success: response.ok, data, status: response.status, responseTime };
      } catch (jsonError) {
        console.error('Error parsing response as JSON:', jsonError);
        const textResponse = await response.text();
        console.log('Response text:', textResponse);
        return { success: response.ok, text: textResponse, status: response.status, responseTime };
      }
    } catch (error) {
      console.error('Connection error:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Function to test the specific petty cash API endpoints
  export const testPettyCashApi = async (stationId = '') => {
    console.group('PettyCash API Diagnostics');
    
    // Test balance endpoint
    console.log('Testing balance endpoint...');
    const balanceResult = await testApiConnection(
      `http://localhost:5000/api/petty-cash/balance${stationId ? `/${stationId}` : ''}`
    );
    
    // Test transactions endpoint
    console.log('Testing transactions endpoint...');
    const transactionsResult = await testApiConnection(
      'http://localhost:5000/api/petty-cash?limit=10'
    );
    
    // Test summary endpoint
    console.log('Testing summary endpoint...');
    const summaryResult = await testApiConnection(
      'http://localhost:5000/api/petty-cash/summary'
    );
    
    console.groupEnd();
    
    return {
      balance: balanceResult,
      transactions: transactionsResult,
      summary: summaryResult
    };
  };
  
  export default {
    testApiConnection,
    testPettyCashApi
  };