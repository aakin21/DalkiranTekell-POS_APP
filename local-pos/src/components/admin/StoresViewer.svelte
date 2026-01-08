<script>
  import { onMount } from 'svelte';
  import { deviceConfig, isOnline } from '../../stores/appStore.js';
  import { storeApi } from '../../lib/api/client.js';

  let stores = [];
  let loading = false;
  let error = null;
  let selectedStore = null;
  let storeStats = {};

  onMount(() => {
    loadStores();
  });

  async function loadStores() {
    loading = true;
    error = null;

    try {
      const response = await storeApi.getAllStores();
      stores = response.stores || [];
    } catch (err) {
      console.error('Failed to load stores:', err);
      error = 'Mağazalar yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.';
      stores = [];
    } finally {
      loading = false;
    }
  }

  async function selectStore(store) {
    selectedStore = store;

    // Load stats for this store
    try {
      const stats = await storeApi.getStoreStats(store.id);
      storeStats[store.id] = stats;
      storeStats = { ...storeStats }; // Trigger reactivity
    } catch (err) {
      console.error('Failed to load store stats:', err);
    }
  }

  function closeStoreDetails() {
    selectedStore = null;
  }

  function isCurrentStore(storeId) {
    return $deviceConfig.store_id === storeId;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('tr-TR');
  }
</script>

<div class="stores-viewer">
  <div class="header">
    <h2>🏪 Mağazalar</h2>
    <button class="btn-refresh" on:click={loadStores} disabled={loading}>
      {loading ? '⏳ Yükleniyor...' : '🔄 Yenile'}
    </button>
  </div>

  {#if !$isOnline}
    <div class="offline-banner">
      ⚠️ Çevrimdışı moddasınız. Mağaza bilgilerini görmek için internet bağlantısı gereklidir.
    </div>
  {/if}

  {#if error}
    <div class="error-banner">
      ❌ {error}
    </div>
  {/if}

  <div class="content">
    {#if loading && stores.length === 0}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Mağazalar yükleniyor...</p>
      </div>
    {:else if stores.length === 0}
      <div class="empty-state">
        <div class="icon">🏪</div>
        <h3>Mağaza Bulunamadı</h3>
        <p>Sistemde kayıtlı mağaza bulunmamaktadır.</p>
      </div>
    {:else}
      <div class="stores-grid">
        {#each stores as store}
          <div
            class="store-card {isCurrentStore(store.id) ? 'current' : ''}"
            on:click={() => selectStore(store)}
          >
            <div class="card-header">
              <div class="store-icon">🏪</div>
              <div class="store-info">
                <h3>{store.name}</h3>
                <p class="store-id">ID: {store.id}</p>
              </div>
              {#if isCurrentStore(store.id)}
                <div class="current-badge">
                  ⭐ Aktif
                </div>
              {/if}
            </div>

            <div class="card-body">
              {#if store.address}
                <div class="info-row">
                  <span class="label">📍 Adres:</span>
                  <span class="value">{store.address}</span>
                </div>
              {/if}

              {#if store.phone}
                <div class="info-row">
                  <span class="label">📞 Telefon:</span>
                  <span class="value">{store.phone}</span>
                </div>
              {/if}

              <div class="info-row">
                <span class="label">📅 Oluşturulma:</span>
                <span class="value">{formatDate(store.created_at)}</span>
              </div>

              {#if storeStats[store.id]}
                <div class="stats-preview">
                  <div class="stat-item">
                    <span class="stat-icon">📦</span>
                    <span class="stat-value">{storeStats[store.id].product_count || 0}</span>
                    <span class="stat-label">Ürün</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">💰</span>
                    <span class="stat-value">{storeStats[store.id].sales_today || 0}</span>
                    <span class="stat-label">Bugünkü Satış</span>
                  </div>
                </div>
              {/if}
            </div>

            <div class="card-footer">
              <button class="btn-view-details" on:click|stopPropagation={() => selectStore(store)}>
                Detayları Gör →
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Store Details Modal -->
{#if selectedStore}
  <div class="modal-overlay" on:click={closeStoreDetails}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h2>🏪 {selectedStore.name}</h2>
        <button class="btn-close" on:click={closeStoreDetails}>✕</button>
      </div>

      <div class="modal-body">
        <div class="details-section">
          <h3>Mağaza Bilgileri</h3>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">Mağaza ID:</span>
              <strong>{selectedStore.id}</strong>
            </div>

            <div class="detail-item">
              <span class="label">Mağaza Adı:</span>
              <strong>{selectedStore.name}</strong>
            </div>

            {#if selectedStore.address}
              <div class="detail-item full-width">
                <span class="label">Adres:</span>
                <strong>{selectedStore.address}</strong>
              </div>
            {/if}

            {#if selectedStore.phone}
              <div class="detail-item">
                <span class="label">Telefon:</span>
                <strong>{selectedStore.phone}</strong>
              </div>
            {/if}

            {#if selectedStore.email}
              <div class="detail-item">
                <span class="label">E-posta:</span>
                <strong>{selectedStore.email}</strong>
              </div>
            {/if}

            <div class="detail-item">
              <span class="label">Oluşturulma Tarihi:</span>
              <strong>{formatDate(selectedStore.created_at)}</strong>
            </div>

            <div class="detail-item">
              <span class="label">Durum:</span>
              <strong>{isCurrentStore(selectedStore.id) ? '⭐ Aktif Mağaza' : '🏪 Diğer Mağaza'}</strong>
            </div>
          </div>
        </div>

        {#if storeStats[selectedStore.id]}
          <div class="details-section">
            <h3>İstatistikler</h3>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                  <span class="stat-value">{storeStats[selectedStore.id].product_count || 0}</span>
                  <span class="stat-label">Toplam Ürün</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                  <span class="stat-value">{storeStats[selectedStore.id].sales_today || 0}</span>
                  <span class="stat-label">Bugünkü Satış</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <span class="stat-value">{storeStats[selectedStore.id].sales_this_month || 0}</span>
                  <span class="stat-label">Bu Ayki Satış</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                  <span class="stat-value">{storeStats[selectedStore.id].active_users || 0}</span>
                  <span class="stat-label">Aktif Kullanıcı</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-close-modal" on:click={closeStoreDetails}>
          Kapat
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .stores-viewer {
    padding: 30px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .header h2 {
    margin: 0;
    font-size: 28px;
    color: #333;
  }

  .btn-refresh {
    padding: 12px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-refresh:hover:not(:disabled) {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }

  .btn-refresh:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .offline-banner {
    background: #ff9800;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-weight: 600;
    text-align: center;
  }

  .error-banner {
    background: #f44336;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-weight: 600;
    text-align: center;
  }

  .content {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .loading-state {
    text-align: center;
    padding: 80px 40px;
  }

  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: 80px 40px;
  }

  .empty-state .icon {
    font-size: 80px;
    margin-bottom: 20px;
  }

  .empty-state h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 24px;
  }

  .empty-state p {
    margin: 0;
    color: #666;
    font-size: 16px;
  }

  .stores-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }

  .store-card {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .store-card:hover {
    border-color: #667eea;
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.2);
    transform: translateY(-3px);
  }

  .store-card.current {
    border-color: #4caf50;
    background: linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%);
  }

  .card-header {
    display: flex;
    align-items: start;
    gap: 15px;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e0e0e0;
  }

  .store-icon {
    font-size: 48px;
  }

  .store-info {
    flex: 1;
  }

  .store-info h3 {
    margin: 0 0 5px 0;
    font-size: 20px;
    color: #333;
  }

  .store-id {
    margin: 0;
    font-size: 12px;
    color: #666;
    font-family: monospace;
  }

  .current-badge {
    background: #4caf50;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .card-body {
    margin-bottom: 15px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f5f5f5;
  }

  .info-row .label {
    font-size: 13px;
    color: #666;
  }

  .info-row .value {
    font-size: 13px;
    color: #333;
    font-weight: 500;
  }

  .stats-preview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e0e0e0;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .stat-icon {
    font-size: 24px;
    margin-bottom: 5px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #333;
  }

  .stat-label {
    font-size: 11px;
    color: #666;
    text-align: center;
  }

  .card-footer {
    padding-top: 15px;
    border-top: 1px solid #e0e0e0;
  }

  .btn-view-details {
    width: 100%;
    padding: 10px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-view-details:hover {
    background: #5568d3;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 25px;
    border-bottom: 2px solid #e0e0e0;
  }

  .modal-header h2 {
    margin: 0;
    color: #333;
    font-size: 24px;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #999;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.3s;
  }

  .btn-close:hover {
    color: #333;
    background: #f5f5f5;
  }

  .modal-body {
    padding: 25px;
  }

  .details-section {
    margin-bottom: 30px;
  }

  .details-section:last-child {
    margin-bottom: 0;
  }

  .details-section h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #333;
    padding-bottom: 10px;
    border-bottom: 2px solid #667eea;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .detail-item.full-width {
    grid-column: 1 / -1;
  }

  .detail-item .label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-item strong {
    font-size: 15px;
    color: #333;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .stat-card .stat-icon {
    font-size: 40px;
  }

  .stat-card .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-card .stat-value {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .stat-card .stat-label {
    font-size: 13px;
    opacity: 0.9;
  }

  .modal-footer {
    padding: 20px 25px;
    border-top: 2px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
  }

  .btn-close-modal {
    padding: 12px 30px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-close-modal:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }
</style>
