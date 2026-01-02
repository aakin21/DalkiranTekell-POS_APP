import { syncApi, checkConnection } from '../api/client.js';
import {
  deviceConfigRepo,
  saleRepo,
  productRepo,
  categoryRepo,
  stockRepo,
  syncQueueRepo
} from '../db/database.js';

let syncInterval = null;
let isSyncing = false;

export function startAutoSync(intervalMs = 120000) {
  // Start sync every 2 minutes
  if (syncInterval) {
    stopAutoSync();
  }

  syncInterval = setInterval(() => {
    performSync();
  }, intervalMs);

  // Initial sync
  performSync();
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function performSync() {
  if (isSyncing) {
    console.log('Sync already in progress, skipping...');
    return;
  }

  try {
    isSyncing = true;

    const isOnline = await checkConnection();
    if (!isOnline) {
      console.log('Offline - skipping sync');
      return { success: false, message: 'Offline' };
    }

    const config = deviceConfigRepo.get();
    if (!config || !config.is_activated) {
      console.log('Device not activated - skipping sync');
      return { success: false, message: 'Not activated' };
    }

    // Push: Local -> Central
    await pushLocalData(config.device_id);

    // Pull: Central -> Local
    await pullCentralData(config.device_id, config.last_sync_at);

    // Update last sync time
    deviceConfigRepo.updateLastSync();

    console.log('Sync completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  } finally {
    isSyncing = false;
  }
}

async function pushLocalData(deviceId) {
  // Get all unsynced operations from queue
  const pendingItems = syncQueueRepo.getPending();

  if (pendingItems.length === 0) {
    console.log('No unsynced data to push');
    return;
  }

  console.log(`Pushing ${pendingItems.length} operations to server...`);

  try {
    // Group operations by type
    const syncData = {
      device_id: deviceId,
      operations: pendingItems.map(item => ({
        id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        operation: item.operation,
        data: JSON.parse(item.data)
      }))
    };

    const result = await syncApi.pushData(syncData);

    // Mark successfully synced operations
    if (result.synced_ids && result.synced_ids.length > 0) {
      for (const id of result.synced_ids) {
        syncQueueRepo.markSynced(id);
      }
      console.log(`✅ ${result.synced_ids.length} operations synced`);
    }

    // Clean up old synced items
    syncQueueRepo.clear();

    return result;
  } catch (error) {
    console.error('Push sync failed:', error);
    // Don't throw - let offline operations accumulate
    return { success: false, error: error.message };
  }
}

async function pullCentralData(deviceId, lastSyncAt) {
  try {
    const data = await syncApi.pullData(deviceId, lastSyncAt);

    // Update categories first (products depend on them)
    if (data.categories && data.categories.length > 0) {
      for (const category of data.categories) {
        categoryRepo.upsert(category);
      }
      console.log(`✅ ${data.categories.length} kategoriler senkronize edildi`);
    }

    // Update products
    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        productRepo.upsert(product);
      }
      console.log(`✅ ${data.products.length} ürün senkronize edildi`);
    }

    // Update stocks
    if (data.stocks && data.stocks.length > 0) {
      for (const stock of data.stocks) {
        stockRepo.updateQuantity(stock.product_id, stock.quantity);
      }
      console.log(`✅ ${data.stocks.length} stok kaydı senkronize edildi`);
    }

    console.log('✅ Merkez verisi çekildi');
    return data;
  } catch (error) {
    console.error('❌ Pull sync failed:', error);
    // Don't throw - allow offline operation
    return null;
  }
}
