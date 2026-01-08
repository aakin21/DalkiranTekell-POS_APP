import { writable, get } from 'svelte/store';

// Auth store
export const user = writable(null);
export const authToken = writable(null);

// Device store
export const deviceConfig = writable({
  device_id: null,
  store_id: null,
  store_name: null,
  is_activated: false,
  api_url: 'http://localhost:3000'
});

// Current shift
export const currentShift = writable(null);

// Cart for sales
export const cart = writable([]);
export const cartTotal = writable(0);

// Sync status
export const syncStatus = writable({
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0
});

// Online/offline status
export const isOnline = writable(true);

// App view
export const currentView = writable('loading'); // loading, activation, login, pos

// Helper functions
export function login(userData, token) {
  user.set(userData);
  authToken.set(token);
  currentView.set('pos');
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('token', token);

  // Set user role in database module
  import('../lib/db/database.js').then(db => db.setCurrentUser(userData));
}

export function logout() {
  user.set(null);
  authToken.set(null);
  currentView.set('login');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

export function setDevice(config) {
  deviceConfig.set(config);
  localStorage.setItem('deviceConfig', JSON.stringify(config));
}

export function addToCart(product, quantity = 1) {
  cart.update(items => {
    const existingItem = items.find(item => item.product_id === product.id);
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total_price = existingItem.quantity * existingItem.unit_price;
      return [...items];
    } else {
      return [...items, {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: quantity,
        unit_price: product.sale_price,
        purchase_price: product.purchase_price || 0,
        total_price: quantity * product.sale_price
      }];
    }
  });
  updateCartTotal();
}

export function removeFromCart(productId) {
  cart.update(items => items.filter(item => item.product_id !== productId));
  updateCartTotal();
}

export function updateCartQuantity(productId, quantity) {
  cart.update(items => {
    const item = items.find(i => i.product_id === productId);
    if (item) {
      item.quantity = quantity;
      item.total_price = item.quantity * item.unit_price;
    }
    return [...items];
  });
  updateCartTotal();
}

export function clearCart() {
  cart.set([]);
  cartTotal.set(0);
}

function updateCartTotal() {
  const items = get(cart);
  const total = items.reduce((sum, item) => sum + item.total_price, 0);
  cartTotal.set(total);
}

// Initialize from localStorage on startup
export function initializeApp() {
  try {
    console.log('=== DALKIRAN POS STARTING ===');
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    const savedDevice = localStorage.getItem('deviceConfig');

    console.log('Saved device:', savedDevice);

    if (savedDevice) {
      const device = JSON.parse(savedDevice);
      deviceConfig.set(device);

      if (!device.is_activated) {
        console.log('Device not activated, showing activation screen');
        currentView.set('activation');
      } else if (savedUser && savedToken) {
        console.log('User logged in, showing POS');
        const userData = JSON.parse(savedUser);
        user.set(userData);
        authToken.set(savedToken);
        currentView.set('pos');

        // Set user role in database module
        import('../lib/db/database.js').then(db => db.setCurrentUser(userData));
      } else {
        console.log('Showing login screen');
        currentView.set('login');
      }
    } else {
      console.log('No device config, showing activation');
      currentView.set('activation');
    }
  } catch (error) {
    console.error('ERROR in initializeApp:', error);
    // Fallback to activation if anything fails
    currentView.set('activation');
  }
}
