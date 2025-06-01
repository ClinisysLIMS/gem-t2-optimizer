/**
 * Frontend Integration Helper for GEM Optimizer Backend API
 * 
 * This file provides JavaScript functions that can be used in the frontend
 * to interact with the GEM Optimizer Backend API.
 * 
 * Usage: Include this file in your frontend application and use the
 * GemOptimizerAPI class to interact with the backend.
 */

class GemOptimizerAPI {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request to the API
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Request body data (for POST/PUT)
   * @returns {Promise<Object>} API response
   */
  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  /**
   * Check if the API server is running
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return this.request('GET', '/health');
  }

  /**
   * Save a new jamboree configuration
   * @param {Object} jamboreeData - Complete jamboree configuration
   * @returns {Promise<Object>} Created jamboree with ID
   */
  async saveJamboree(jamboreeData) {
    return this.request('POST', '/api/jamboree', jamboreeData);
  }

  /**
   * Retrieve a specific jamboree configuration
   * @param {string} id - Jamboree ID
   * @returns {Promise<Object>} Jamboree configuration
   */
  async getJamboree(id) {
    return this.request('GET', `/api/jamboree/${id}`);
  }

  /**
   * List recent jamboree configurations
   * @param {number} limit - Number of results to return (default: 20)
   * @param {number} offset - Number of results to skip (default: 0)
   * @returns {Promise<Object>} Array of jamboree summaries
   */
  async listJamborees(limit = 20, offset = 0) {
    return this.request('GET', `/api/jamboree?limit=${limit}&offset=${offset}`);
  }

  /**
   * Update an existing jamboree configuration
   * @param {string} id - Jamboree ID
   * @param {Object} jamboreeData - Updated jamboree configuration
   * @returns {Promise<Object>} Updated jamboree
   */
  async updateJamboree(id, jamboreeData) {
    return this.request('PUT', `/api/jamboree/${id}`, jamboreeData);
  }

  /**
   * Delete a jamboree configuration
   * @param {string} id - Jamboree ID
   * @returns {Promise<Object>} Success confirmation
   */
  async deleteJamboree(id) {
    return this.request('DELETE', `/api/jamboree/${id}`);
  }

  /**
   * Generate a shareable link for a jamboree
   * @param {string} id - Jamboree ID
   * @returns {Promise<Object>} Share link and metadata
   */
  async createShareLink(id) {
    return this.request('POST', `/api/jamboree/${id}/share`);
  }

  /**
   * Access a shared jamboree configuration
   * @param {string} shareId - Share ID from the share link
   * @returns {Promise<Object>} Shared jamboree configuration
   */
  async getSharedJamboree(shareId) {
    return this.request('GET', `/api/share/${shareId}`);
  }
}

// Usage examples:

/**
 * Example: Save current jamboree configuration
 */
async function saveCurrentConfiguration() {
  const api = new GemOptimizerAPI();
  
  // Gather current configuration from your frontend state
  const currentConfig = {
    eventDetails: {
      name: "My Jamboree Event",
      date: "2024-08-15",
      location: "Local Park",
      type: "jamboree"
    },
    vehicleConfigurations: [
      // Add your vehicle configurations here
    ],
    controllerSettings: {
      // Add your controller settings here
    },
    weatherData: {
      // Add weather data here
    },
    terrainData: {
      // Add terrain data here
    },
    groupInfo: {
      // Add group information here
    }
  };

  try {
    const result = await api.saveJamboree(currentConfig);
    console.log('Configuration saved:', result.data.id);
    return result.data.id;
  } catch (error) {
    console.error('Failed to save configuration:', error);
    throw error;
  }
}

/**
 * Example: Load a saved configuration
 */
async function loadConfiguration(jamboreeId) {
  const api = new GemOptimizerAPI();
  
  try {
    const result = await api.getJamboree(jamboreeId);
    const config = result.data;
    
    // Apply the loaded configuration to your frontend state
    console.log('Configuration loaded:', config.eventDetails.name);
    return config;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    throw error;
  }
}

/**
 * Example: Create and share a configuration
 */
async function shareConfiguration(jamboreeId) {
  const api = new GemOptimizerAPI();
  
  try {
    const result = await api.createShareLink(jamboreeId);
    const shareUrl = result.data.shareUrl;
    
    // Show share URL to user (copy to clipboard, show modal, etc.)
    console.log('Share URL:', shareUrl);
    return shareUrl;
  } catch (error) {
    console.error('Failed to create share link:', error);
    throw error;
  }
}

/**
 * Example: List recent configurations for a "Load" dialog
 */
async function showLoadDialog() {
  const api = new GemOptimizerAPI();
  
  try {
    const result = await api.listJamborees(10, 0);
    const jamborees = result.data;
    
    // Display jamborees in a dialog or list component
    jamborees.forEach(jamboree => {
      console.log(`${jamboree.eventDetails.name} (${jamboree.createdAt})`);
    });
    
    return jamborees;
  } catch (error) {
    console.error('Failed to load jamboree list:', error);
    throw error;
  }
}

// Export for use in frontend applications
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GemOptimizerAPI };
}

// Global variable for browser usage
if (typeof window !== 'undefined') {
  window.GemOptimizerAPI = GemOptimizerAPI;
}