<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { currentView, user, deviceConfig, initializeApp, logout, toggleAutoPrint } from './stores/appStore.js';
  import { startAutoSync } from './lib/sync/syncService.js';
  import { initDatabase } from './lib/db/database.js';

  // Import components
  import Login from './components/login/Login.svelte';
  import Activation from './components/activation/Activation.svelte';
  import SalesScreen from './components/sales/SalesScreen.svelte';
  import RefundScreen from './components/refund/RefundScreen.svelte';
  import StockAdjustment from './components/stock/StockAdjustment.svelte';
  import ReportsViewer from './components/reports/ReportsViewer.svelte';
  import UserManagement from './components/admin/UserManagement.svelte';
  import SyncMonitor from './components/admin/SyncMonitor.svelte';
  import Settings from './components/admin/Settings.svelte';
  import StoresViewer from './components/admin/StoresViewer.svelte';

  let currentMenu = 'sales'; // sales, refunds, stock, reports, users, stores, sync, settings

  onMount(async () => {
    // Initialize local database first
    try {
      console.log('🚀 Starting app initialization...');
      await initDatabase();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      return;
    }

    // Initialize app from localStorage
    initializeApp();

    // Start auto-sync if device is activated
    const config = get(deviceConfig);
    if (config.is_activated) {
      startAutoSync(120000); // Sync every 2 minutes
    }
  });

  function handleLogout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      logout();
    }
  }

  function navigateTo(menu) {
    currentMenu = menu;
  }
</script>

<main>
  {#if $currentView === 'loading'}
    <div class="loading-screen">
      <div class="spinner"></div>
      <h2>Yükleniyor...</h2>
    </div>
  {:else if $currentView === 'activation'}
    <Activation />
  {:else if $currentView === 'login'}
    <Login />
  {:else if $currentView === 'pos'}
    <div class="pos-app">
      <!-- Top Navigation Bar -->
      <div class="top-bar">
        <div class="brand">
          <h1>🏪 Dalkıran POS</h1>
          {#if $deviceConfig.store_name}
            <span class="store-badge">{$deviceConfig.store_name}</span>
          {/if}
        </div>

        <div class="user-info">
          <button
            class="btn-printer {$deviceConfig.auto_print_enabled ? 'active' : ''}"
            on:click={toggleAutoPrint}
            title={$deviceConfig.auto_print_enabled ? 'Otomatik yazdırma AÇIK' : 'Otomatik yazdırma KAPALI'}
          >
            🖨️ {$deviceConfig.auto_print_enabled ? 'Yazdırma: AÇIK' : 'Yazdırma: KAPALI'}
          </button>
          <div class="user-details">
            <span class="username">👤 {$user.full_name}</span>
            <span class="role">{$user.role === 'admin' ? 'Yönetici' : 'Personel'}</span>
          </div>
          <button class="btn-logout" on:click={handleLogout}>
            🚪 Çıkış
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="main-content">
        <!-- Sidebar Menu -->
        <div class="sidebar">
          <div class="menu">
            <button
              class="menu-item {currentMenu === 'sales' ? 'active' : ''}"
              on:click={() => navigateTo('sales')}
            >
              🛒 Satış Yap
            </button>

            <button
              class="menu-item {currentMenu === 'refunds' ? 'active' : ''}"
              on:click={() => navigateTo('refunds')}
            >
              ↩️ İade İşlemleri
            </button>

            <button
              class="menu-item {currentMenu === 'reports' ? 'active' : ''}"
              on:click={() => navigateTo('reports')}
            >
              📊 Raporlar
            </button>

            {#if $user.role === 'admin'}
              <button
                class="menu-item {currentMenu === 'stock' ? 'active' : ''}"
                on:click={() => navigateTo('stock')}
              >
                📦 Stok Ayarlama
              </button>
              <button
                class="menu-item {currentMenu === 'users' ? 'active' : ''}"
                on:click={() => navigateTo('users')}
              >
                👥 Kullanıcılar
              </button>
              <button
                class="menu-item {currentMenu === 'stores' ? 'active' : ''}"
                on:click={() => navigateTo('stores')}
              >
                🏪 Mağazalar
              </button>
              <button
                class="menu-item {currentMenu === 'sync' ? 'active' : ''}"
                on:click={() => navigateTo('sync')}
              >
                🔄 Senkronizasyon
              </button>
              <button
                class="menu-item {currentMenu === 'settings' ? 'active' : ''}"
                on:click={() => navigateTo('settings')}
              >
                ⚙️ Ayarlar
              </button>
            {/if}
          </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
          {#if currentMenu === 'sales'}
            <SalesScreen />
          {:else if currentMenu === 'refunds'}
            <RefundScreen />
          {:else if currentMenu === 'reports'}
            <ReportsViewer />
          {:else if currentMenu === 'stock'}
            <StockAdjustment />
          {:else if currentMenu === 'users'}
            <UserManagement />
          {:else if currentMenu === 'stores'}
            <StoresViewer />
          {:else if currentMenu === 'sync'}
            <SyncMonitor />
          {:else if currentMenu === 'settings'}
            <Settings />
          {/if}
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: #f5f7fa;
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .loading-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 5px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .pos-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .top-bar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 6px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand h1 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }

  .store-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .username {
    font-weight: 600;
    font-size: 12px;
  }

  .role {
    font-size: 10px;
    opacity: 0.9;
  }

  .btn-printer {
    padding: 5px 12px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    margin-right: 12px;
  }

  .btn-printer:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .btn-printer.active {
    background: rgba(76, 175, 80, 0.3);
    border-color: rgba(76, 175, 80, 0.5);
  }

  .btn-logout {
    padding: 5px 12px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-logout:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .main-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .menu {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .menu-item {
    padding: 15px 20px;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: all 0.3s;
    color: #333;
  }

  .menu-item:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #667eea;
    transform: translateX(5px);
  }

  .menu-item.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .shift-status {
    padding: 20px;
    border-top: 1px solid #e0e0e0;
  }

  .status-active, .status-closed {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    border-radius: 10px;
  }

  .status-active {
    background: #e8f5e9;
    border: 2px solid #4caf50;
  }

  .status-closed {
    background: #ffebee;
    border: 2px solid #f44336;
  }

  .status-icon {
    font-size: 32px;
  }

  .status-text {
    display: flex;
    flex-direction: column;
  }

  .status-text strong {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .status-text small {
    font-size: 12px;
    opacity: 0.8;
  }

  .content-area {
    flex: 1;
    overflow: hidden;
    background: #f5f7fa;
    display: flex;
    flex-direction: column;
  }

  .warning-box {
    margin: 40px auto;
    max-width: 600px;
    background: white;
    padding: 60px;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }

  .warning-box h2 {
    margin: 0 0 15px 0;
    color: #f44336;
    font-size: 28px;
  }

  .warning-box p {
    margin: 0 0 30px 0;
    color: #666;
    font-size: 16px;
  }

  .btn-primary {
    padding: 14px 28px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-primary:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }

  .placeholder {
    margin: 40px;
    padding: 60px;
    background: white;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .placeholder h2 {
    margin: 0 0 15px 0;
    color: #333;
  }

  .placeholder p {
    margin: 0;
    color: #666;
    font-size: 16px;
  }
</style>
