<script>
  import { deviceConfig, user } from '../../stores/appStore.js';
  import { saleRepo, refundRepo, stockRepo, productRepo } from '../../lib/db/database.js';
  import { onMount } from 'svelte';

  let activeTab = 'sales'; // sales, products, stock
  let dateFilter = 'today'; // today, yesterday, week, month, all, custom
  let customDate = '';
  let sortColumn = 'revenue'; // revenue, profit, card, cash, stock, name
  let sortDirection = 'desc'; // desc, asc
  let salesData = [];
  let productStats = [];
  let stockData = [];
  let stockSummary = {
    totalPurchaseValue: 0,
    totalSaleValue: 0,
    totalPotentialProfit: 0
  };
  let summary = {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    cashTotal: 0,
    cardTotal: 0
  };
  let showDatePicker = false;

  onMount(() => {
    loadData();
  });

  function loadData() {
    if (activeTab === 'sales') {
      loadSalesData();
    } else if (activeTab === 'products') {
      loadProductStats();
    } else if (activeTab === 'stock') {
      loadStockData();
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

    // Load items and payments for each sale
    for (const sale of salesData) {
      sale.items = await saleRepo.findItemsBySaleId(sale.id);
      sale.payments = await saleRepo.findPaymentsBySaleId(sale.id);
    }

    // Load refunds
    const allRefunds = await refundRepo.findAll();

    // Calculate summary
    summary.totalSales = salesData.length;
    summary.totalRevenue = 0;
    summary.totalProfit = 0;
    summary.cashTotal = 0;
    summary.cardTotal = 0;
    let totalRefundAmount = 0;

    salesData.forEach(sale => {
      const saleRefunds = allRefunds.filter(refund => refund.sale_id === sale.id);
      const saleRefundTotal = saleRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
      totalRefundAmount += saleRefundTotal;

      summary.totalRevenue += (sale.final_amount - saleRefundTotal);

      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const itemRefunds = saleRefunds.filter(r => r.product_id === item.product_id);
          const refundedQty = itemRefunds.reduce((sum, r) => sum + (r.quantity || 0), 0);
          const actualQty = item.quantity - refundedQty;

          const profit = (item.unit_price - (item.purchase_price || 0)) * actualQty;
          summary.totalProfit += profit;
        });
      }

      if (sale.payments && Array.isArray(sale.payments)) {
        sale.payments.forEach(payment => {
          const paymentShare = payment.amount / sale.final_amount;
          const refundShare = saleRefundTotal * paymentShare;
          const actualAmount = payment.amount - refundShare;

          if (payment.method === 'cash') {
            summary.cashTotal += actualAmount;
          } else if (payment.method === 'card') {
            summary.cardTotal += actualAmount;
          }
        });
      }
    });
  }

  async function loadProductStats() {
    const { startDate, endDate } = getDateRange();
    const allSales = await saleRepo.findAll();
    const allRefunds = await refundRepo.findAll();
    const allStocks = await stockRepo.findAll();

    // Filter sales by date
    const filteredSales = allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // Get all sale items
    const allItems = [];
    for (const sale of filteredSales) {
      const items = await saleRepo.findItemsBySaleId(sale.id);
      const payments = await saleRepo.findPaymentsBySaleId(sale.id);
      const saleRefunds = allRefunds.filter(r => r.sale_id === sale.id);

      // Calculate payment method distribution for this sale
      const totalSaleAmount = sale.final_amount || 1;
      const cashPayment = payments.find(p => p.method === 'cash')?.amount || 0;
      const cardPayment = payments.find(p => p.method === 'card')?.amount || 0;
      const cashRatio = totalSaleAmount > 0 ? cashPayment / totalSaleAmount : 0;
      const cardRatio = totalSaleAmount > 0 ? cardPayment / totalSaleAmount : 0;

      items.forEach(item => {
        const itemRefunds = saleRefunds.filter(r => {
          return r.sale_item_id === item.id || r.product_id === item.product_id;
        });
        const refundedQty = itemRefunds.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const actualQty = item.quantity - refundedQty;

        if (actualQty > 0) {
          const itemRatio = item.quantity > 0 ? actualQty / item.quantity : 0;
          allItems.push({
            ...item,
            actualQuantity: actualQty,
            cashRatio,
            cardRatio,
            saleAmount: item.total_price * itemRatio
          });
        }
      });
    }

    // Group by product
    const productMap = new Map();

    allItems.forEach(item => {
      const productId = item.product_id;
      const productName = item.product_name || 'Bilinmeyen Ürün';
      
      if (!productMap.has(productId)) {
        // Get current stock for this product
        const stock = allStocks.find(s => s.product_id === productId);
        productMap.set(productId, {
          product_id: productId,
          product_name: productName,
          quantity: 0,
          revenue: 0,
          profit: 0,
          cashTotal: 0,
          cardTotal: 0,
          currentStock: stock ? (stock.quantity || 0) : 0
        });
      }

      const stat = productMap.get(productId);
      stat.quantity += item.actualQuantity;
      stat.revenue += item.saleAmount;
      
      const itemProfit = (item.unit_price - (item.purchase_price || 0)) * item.actualQuantity;
      stat.profit += itemProfit;
      
      stat.cashTotal += item.saleAmount * item.cashRatio;
      stat.cardTotal += item.saleAmount * item.cardRatio;
    });

    productStats = Array.from(productMap.values());

    // Sort by selected column
    sortProducts();
  }

  function sortProducts() {
    productStats.sort((a, b) => {
      let valueA, valueB;

      switch (sortColumn) {
        case 'revenue':
          valueA = a.revenue;
          valueB = b.revenue;
          break;
        case 'profit':
          valueA = a.profit;
          valueB = b.profit;
          break;
        case 'card':
          valueA = a.cardTotal;
          valueB = b.cardTotal;
          break;
        case 'cash':
          valueA = a.cashTotal;
          valueB = b.cashTotal;
          break;
        case 'stock':
          valueA = a.currentStock;
          valueB = b.currentStock;
          break;
        case 'name':
          valueA = a.product_name.toLowerCase();
          valueB = b.product_name.toLowerCase();
          break;
        default:
          valueA = a.revenue;
          valueB = b.revenue;
      }

      if (sortColumn === 'name') {
        return sortDirection === 'desc' 
          ? valueB.localeCompare(valueA, 'tr')
          : valueA.localeCompare(valueB, 'tr');
      }

      return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
    });
  }

  function handleColumnClick(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortColumn = column;
      sortDirection = 'desc';
    }
    sortProducts();
  }

  async function loadStockData() {
    const stocks = await stockRepo.findAll();
    const products = await productRepo.findAll();
    
    stockData = stocks.map(stock => {
      const product = products.find(p => p.id === stock.product_id);
      if (!product) return null;
      
      const quantity = stock.quantity || 0;
      const purchasePrice = product.purchase_price || product.cost_price || 0;
      const salePrice = product.sale_price || product.price || 0;
      
      return {
        ...stock,
        product_name: product.name,
        barcode: product.barcode,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        quantity: quantity,
        purchase_value: quantity * purchasePrice,
        sale_value: quantity * salePrice,
        potential_profit: quantity * (salePrice - purchasePrice)
      };
    }).filter(item => item !== null && item.quantity > 0);

    stockSummary.totalPurchaseValue = stockData.reduce((sum, item) => sum + item.purchase_value, 0);
    stockSummary.totalSaleValue = stockData.reduce((sum, item) => sum + item.sale_value, 0);
    stockSummary.totalPotentialProfit = stockData.reduce((sum, item) => sum + item.potential_profit, 0);
  }

  function getDateRange() {
    const now = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let startDate;

    if (dateFilter === 'custom' && customDate) {
      // Custom date selected
      const selectedDate = new Date(customDate);
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
      endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
    } else {
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
    }

    return { startDate, endDate };
  }

  function handleTabChange(tab) {
    activeTab = tab;
    loadData();
  }

  function handleDateFilterChange() {
    if (dateFilter !== 'custom') {
      customDate = '';
    }
    loadData();
  }

  function handleCustomDateChange() {
    if (customDate) {
      dateFilter = 'custom';
      loadData();
    }
  }

  function formatCurrency(amount, hideForStaff = false) {
    if (hideForStaff && $user && $user.role !== 'admin') {
      return 'XXX';
    }
    return '₺' + amount.toFixed(2);
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('tr-TR');
  }

  function getSortIcon(column) {
    if (sortColumn !== column) return '↕️';
    return sortDirection === 'desc' ? '↓' : '↑';
  }

  function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTotalProfit() {
    return productStats.reduce((sum, p) => sum + p.profit, 0);
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
        <option value="custom">Özel Tarih Seç</option>
      </select>
      <input 
        type="date" 
        bind:value={customDate} 
        on:change={handleCustomDateChange}
        placeholder="Tarih seçin"
        class="date-picker"
        title="Takvimden gün seçin"
      />
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
      class="tab {activeTab === 'products' ? 'active' : ''}"
      on:click={() => handleTabChange('products')}
    >
      📈 İstatistikler
    </button>
    <button
      class="tab {activeTab === 'stock' ? 'active' : ''}"
      on:click={() => handleTabChange('stock')}
    >
      📦 Stok Durumu
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
            <span class="card-value">{formatCurrency(summary.totalRevenue, true)}</span>
          </div>
        </div>

        <div class="summary-card profit">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <span class="card-label">Toplam Kar</span>
            <span class="card-value">{formatCurrency(summary.totalProfit, true)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">💵</div>
          <div class="card-content">
            <span class="card-label">Nakit</span>
            <span class="card-value">{formatCurrency(summary.cashTotal, true)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">💳</div>
          <div class="card-content">
            <span class="card-label">Kart</span>
            <span class="card-value">{formatCurrency(summary.cardTotal, true)}</span>
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
              <div>Durum</div>
            </div>

            {#each salesData as sale}
              <div class="table-row">
                <div class="receipt-number">{sale.receipt_number}</div>
                <div>{formatDateTime(sale.created_at)}</div>
                <div>{sale.items?.length || 0} adet</div>
                <div class="amount">{formatCurrency(sale.final_amount, true)}</div>
                <div>
                  {#each sale.payments as payment}
                    <span class="payment-badge {payment.method}">
                      {payment.method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                    </span>
                  {/each}
                </div>
                <div>
                  {#if sale.refund_status === 'full'}
                    <span class="status-badge refunded">🔄 Tam İade</span>
                  {:else if sale.refund_status === 'partial'}
                    <span class="status-badge partial-refund">⚠️ Kısmi İade</span>
                  {:else}
                    <span class="status-badge normal">✅ Normal</span>
                  {/if}
                  {#if sale.synced}
                    <span class="status-badge synced" style="margin-left: 5px;">📡 Senkron</span>
                  {:else}
                    <span class="status-badge pending" style="margin-left: 5px;">⏳ Bekliyor</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'products'}
      <!-- Product Stats Table -->
      <div class="data-table-container">
        <h3>Ürün Bazlı Satış İstatistikleri</h3>
        {#if productStats.length === 0}
          <div class="empty-state">
            <p>Bu tarih aralığında ürün satışı bulunamadı.</p>
          </div>
        {:else}
          <div class="data-table">
            <div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;">
              <div class="sortable-header" on:click={() => handleColumnClick('name')}>
                Ürün İsmi {getSortIcon('name')}
              </div>
              <div class="sortable-header" on:click={() => handleColumnClick('revenue')}>
                Ciro {getSortIcon('revenue')}
              </div>
              <div class="sortable-header" on:click={() => handleColumnClick('profit')}>
                Kar {getSortIcon('profit')}
              </div>
              <div class="sortable-header" on:click={() => handleColumnClick('card')}>
                Kart {getSortIcon('card')}
              </div>
              <div class="sortable-header" on:click={() => handleColumnClick('cash')}>
                Nakit {getSortIcon('cash')}
              </div>
              <div class="sortable-header" on:click={() => handleColumnClick('stock')}>
                Stok {getSortIcon('stock')}
              </div>
            </div>

            {#each productStats as product}
              <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;">
                <div class="product-name">{product.product_name}</div>
                <div class="amount">{formatCurrency(product.revenue, true)}</div>
                <div class="amount profit-value">{formatCurrency(product.profit, true)}</div>
                <div class="amount">{formatCurrency(product.cardTotal, true)}</div>
                <div class="amount">{formatCurrency(product.cashTotal, true)}</div>
                <div class="quantity">{product.currentStock} adet</div>
              </div>
            {/each}

            <!-- Totals Row -->
            <div class="table-row totals-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;">
              <div class="totals-label"><strong>TOPLAM</strong></div>
              <div class="amount"><strong>{formatCurrency(productStats.reduce((sum, p) => sum + p.revenue, 0), true)}</strong></div>
              <div class="amount profit-value"><strong>{formatCurrency(getTotalProfit(), true)}</strong></div>
              <div class="amount"><strong>{formatCurrency(productStats.reduce((sum, p) => sum + p.cardTotal, 0), true)}</strong></div>
              <div class="amount"><strong>{formatCurrency(productStats.reduce((sum, p) => sum + p.cashTotal, 0), true)}</strong></div>
              <div></div>
            </div>
          </div>
        {/if}
      </div>

    {:else if activeTab === 'stock'}
      <!-- Stock Summary -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <span class="card-label">Toplam Alış Değeri</span>
            <span class="card-value">{formatCurrency(stockSummary.totalPurchaseValue, true)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">💵</div>
          <div class="card-content">
            <span class="card-label">Toplam Satış Değeri</span>
            <span class="card-value">{formatCurrency(stockSummary.totalSaleValue, true)}</span>
          </div>
        </div>

        <div class="summary-card profit">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <span class="card-label">Toplam Potansiyel Kar</span>
            <span class="card-value">{formatCurrency(stockSummary.totalPotentialProfit, true)}</span>
          </div>
        </div>
      </div>

      <!-- Stock Table -->
      <div class="data-table-container">
        <h3>Mevcut Stok Detayları</h3>
        {#if stockData.length === 0}
          <div class="empty-state">
            <p>Stokta ürün bulunamadı.</p>
          </div>
        {:else}
          <div class="data-table">
            <div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;">
              <div>Ürün Adı</div>
              <div>Barkod</div>
              <div>Miktar</div>
              <div>Alış Fiyatı</div>
              <div>Satış Fiyatı</div>
              <div>Alış Değeri</div>
              <div>Satış Değeri</div>
            </div>

            {#each stockData as item}
              <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;">
                <div class="product-name">{item.product_name}</div>
                <div class="barcode">{item.barcode}</div>
                <div class="quantity">{item.quantity} adet</div>
                <div>{formatCurrency(item.purchase_price, true)}</div>
                <div>{formatCurrency(item.sale_price, true)}</div>
                <div class="amount">{formatCurrency(item.purchase_value, true)}</div>
                <div class="amount sale-value">{formatCurrency(item.sale_value, true)}</div>
              </div>
            {/each}

            <!-- Totals Row -->
            <div class="table-row totals-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;">
              <div class="totals-label"><strong>TOPLAM</strong></div>
              <div></div>
              <div><strong>{stockData.reduce((sum, item) => sum + item.quantity, 0)} adet</strong></div>
              <div></div>
              <div></div>
              <div class="amount"><strong>{formatCurrency(stockSummary.totalPurchaseValue, true)}</strong></div>
              <div class="amount sale-value"><strong>{formatCurrency(stockSummary.totalSaleValue, true)}</strong></div>
            </div>
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

  .date-picker {
    padding: 10px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    background: white;
  }

  .date-picker:focus {
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
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

  .sortable-header {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: background 0.2s;
  }

  .sortable-header:hover {
    background: #e9ecef;
    border-radius: 4px;
    padding: 5px;
    margin: -5px;
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

  .profit-value {
    color: #2e7d32;
    font-weight: 700;
  }

  .payment-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    margin-right: 5px;
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

  .status-badge.refunded {
    background: #ffebee;
    color: #c62828;
  }

  .status-badge.partial-refund {
    background: #fff8e1;
    color: #f57c00;
  }

  .status-badge.normal {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .product-name {
    font-weight: 600;
    color: #333;
  }

  .barcode {
    font-family: monospace;
    font-size: 13px;
    color: #666;
  }

  .quantity {
    font-weight: 600;
    color: #667eea;
  }

  .sale-value {
    color: #4caf50;
  }

  .totals-row {
    background: #f8f9fa !important;
    border-top: 3px solid #667eea;
    font-weight: 600;
    margin-top: 10px;
  }

  .totals-row:hover {
    background: #f0f0f0 !important;
  }

  .totals-label {
    color: #667eea;
  }
</style>
