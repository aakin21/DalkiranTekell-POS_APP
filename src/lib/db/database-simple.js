// Simplified database using localStorage for device config
// All data is fetched from backend API

// Device Configuration - stored in localStorage
export const deviceConfigRepo = {
  get() {
    const config = localStorage.getItem('device_config');
    if (!config) {
      return {
        id: 1,
        is_activated: 0,
        api_url: 'http://localhost:3000',
        device_id: null,
        store_id: null,
        store_name: null,
        cashier_id: null,
        cashier_name: null
      };
    }
    return JSON.parse(config);
  },

  update(data) {
    const current = this.get();
    const updated = {
      ...current,
      device_id: data.device_id || current.device_id,
      store_id: data.store_id || current.store_id,
      store_name: data.store_name || current.store_name,
      cashier_id: data.cashier_id || current.cashier_id,
      cashier_name: data.cashier_name || current.cashier_name,
      is_activated: data.is_activated !== undefined ? data.is_activated : current.is_activated,
      api_url: data.api_url || current.api_url
    };
    localStorage.setItem('device_config', JSON.stringify(updated));
    return updated;
  },

  activate(storeId, storeName, cashierId, cashierName) {
    const deviceId = 'DEVICE_' + Date.now();
    const updated = {
      id: 1,
      device_id: deviceId,
      store_id: storeId,
      store_name: storeName,
      cashier_id: cashierId,
      cashier_name: cashierName,
      is_activated: 1,
      api_url: this.get().api_url
    };
    localStorage.setItem('device_config', JSON.stringify(updated));
    return updated;
  },

  deactivate() {
    const updated = {
      id: 1,
      is_activated: 0,
      api_url: this.get().api_url,
      device_id: null,
      store_id: null,
      store_name: null,
      cashier_id: null,
      cashier_name: null
    };
    localStorage.setItem('device_config', JSON.stringify(updated));
    return updated;
  }
};

// All other repos are removed - data comes from backend API
// These are stub exports for compatibility
export const refundRepo = {
  getAll() { return []; },
  create(refund) { return 'stub-id'; }
};

export const auditLogRepo = {
  getAll() { return []; },
  create(log) { return 'stub-id'; }
};

export const stockAdjustmentRepo = {
  getAll() { return []; },
  create(adjustment) { return 'stub-id'; }
};

export function getDatabase() {
  console.log('Using localStorage-based config (no SQLite)');
  return null;
}
