import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';

let db = null;
let currentUserRole = null;

// Set current user (call this after login)
export function setCurrentUser(userObj) {
  currentUserRole = userObj?.role || null;
}

// Permission helper
function requireAdmin() {
  if (currentUserRole !== 'admin') {
    throw new Error('Bu işlem için yönetici yetkisi gerekiyor');
  }
}

// Initialize database
export async function initDatabase() {
  if (db) return db;

  try {
    console.log('🔄 Database module:', Database);
    console.log('🔄 Database.load function:', Database.load);

    if (!Database || typeof Database.load !== 'function') {
      throw new Error('❌ @tauri-apps/plugin-sql not properly loaded!');
    }

    console.log('🔄 Calling Database.load("sqlite:pos.db")...');
    db = await Database.load('sqlite:pos.db');
    console.log('✅ Database loaded:', db);

    // Enable WAL mode
    await db.execute('PRAGMA journal_mode = WAL');
    console.log('✅ WAL mode enabled');

    // Create tables
    await createTables();
    console.log('✅ Tables ready');

    // Run migrations
    await runMigrations();
    console.log('✅ Migrations completed');

    return db;
  } catch (error) {
    console.error('❌ Database init error');
    console.error('Error type:', typeof error);
    console.error('Error object:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error string:', String(error));

    const errorMsg = error?.message || error?.toString() || 'Unknown database error';
    throw new Error('Database initialization failed: ' + errorMsg);
  }
}

async function createTables() {
  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      store_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Categories table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    )
  `);

  // Products table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_id TEXT,
      purchase_price REAL NOT NULL,
      sale_price REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Stocks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL UNIQUE,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 5,
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Shifts table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      opening_cash REAL NOT NULL,
      closing_cash REAL,
      total_sales REAL DEFAULT 0,
      total_refunds REAL DEFAULT 0,
      is_open INTEGER DEFAULT 1,
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Sales table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL UNIQUE,
      store_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      shift_id TEXT,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      refund_status TEXT DEFAULT 'none',
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    )
  `);

  // Sale items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT,
      barcode TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      purchase_price REAL DEFAULT 0,
      total_price REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Payments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    )
  `);

  // Refunds table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      sale_item_id TEXT,
      product_id TEXT,
      product_name TEXT,
      quantity INTEGER NOT NULL,
      refund_amount REAL NOT NULL,
      reason TEXT,
      store_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    )
  `);

  // Sync queue table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    )
  `);

  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_refunds_sale ON refunds(sale_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)`);
}

// Run database migrations
async function runMigrations() {
  try {
    // Check sale_items table columns
    const saleItemsInfo = await db.select('PRAGMA table_info(sale_items)');
    const hasPurchasePrice = saleItemsInfo.some(col => col.name === 'purchase_price');
    const hasProductName = saleItemsInfo.some(col => col.name === 'product_name');
    const hasBarcode = saleItemsInfo.some(col => col.name === 'barcode');
    const hasCreatedAt = saleItemsInfo.some(col => col.name === 'created_at');

    if (!hasPurchasePrice) {
      console.log('🔄 Adding purchase_price column to sale_items...');
      await db.execute('ALTER TABLE sale_items ADD COLUMN purchase_price REAL DEFAULT 0');
      console.log('✅ purchase_price column added');
    }

    if (!hasProductName) {
      console.log('🔄 Adding product_name column to sale_items...');
      await db.execute('ALTER TABLE sale_items ADD COLUMN product_name TEXT');
      console.log('✅ product_name column added to sale_items');
    }

    if (!hasBarcode) {
      console.log('🔄 Adding barcode column to sale_items...');
      await db.execute('ALTER TABLE sale_items ADD COLUMN barcode TEXT');
      console.log('✅ barcode column added to sale_items');
    }

    if (!hasCreatedAt) {
      console.log('🔄 Adding created_at column to sale_items...');
      await db.execute('ALTER TABLE sale_items ADD COLUMN created_at TEXT DEFAULT (datetime(\'now\'))');
      console.log('✅ created_at column added to sale_items');
    }

    // Check if created_at column exists in payments
    const paymentsInfo = await db.select('PRAGMA table_info(payments)');
    const hasPaymentsCreatedAt = paymentsInfo.some(col => col.name === 'created_at');

    if (!hasPaymentsCreatedAt) {
      console.log('🔄 Adding created_at column to payments...');
      await db.execute('ALTER TABLE payments ADD COLUMN created_at TEXT DEFAULT (datetime(\'now\'))');
      console.log('✅ created_at column added to payments');
    }

    // Check if refund_status column exists in sales
    const salesInfo = await db.select('PRAGMA table_info(sales)');
    const hasRefundStatus = salesInfo.some(col => col.name === 'refund_status');

    if (!hasRefundStatus) {
      console.log('🔄 Adding refund_status column to sales...');
      await db.execute('ALTER TABLE sales ADD COLUMN refund_status TEXT DEFAULT \'none\'');
      console.log('✅ refund_status column added to sales');
    }

    // Check if refunds table exists
    try {
      const refundsInfo = await db.select('PRAGMA table_info(refunds)');
      const hasProductId = refundsInfo.some(col => col.name === 'product_id');
      const hasProductName = refundsInfo.some(col => col.name === 'product_name');

      if (!hasProductId) {
        console.log('🔄 Adding product_id column to refunds...');
        await db.execute('ALTER TABLE refunds ADD COLUMN product_id TEXT');
        console.log('✅ product_id column added to refunds');
      }

      if (!hasProductName) {
        console.log('🔄 Adding product_name column to refunds...');
        await db.execute('ALTER TABLE refunds ADD COLUMN product_name TEXT');
        console.log('✅ product_name column added to refunds');
      }
    } catch (refundsError) {
      // refunds tablosu yoksa migration'da oluşturulacak, hata verme
      console.log('ℹ️ refunds table will be created on next init');
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    // Don't throw - migrations should not break the app
  }
}

// Device Configuration - localStorage
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
        store_name: null
      };
    }
    return JSON.parse(config);
  },

  update(data) {
    const current = this.get();
    const updated = { ...current, ...data };
    localStorage.setItem('device_config', JSON.stringify(updated));
    return updated;
  },

  activate(deviceId, storeId, storeName) {
    const updated = {
      id: 1,
      device_id: deviceId,
      store_id: storeId,
      store_name: storeName,
      is_activated: 1,
      api_url: this.get().api_url
    };
    localStorage.setItem('device_config', JSON.stringify(updated));
    return updated;
  }
};

// Category Repository
export const categoryRepo = {
  async findAll() {
    if (!db) return [];
    const result = await db.select('SELECT * FROM categories ORDER BY name');
    return result;
  },

  async findById(id) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM categories WHERE id = $1', [id]);
    return result[0] || null;
  },

  async upsert(category) {
    if (!db) return null;
    const id = category.id || uuidv4();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO categories (id, name, created_at, updated_at, synced)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         updated_at = excluded.updated_at,
         synced = 0`,
      [id, category.name, now, now]
    );

    return id;
  }
};

// Product Repository
export const productRepo = {
  async search(query) {
    if (!db) return [];
    const q = `%${query}%`;
    const result = await db.select(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE (p.name LIKE $1 OR p.barcode LIKE $1) AND p.is_active = 1',
      [q]
    );
    return result;
  },

  async findAll() {
    if (!db) return [];
    const result = await db.select('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
    return result;
  },

  async findById(id) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM products WHERE id = $1', [id]);
    return result[0] || null;
  },

  async findByBarcode(barcode) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM products WHERE barcode = $1 AND is_active = 1', [barcode]);
    return result[0] || null;
  },

  async upsert(product) {
    if (!db) return null;
    const id = product.id || uuidv4();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO products (id, barcode, name, category_id, purchase_price, sale_price, is_active, created_at, updated_at, synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
       ON CONFLICT(id) DO UPDATE SET
         barcode = excluded.barcode,
         name = excluded.name,
         category_id = excluded.category_id,
         purchase_price = excluded.purchase_price,
         sale_price = excluded.sale_price,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at,
         synced = 0`,
      [
        id,
        product.barcode,
        product.name,
        product.category_id,
        product.purchase_price,
        product.sale_price,
        product.is_active !== undefined ? product.is_active : 1,
        now,
        now
      ]
    );

    // Ensure stock record exists
    await stockRepo.initializeStock(id);

    return id;
  },

  async delete(id) {
    requireAdmin();
    if (!db) return false;
    const now = new Date().toISOString();

    try {
      // Soft delete - set is_active to 0
      await db.execute(
        'UPDATE products SET is_active = 0, updated_at = $1, synced = 0 WHERE id = $2',
        [now, id]
      );

      // Queue for sync
      await syncQueueRepo.add('product', id, 'delete', { deleted_at: now });

      return true;
    } catch (error) {
      console.error('Product delete failed:', error);
      return false;
    }
  }
};

// Stock Repository
export const stockRepo = {
  async findByProductAndStore(productId, storeId) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM stocks WHERE product_id = $1', [productId]);
    return result[0] || null;
  },

  async findAll() {
    if (!db) return [];
    const result = await db.select(`
      SELECT s.*, p.name as product_name, p.barcode
      FROM stocks s
      JOIN products p ON s.product_id = p.id
      WHERE p.is_active = 1
      ORDER BY p.name
    `);
    return result;
  },

  async findByProductId(productId) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM stocks WHERE product_id = $1', [productId]);
    return result[0] || null;
  },

  async initializeStock(productId) {
    if (!db) return;
    const existing = await this.findByProductId(productId);
    if (!existing) {
      const id = uuidv4();
      await db.execute(
        'INSERT INTO stocks (id, product_id, quantity, min_quantity, synced) VALUES ($1, $2, 0, 5, 0)',
        [id, productId]
      );
    }
  },

  async updateQuantity(productId, quantity) {
    if (!db) return false;
    const now = new Date().toISOString();

    await db.execute(
      'UPDATE stocks SET quantity = $1, updated_at = $2, synced = 0 WHERE product_id = $3',
      [quantity, now, productId]
    );

    return true;
  },

  async reduceStock(productId, quantity) {
    if (!db) return false;
    const stock = await this.findByProductId(productId);
    if (!stock) {
      console.warn(`Stock not found for product: ${productId}`);
      return false;
    }

    const newQuantity = Math.max(0, stock.quantity - quantity);
    return await this.updateQuantity(productId, newQuantity);
  },

  async addStock(productId, quantity) {
    if (!db) return false;
    const stock = await this.findByProductId(productId);
    if (!stock) {
      await this.initializeStock(productId);
      return await this.updateQuantity(productId, quantity);
    }

    const newQuantity = stock.quantity + quantity;
    return await this.updateQuantity(productId, newQuantity);
  }
};

// Shift Repository
export const shiftRepo = {
  async getCurrent() {
    if (!db) return null;
    const result = await db.select('SELECT * FROM shifts WHERE is_open = 1 ORDER BY opened_at DESC LIMIT 1');
    return result[0] || null;
  },

  async create(userId, openingCash) {
    if (!db) return null;
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.execute(
      'INSERT INTO shifts (id, user_id, opening_cash, is_open, opened_at, synced) VALUES ($1, $2, $3, 1, $4, 0)',
      [id, userId, openingCash, now]
    );

    // Queue for sync
    await syncQueueRepo.add('shift', id, 'create', { id, user_id: userId, opening_cash: openingCash, opened_at: now });

    return await this.findById(id);
  },

  async close(shiftId, closingCash) {
    if (!db) return false;
    const now = new Date().toISOString();

    // Calculate totals
    const sales = await db.select('SELECT COALESCE(SUM(final_amount), 0) as total FROM sales WHERE shift_id = $1', [shiftId]);
    const totalSales = sales[0]?.total || 0;

    await db.execute(
      'UPDATE shifts SET closing_cash = $1, total_sales = $2, is_open = 0, closed_at = $3, synced = 0 WHERE id = $4',
      [closingCash, totalSales, now, shiftId]
    );

    // Queue for sync
    await syncQueueRepo.add('shift', shiftId, 'update', { closing_cash: closingCash, closed_at: now });

    return true;
  },

  async findById(id) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM shifts WHERE id = $1', [id]);
    return result[0] || null;
  },

  async findAll() {
    if (!db) return [];
    const result = await db.select('SELECT * FROM shifts ORDER BY opened_at DESC LIMIT 50');
    return result;
  }
};

// Sale Repository
export const saleRepo = {
  async findByReceiptNumber(receiptNumber) {
    if (!db) return null;
    const saleResult = await db.select('SELECT * FROM sales WHERE receipt_number = $1', [receiptNumber]);
    if (!saleResult || saleResult.length === 0) return null;

    const sale = saleResult[0];
    sale.items = await db.select('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]);
    sale.payments = await db.select('SELECT * FROM payments WHERE sale_id = $1', [sale.id]);
    return sale;
  },

  async create(saleData, items, payments) {
    if (!db) return null;

    const saleId = uuidv4();
    const now = new Date().toISOString();

    try {
      // Insert sale
      await db.execute(
        `INSERT INTO sales (id, receipt_number, store_id, user_id, device_id, shift_id,
                            total_amount, discount_amount, final_amount, created_at, synced)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)`,
        [
          saleId,
          saleData.receipt_number,
          saleData.store_id,
          saleData.user_id,
          saleData.device_id,
          saleData.shift_id,
          saleData.total_amount,
          saleData.discount_amount || 0,
          saleData.final_amount,
          now
        ]
      );

      // Insert sale items and reduce stock
      for (const item of items) {
        const itemId = uuidv4();
        await db.execute(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name, barcode, quantity, unit_price, purchase_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [itemId, saleId, item.product_id, item.product_name, item.barcode, item.quantity, item.unit_price, item.purchase_price || 0, item.total_price, now]
        );

        // Reduce stock
        await stockRepo.reduceStock(item.product_id, item.quantity);
      }

      // Insert payments
      for (const payment of payments) {
        const paymentId = uuidv4();
        await db.execute(
          'INSERT INTO payments (id, sale_id, method, amount, created_at) VALUES ($1, $2, $3, $4, $5)',
          [paymentId, saleId, payment.method, payment.amount, now]
        );
      }

      // Queue for sync
      await syncQueueRepo.add('sale', saleId, 'create', {
        ...saleData,
        id: saleId,
        items,
        payments,
        created_at: now
      });

      return saleId;
    } catch (error) {
      console.error('Sale creation failed:', error);
      throw error;
    }
  },

  async findById(id) {
    if (!db) return null;
    const saleResult = await db.select('SELECT * FROM sales WHERE id = $1', [id]);
    if (!saleResult || saleResult.length === 0) return null;

    const sale = saleResult[0];
    sale.items = await db.select('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
    sale.payments = await db.select('SELECT * FROM payments WHERE sale_id = $1', [id]);

    return sale;
  },

  async findAll() {
    if (!db) return [];
    const sales = await db.select('SELECT * FROM sales ORDER BY created_at DESC LIMIT 100');

    // Load items and payments for each sale
    for (const sale of sales) {
      sale.items = await db.select('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]);
      sale.payments = await db.select('SELECT * FROM payments WHERE sale_id = $1', [sale.id]);
    }

    return sales;
  },

  async findByShift(shiftId) {
    if (!db) return [];
    const result = await db.select('SELECT * FROM sales WHERE shift_id = $1 ORDER BY created_at DESC', [shiftId]);
    return result;
  },

  async findItemsBySaleId(saleId) {
    if (!db) return [];
    const result = await db.select('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);
    return result;
  },

  async findPaymentsBySaleId(saleId) {
    if (!db) return [];
    const result = await db.select('SELECT * FROM payments WHERE sale_id = $1', [saleId]);
    return result;
  }
};

// User Repository (for offline login)
export const userRepo = {
  async findAll() {
    if (!db) return [];
    const result = await db.select('SELECT * FROM users ORDER BY full_name');
    return result;
  },

  async findById(id) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM users WHERE id = $1', [id]);
    return result[0] || null;
  },

  async findByUsername(username) {
    if (!db) return null;
    const result = await db.select('SELECT * FROM users WHERE username = $1', [username]);
    return result[0] || null;
  },

  async upsert(user) {
    requireAdmin();
    if (!db) return null;
    const id = user.id || uuidv4();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO users (id, username, password, full_name, role, store_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         password = excluded.password,
         full_name = excluded.full_name,
         role = excluded.role,
         store_id = excluded.store_id,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at`,
      [
        id,
        user.username,
        user.password,
        user.full_name,
        user.role,
        user.store_id,
        user.is_active !== undefined ? user.is_active : 1,
        now,
        now
      ]
    );

    return id;
  }
};

// Helper function to update sale refund status
async function updateSaleRefundStatus(saleId) {
  if (!db) return;
  
  try {
    // Get all sale items
    const saleItems = await db.select('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);
    if (!saleItems || saleItems.length === 0) return;

    // Get all refunds for this sale
    const refunds = await db.select('SELECT * FROM refunds WHERE sale_id = $1', [saleId]);
    
    // Calculate refunded quantities per product
    const refundedByProduct = {};
    refunds.forEach(refund => {
      const productId = refund.product_id || refund.sale_item_id;
      if (!refundedByProduct[productId]) {
        refundedByProduct[productId] = 0;
      }
      refundedByProduct[productId] += refund.quantity || 0;
    });

    // Check if all items are fully refunded
    let allFullyRefunded = true;
    let anyRefunded = false;

    for (const item of saleItems) {
      const productId = item.product_id;
      const refundedQty = refundedByProduct[productId] || 0;
      
      if (refundedQty > 0) {
        anyRefunded = true;
      }
      
      if (refundedQty < item.quantity) {
        allFullyRefunded = false;
      }
    }

    // Determine refund status
    let refundStatus = 'none';
    if (allFullyRefunded && anyRefunded) {
      refundStatus = 'full';
    } else if (anyRefunded) {
      refundStatus = 'partial';
    }

    // Update sale refund_status
    await db.execute('UPDATE sales SET refund_status = $1 WHERE id = $2', [refundStatus, saleId]);
    console.log(`✅ Sale ${saleId} refund_status updated to: ${refundStatus}`);
  } catch (error) {
    console.error('❌ Error updating sale refund status:', error);
  }
}

// Refund Repository
export const refundRepo = {
  async findAll() {
    if (!db) return [];
    const result = await db.select('SELECT * FROM refunds ORDER BY created_at DESC');
    return result;
  },

  async findBySaleId(saleId) {
    if (!db) return [];
    const result = await db.select('SELECT * FROM refunds WHERE sale_id = $1', [saleId]);
    return result;
  },

  async create(refundData) {
    if (!db) return null;
    const id = refundData.id || uuidv4();
    const now = new Date().toISOString();

    try {
      console.log('🔄 Creating refund:', refundData);
      
      if (!refundData.sale_id) throw new Error('sale_id is required');
      if (!refundData.store_id) throw new Error('store_id is required');
      if (!refundData.user_id) throw new Error('user_id is required');
      if (!refundData.device_id) throw new Error('device_id is required');

      // sale_item_id opsiyonel - yoksa product_id kullan
      const saleItemId = refundData.sale_item_id || refundData.product_id || id;
      const refundAmount = refundData.refund_amount || refundData.total_amount || (refundData.quantity * refundData.unit_price) || 0;

      await db.execute(
        `INSERT INTO refunds (id, sale_id, sale_item_id, product_id, product_name, quantity, refund_amount, reason, store_id, user_id, device_id, synced, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          refundData.sale_id,
          saleItemId,
          refundData.product_id || null,
          refundData.product_name || null,
          refundData.quantity || 1,
          refundAmount,
          refundData.reason || null,
          refundData.store_id,
          refundData.user_id,
          refundData.device_id,
          0, // synced
          now
        ]
      );

      // Update stock - iade edilen ürünü stoka geri ekle
      if (refundData.product_id) {
        await stockRepo.addStock(refundData.product_id, refundData.quantity || 1);
      }

      // Update sale refund_status
      await updateSaleRefundStatus(refundData.sale_id);

      // Queue for sync
      await syncQueueRepo.add('refund', id, 'create', refundData);

      return id;
    } catch (error) {
      console.error('❌ Error creating refund:', error);
      throw error;
    }
  }
};

// Stock Adjustment Repository
export const stockAdjustmentRepo = {
  async findAll() {
    if (!db) return [];
    return [];
  },

  async create(adjustmentData) {
    if (!db) return null;
    console.log('Stock adjustment logged:', adjustmentData);
    return uuidv4();
  }
};

// Audit Log Repository
export const auditLogRepo = {
  async findAll() {
    if (!db) return [];
    // TODO: Implement when needed
    return [];
  },

  async create(logData) {
    if (!db) return;
    // TODO: Implement audit log table
    console.warn('auditLogRepo.create not yet implemented');
  }
};

// Sync Queue Repository
export const syncQueueRepo = {
  async add(entityType, entityId, operation, data) {
    if (!db) return;
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.execute(
      'INSERT INTO sync_queue (id, entity_type, entity_id, operation, data, created_at, synced) VALUES ($1, $2, $3, $4, $5, $6, 0)',
      [id, entityType, entityId, operation, JSON.stringify(data), now]
    );
  },

  async getPending() {
    if (!db) return [];
    const result = await db.select('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC');
    return result;
  },

  async markSynced(id) {
    if (!db) return;
    await db.execute('UPDATE sync_queue SET synced = 1 WHERE id = $1', [id]);
  },

  async clear() {
    if (!db) return;
    await db.execute('DELETE FROM sync_queue WHERE synced = 1');
  }
};

export function getDatabase() {
  return db;
}
