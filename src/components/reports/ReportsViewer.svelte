<script>
  import { deviceConfig } from '../../stores/appStore.js';
  import { saleRepo, shiftRepo, auditLogRepo } from '../../lib/db/database.js';
  import { onMount } from 'svelte';

  let activeTab = 'sales'; // sales, audit
  let dateFilter = 'today'; // today, yesterday, week, month, all
  let salesData = [];
  let shiftsData = [];
  let auditLogs = [];
  let summary = {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    cashTotal: 0,
    cardTotal: 0
  };

  onMount(() => {
    loadData();
  });

  function loadData() {
    if (activeTab === 'sales') {
      loadSalesData();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }

  async function loadSalesData() {
    const { startDate, endDate } = getDateRange();
    const allSales = await saleRepo.findAll();

    // Filter by date
    salesData = allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // Calculate summary
    summary.totalSales = salesData.length;
    summary.totalRevenue = 0;
    summary.totalProfit = 0;
    summary.cashTotal = 0;
    summary.cardTotal = 0;

    salesData.forEach(sale => {
      // Add to revenue
      summary.totalRevenue += sale.final_amount;

      // Calculate profit from items
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const profit = (item.unit_price - (item.purchase_price || 0)) * item.quantity;
          summary.totalProfit += profit;
        });
      }

      // Calculate payment totals
      if (sale.payments && Array.isArray(sale.payments)) {
        sale.payments.forEach(payment => {
          if (payment.method === 'cash') {
            summary.cashTotal += payment.amount;
          } else if (payment.method === 'card') {
            summary.cardTotal += payment.amount;
          }
        });
      }
    });
  }

  async function loadAuditLogs() {
    const { startDate, endDate } = getDateRange();
    const allLogs = await auditLogRepo.findAll();
    auditLogs = allLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startDate && logDate <= endDate;
    }).slice(0, 100);
  }

  function getDateRange() {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let startDate;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'all':
      default:
        startDate = new Date(2020, 0, 1);
        break;
    }

    return { startDate, endDate };
  }

  function handleTabChange(tab) {
    activeTab = tab;
    loadData();
  }

  function handleDateFilterChange() {
    loadData();
  }

  function getActionTypeLabel(actionType) {
    const labels = {
      'login': '🔑 Giriş',
      'logout': '🚪 Çıkış',
      'sale': '💵 Satış',
      'refund': '↩️ İade',
      'shift_open': '🔓 Vardiya Açma',
      'shift_close': '🔐 Vardiya Kapama',
      'stock_adjustment': '📦 Stok Ayarlama',
      'product_update': '📝 Ürün Güncelleme',
      'price_change': '💰 Fiyat Değişikliği'
    };
    return labels[actionType] || actionType;
  }

  function formatCurrency(amount) {
    return '₺' + amount.toFixed(2);
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('tr-TR');
  }
</script>

<div class="reports-viewer">
  <div class="header">
    <h2>📊 Raporlar ve Kayıtlar</h2>

    <div class="date-filter">
      <label>Tarih Aralığı:</label>
      <select bind:value={dateFilter} on:change={handleDateFilterChange}>
        <option value="today">Bugün</option>
        <option value="yesterday">Dün</option>
        <option value="week">Son 7 Gün</option>
        <option value="month">Bu Ay</option>
        <option value="all">Tümü</option>
      </select>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button
      class="tab {activeTab === 'sales' ? 'active' : ''}"
      on:click={() => handleTabChange('sales')}
    >
      💵 Satış Raporları
    </button>
    <button
      class="tab {activeTab === 'audit' ? 'active' : ''}"
      on:click={() => handleTabChange('audit')}
    >
      📜 Audit Loglar
    </button>
  </div>

  <!-- Content -->
  <div class="content">
    {#if activeTab === 'sales'}
      <!-- Sales Summary -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">🛒</div>
          <div class="card-content">
            <span class="card-label">Toplam Satış</span>
            <span class="card-value">{summary.totalSales}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <span class="card-label">Toplam Ciro</span>
            <span class="card-value">{formatCurrency(summary.totalRevenue)}</span>
          </div>
        </div>

        <div class="summary-card profit">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <span class="card-label">Toplam Kar</span>
            <span class="card-value">{formatCurrency(summary.totalProfit)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">💵</div>
          <div class="card-content">
            <span class="card-label">Nakit</span>
            <span class="card-value">{formatCurrency(summary.cashTotal)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">💳</div>
          <div class="card-content">
            <span class="card-label">Kart</span>
            <span class="card-value">{formatCurrency(summary.cardTotal)}</span>
          </div>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="data-table-container">
        <h3>Satış Detayları</h3>
        {#if salesData.length === 0}
          <div class="empty-state">
            <p>Bu tarih aralığında satış bulunamadı.</p>
          </div>
        {:else}
          <div class="data-table">
            <div class="table-header">
              <div>Fiş No</div>
              <div>Tarih</div>
              <div>Ürün Sayısı</div>
              <div>Tutar</div>
              <div>Ödeme</div>
              <div>Senkron</div>
            </div>

            {#each salesData as sale}
              <div class="table-row">
                <div class="receipt-number">{sale.receipt_number}</div>
                <div>{formatDateTime(sale.created_at)}</div>
                <div>{sale.items?.length || 0} adet</div>
                <div class="amount">{formatCurrency(sale.final_amount)}</div>
                <div>
                  {#each sale.payments as payment}
                    <span class="payment-badge {payment.method}">
                      {payment.method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                    </span>
                  {/each}
                </div>
                <div>
                  {#if sale.synced}
                    <span class="status-badge synced">✅ Senkron</span>
                  {:else}
                    <span class="status-badge pending">⏳ Bekliyor</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'audit'}
      <!-- Audit Logs -->
      <div class="data-table-container">
        <h3>Audit Log Kayıtları (Son 100)</h3>
        {#if auditLogs.length === 0}
          <div class="empty-state">
            <p>Bu tarih aralığında log kaydı bulunamadı.</p>
          </div>
        {:else}
          <div class="audit-list">
            {#each auditLogs as log}
              <div class="audit-item">
                <div class="audit-header">
                  <span class="action-type">{getActionTypeLabel(log.action_type)}</span>
                  <span class="timestamp">{formatDateTime(log.created_at)}</span>
                </div>
                <div class="audit-details">
                  {#if log.description}
                    <p class="description">{log.description}</p>
                  {/if}
                  {#if log.metadata}
                    <div class="metadata">
                      <pre>{JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .reports-viewer {
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

  .date-filter {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .date-filter label {
    font-weight: 600;
    color: #333;
  }

  .date-filter select {
    padding: 10px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    background: white;
  }

  .date-filter select:focus {
    outline: none;
    border-color: #667eea;
  }

  .tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    border-bottom: 2px solid #e0e0e0;
  }

  .tab {
    padding: 14px 24px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 16px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    transition: all 0.3s;
  }

  .tab:hover {
    color: #667eea;
  }

  .tab.active {
    color: #667eea;
    border-bottom-color: #667eea;
  }

  .content {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .summary-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 20px;
    margin-bottom: 30px;
  }

  .summary-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .summary-card.profit {
    background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  }

  .card-icon {
    font-size: 48px;
  }

  .card-content {
    display: flex;
    flex-direction: column;
  }

  .card-label {
    font-size: 13px;
    opacity: 0.9;
    margin-bottom: 5px;
  }

  .card-value {
    font-size: 24px;
    font-weight: 700;
  }

  .data-table-container {
    margin-top: 20px;
  }

  .data-table-container h3 {
    margin: 0 0 15px 0;
    font-size: 20px;
    color: #333;
  }

  .empty-state {
    text-align: center;
    padding: 60px 40px;
    color: #999;
  }

  .data-table {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
    background: #f8f9fa;
    font-weight: 600;
    padding: 15px;
    border-bottom: 2px solid #e0e0e0;
  }

  .table-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
    align-items: center;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: #f8f9fa;
  }

  .receipt-number {
    font-family: monospace;
    font-weight: 600;
    color: #667eea;
  }

  .amount {
    font-weight: 600;
    color: #4caf50;
  }

  .payment-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .payment-badge.cash {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .payment-badge.card {
    background: #e3f2fd;
    color: #1565c0;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .status-badge.synced {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-badge.pending {
    background: #fff3cd;
    color: #856404;
  }

  .status-badge.active {
    background: #e3f2fd;
    color: #1565c0;
  }

  .difference {
    font-weight: 600;
  }

  .difference.positive {
    color: #4caf50;
  }

  .difference.negative {
    color: #f44336;
  }

  .audit-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .audit-item {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    background: #f8f9fa;
  }

  .audit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .action-type {
    font-weight: 600;
    font-size: 16px;
    color: #333;
  }

  .timestamp {
    font-size: 13px;
    color: #666;
  }

  .audit-details .description {
    margin: 0 0 10px 0;
    color: #666;
    font-size: 14px;
  }

  .metadata {
    background: white;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .metadata pre {
    margin: 0;
    font-size: 12px;
    color: #333;
    overflow-x: auto;
  }
</style>
