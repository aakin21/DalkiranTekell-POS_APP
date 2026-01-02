import axios from 'axios';
import { deviceConfigRepo } from '../db/database.js';

let apiClient = null;
let authToken = null;

export function getApiClient() {
  if (!apiClient) {
    const config = deviceConfigRepo.get();
    const apiUrl = config?.api_url || 'http://localhost:3000';

    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    apiClient.interceptors.request.use((config) => {
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }
      return config;
    });

    // Response interceptor for error handling
    apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
          console.log('Network error - working offline');
        }
        return Promise.reject(error);
      }
    );
  }

  return apiClient;
}

export function setAuthToken(token) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

// Auth APIs
export const authApi = {
  async login(username, password) {
    const client = getApiClient();
    const response = await client.post('/auth/login', { username, password });
    setAuthToken(response.data.access_token);
    return response.data;
  },
};

// Device APIs
export const deviceApi = {
  async activate(activationCode) {
    const client = getApiClient();
    const response = await client.post('/devices/activate', {
      activation_code: activationCode,
    });
    return response.data;
  },
};

// Sync APIs
export const syncApi = {
  async pushData(data) {
    const client = getApiClient();
    try {
      const response = await client.post('/sync/push', data);
      return response.data;
    } catch (error) {
      console.error('Push sync error:', error);
      throw error;
    }
  },

  async pullData(deviceId, lastSyncAt) {
    const client = getApiClient();
    try {
      const response = await client.post('/sync/pull', {
        device_id: deviceId,
        last_sync_at: lastSyncAt,
      });
      return response.data;
    } catch (error) {
      console.error('Pull sync error:', error);
      throw error;
    }
  },
};

// Store APIs
export const storeApi = {
  async getAllStores() {
    const client = getApiClient();
    try {
      const response = await client.get('/stores');
      return response.data;
    } catch (error) {
      console.error('Get stores error:', error);
      throw error;
    }
  },

  async getStoreById(storeId) {
    const client = getApiClient();
    try {
      const response = await client.get(`/stores/${storeId}`);
      return response.data;
    } catch (error) {
      console.error('Get store error:', error);
      throw error;
    }
  },

  async getStoreStats(storeId) {
    const client = getApiClient();
    try {
      const response = await client.get(`/stores/${storeId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Get store stats error:', error);
      throw error;
    }
  },
};

// Check if online
export async function checkConnection() {
  try {
    const client = getApiClient();
    await client.get('/auth/login', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}
