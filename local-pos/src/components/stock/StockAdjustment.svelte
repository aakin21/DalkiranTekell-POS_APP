<script>
  import { get } from 'svelte/store';
  import { user, deviceConfig } from '../../stores/appStore.js';
  import { productRepo, stockRepo, stockAdjustmentRepo } from '../../lib/db/database.js';
  import { v4 as uuidv4 } from 'uuid';

  let searchQuery = '';
  let products = [];
  let selectedProduct = null;
  let adjustmentType = 'add'; // add, remove, set
  let quantity = 0;
  let showConfirmModal = false;
  let success = false;

  // Price Update
  let editSalePrice = 0;
  let editPurchasePrice = 0;
  let showPriceSection = false;

  // New Product Modal
  let showNewProductModal = false;
  let newProductBarcode = '';
  let newProductName = '';
  let newProductSalePrice = '';
  let newProductPurchasePrice = '';
  let newProductInitialStock = '';
  let barcodeInputElement;

  async function searchProducts() {
    if (!searchQuery || searchQuery.trim().length === 0) {
      products = await productRepo.findAll();
      return;
    }
    products = await productRepo.search(searchQuery.trim());
  }

  async function selectProduct(product) {
    selectedProduct = product;

    // Get current stock for this product
    const config = get(deviceConfig);
    const stock = await stockRepo.findByProductAndStore(product.id, config.store_id);

    if (stock) {
      selectedProduct.current_stock = stock.quantity;
    } else {
      selectedProduct.current_stock = 0;
    }

    // Set prices for editing
    editSalePrice = product.sale_price || 0;
    editPurchasePrice = product.purchase_price || 0;
    showPriceSection = false;

    // Reset form
    adjustmentType = 'add';
    quantity = 0;
  }

  function calculateNewStock() {
    const current = selectedProduct.current_stock || 0;

    switch (adjustmentType) {
      case 'add':
        return current + quantity;
      case 'remove':
        return Math.max(0, current - quantity);
      case 'set':
        return quantity;
      default:
        return current;
    }
  }

  function canProceed() {
    return selectedProduct &&
           quantity > 0 &&
           (adjustmentType !== 'remove' || quantity <= selectedProduct.current_stock);
  }

  function openConfirmModal() {
    if (!canProceed()) {
      return;
    }

    showConfirmModal = true;
  }

  async function processAdjustment() {
    try {
      const config = get(deviceConfig);
      const currentUser = get(user);
      const newStockValue = calculateNewStock();

      // Log the adjustment
      await stockAdjustmentRepo.create({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        store_id: config.store_id,
        user_id: currentUser.id,
        device_id: config.device_id,
        adjustment_type: adjustmentType,
        quantity: quantity,
        old_quantity: selectedProduct.current_stock,
        new_quantity: newStockValue
      });

      // Actually update the stock in database
      await stockRepo.updateQuantity(selectedProduct.id, newStockValue);

      showConfirmModal = false;
      success = true;

      // Update local stock display
      selectedProduct.current_stock = newStockValue;

      setTimeout(() => {
        resetForm();
      }, 3000);

    } catch (error) {
      console.error('Stok ayarlama hatası:', error);
    }
  }

  function resetForm() {
    selectedProduct = null;
    adjustmentType = 'add';
    quantity = 0;
    success = false;
    searchQuery = '';
    products = [];
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      searchProducts();
    }
  }

  // New Product Functions
  function openNewProductModal() {
    newProductBarcode = '';
    newProductName = '';
    newProductSalePrice = '';
    newProductPurchasePrice = '';
    newProductInitialStock = '';
    showNewProductModal = true;
  }

  function handleBarcodeInput(event) {
    if (event.key === 'Enter' && newProductBarcode.trim()) {
      event.preventDefault();
    }
  }

  async function saveNewProduct() {
    // Validation
    if (!newProductName || !newProductSalePrice) {
      alert('Ürün adı ve satış fiyatı zorunludur!');
      return;
    }

    const salePrice = parseFloat(newProductSalePrice);
    const purchasePrice = newProductPurchasePrice ? parseFloat(newProductPurchasePrice) : 0;
    const initialStock = newProductInitialStock ? parseInt(newProductInitialStock) : 0;

    if (isNaN(salePrice) || salePrice <= 0) {
      return;
    }

    try {
      const config = get(deviceConfig);

      // Barkodsuz ürünler için benzersiz barcode oluştur
      let finalBarcode = newProductBarcode.trim();
      if (!finalBarcode || finalBarcode === '') {
        // Barkod girilmemişse, benzersiz bir barcode oluştur
        finalBarcode = `BARCODESIZ-${uuidv4().substring(0, 8).toUpperCase()}`;
      } else if (finalBarcode === 'BARCODESIZ') {
        // Eğer sadece "BARCODESIZ" yazılmışsa, benzersiz yap
        finalBarcode = `BARCODESIZ-${uuidv4().substring(0, 8).toUpperCase()}`;
      }

      // Check if barcode already exists
      const existingProduct = await productRepo.findByBarcode(finalBarcode);
      if (existingProduct) {
        alert('Bu barkod zaten kullanılıyor!');
        return;
      }

      // Save product
      const productId = await productRepo.upsert({
        barcode: finalBarcode,
        name: newProductName.trim(),
        category_id: null,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        is_active: 1
      });

      // Set initial stock if provided
      if (initialStock > 0) {
        await stockRepo.updateQuantity(productId, initialStock);
      }

      // Close modal and refresh list
      showNewProductModal = false;
      await searchProducts();

    } catch (error) {
      console.error('Ürün kaydetme hatası:', error);
    }
  }

  function cancelNewProduct() {
    showNewProductModal = false;
  }

  async function updatePrices() {
    if (!selectedProduct) return;

    const salePrice = parseFloat(editSalePrice);
    const purchasePrice = parseFloat(editPurchasePrice);

    if (isNaN(salePrice) || salePrice <= 0) {
      return;
    }

    if (isNaN(purchasePrice) || purchasePrice < 0) {
      return;
    }

    try {
      // Update product prices
      await productRepo.upsert({
        id: selectedProduct.id,
        barcode: selectedProduct.barcode,
        name: selectedProduct.name,
        category_id: selectedProduct.category_id,
        sale_price: salePrice,
        purchase_price: purchasePrice,
        is_active: selectedProduct.is_active
      });

      // Update local selected product
      selectedProduct.sale_price = salePrice;
      selectedProduct.purchase_price = purchasePrice;

      // Refresh product list
      await searchProducts();

      // Close price section
      showPriceSection = false;

    } catch (error) {
      console.error('Fiyat güncelleme hatası:', error);
    }
  }

  async function deleteProduct() {
    if (!selectedProduct) return;

    const confirmed = confirm(`Bu ürünü silmek istediğinizden emin misiniz?\n\nÜrün: ${selectedProduct.name}\nBarkod: ${selectedProduct.barcode}\n\n⚠️ Bu işlem geri alınamaz!`);

    if (!confirmed) return;

    try {
      // Delete product
      await productRepo.delete(selectedProduct.id);

      // Refresh product list
      await searchProducts();

      // Clear selection
      selectedProduct = null;

    } catch (error) {
      console.error('Ürün silme hatası:', error);
    }
  }

  // Load all products on mount
  import { onMount } from 'svelte';
  onMount(async () => {
    products = await productRepo.findAll();
  });
</script>

<div class="stock-adjustment">
  <div class="header">
    <div class="header-left">
      <h2>📦 Stok Ayarlama</h2>
      <p class="admin-badge">👤 Yönetici Paneli</p>
    </div>
    <button class="btn-add-product" on:click={openNewProductModal}>
      ➕ Yeni Ürün Ekle
    </button>
  </div>

  {#if success}
    <div class="success-banner">
      ✅ Stok ayarlama işlemi başarıyla tamamlandı!
    </div>
  {/if}

  <div class="content-grid">
    <!-- Product Search Panel -->
    <div class="search-panel">
      <h3>🔍 Ürün Ara</h3>

      <div class="search-box">
        <input
          type="text"
          bind:value={searchQuery}
          on:keypress={handleKeyPress}
          on:input={searchProducts}
          placeholder="Ürün adı veya barkod ile ara..."
          class="search-input"
        />
        <button class="btn-search" on:click={searchProducts}>
          Ara
        </button>
      </div>

      <div class="product-list">
        {#if products.length === 0}
          <div class="empty-message">
            {#if searchQuery}
              Ürün bulunamadı
            {:else}
              <p>📦 Henüz ürün yok</p>
              <small>Satış ekranında barkod okutarak ürün ekleyin</small>
            {/if}
          </div>
        {:else}
          {#each products as product}
            <div
              class="product-item {selectedProduct?.id === product.id ? 'selected' : ''}"
              on:click={() => selectProduct(product)}
            >
              <div class="product-info">
                <strong>{product.name}</strong>
                <small>{product.barcode}</small>
                <span class="category">{product.category_name || 'Kategori yok'}</span>
              </div>
              <div class="product-price">
                ₺{product.sale_price.toFixed(2)}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Adjustment Form Panel -->
    <div class="adjustment-panel">
      {#if selectedProduct}
        <div class="selected-product">
          <h3>📝 Stok Ayarlama Formu</h3>

          <div class="product-card">
            <div class="product-header">
              <div>
                <h4>{selectedProduct.name}</h4>
                <p class="barcode">{selectedProduct.barcode}</p>
              </div>
              <button class="btn-deselect" on:click={resetForm}>
                ✕
              </button>
            </div>

            <div class="stock-info">
              <div class="stock-badge">
                Mevcut Stok: <strong>{selectedProduct.current_stock}</strong> adet
              </div>
              <div class="price-info">
                <div class="price-item">
                  <span class="price-label">Alış:</span>
                  <span class="price-value">₺{selectedProduct.purchase_price?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="price-item">
                  <span class="price-label">Satış:</span>
                  <span class="price-value sale">₺{selectedProduct.sale_price?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Price Update Section -->
          <div class="price-update-section">
            <button
              class="btn-toggle-price"
              on:click={() => showPriceSection = !showPriceSection}
            >
              {showPriceSection ? '📉 Fiyat Güncellemeyi Gizle' : '💰 Fiyat Güncelle'}
            </button>

            {#if showPriceSection}
              <div class="price-form">
                <div class="price-row">
                  <div class="price-field">
                    <label>Alış Fiyatı (₺):</label>
                    <input
                      type="number"
                      bind:value={editPurchasePrice}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="price-input"
                    />
                  </div>

                  <div class="price-field">
                    <label>Satış Fiyatı (₺):</label>
                    <input
                      type="number"
                      bind:value={editSalePrice}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="price-input"
                    />
                  </div>
                </div>

                <button class="btn-update-price" on:click={updatePrices}>
                  ✅ Fiyatları Güncelle
                </button>
              </div>
            {/if}
          </div>

          <div class="form-section">
            <label>İşlem Tipi:</label>
            <div class="adjustment-types">
              <label class="radio-option {adjustmentType === 'add' ? 'active' : ''}">
                <input
                  type="radio"
                  bind:group={adjustmentType}
                  value="add"
                />
                <span>➕ Stok Ekle</span>
              </label>

              <label class="radio-option {adjustmentType === 'remove' ? 'active' : ''}">
                <input
                  type="radio"
                  bind:group={adjustmentType}
                  value="remove"
                />
                <span>➖ Stok Çıkar</span>
              </label>

              <label class="radio-option {adjustmentType === 'set' ? 'active' : ''}">
                <input
                  type="radio"
                  bind:group={adjustmentType}
                  value="set"
                />
                <span>🔄 Stok Belirle</span>
              </label>
            </div>
          </div>

          <div class="form-section">
            <label for="quantity-input">Miktar:</label>
            <input
              id="quantity-input"
              type="number"
              bind:value={quantity}
              min="0"
              max={adjustmentType === 'remove' ? selectedProduct.current_stock : undefined}
              placeholder="0"
              class="quantity-input"
            />

            {#if adjustmentType === 'add'}
              <small>Eklenecek miktar</small>
            {:else if adjustmentType === 'remove'}
              <small>Çıkarılacak miktar (maksimum: {selectedProduct.current_stock})</small>
            {:else}
              <small>Yeni stok miktarı</small>
            {/if}
          </div>

          {#if quantity > 0}
            <div class="preview-section">
              <div class="preview-box">
                <div class="preview-item">
                  <span>Mevcut Stok:</span>
                  <strong>{selectedProduct.current_stock} adet</strong>
                </div>
                <div class="preview-arrow">→</div>
                <div class="preview-item new">
                  <span>Yeni Stok:</span>
                  <strong>{calculateNewStock()} adet</strong>
                </div>
              </div>
            </div>
          {/if}

          <button
            class="btn-submit"
            on:click={openConfirmModal}
            disabled={!canProceed()}
          >
            ✅ Stok Ayarlama Yap
          </button>

          <button
            class="btn-delete-product"
            on:click={deleteProduct}
          >
            🗑️ Ürünü Sil
          </button>
        </div>
      {:else}
        <div class="no-selection">
          <div class="icon">📦</div>
          <h3>Ürün Seçin</h3>
          <p>Stok ayarlama yapmak için sol taraftan bir ürün seçin.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Confirmation Modal -->
{#if showConfirmModal && selectedProduct}
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2>⚠️ Stok Ayarlama Onayı</h2>
        <button class="btn-close" on:click={() => showConfirmModal = false}>✕</button>
      </div>

      <div class="modal-body">
        <div class="confirmation-details">
          <h3>Ayarlama Detayları</h3>

          <div class="detail-grid">
            <div class="detail-item">
              <span>Ürün:</span>
              <strong>{selectedProduct.name}</strong>
            </div>
            <div class="detail-item">
              <span>Barkod:</span>
              <strong>{selectedProduct.barcode}</strong>
            </div>
            <div class="detail-item">
              <span>İşlem Tipi:</span>
              <strong>
                {#if adjustmentType === 'add'}
                  ➕ Stok Ekle
                {:else if adjustmentType === 'remove'}
                  ➖ Stok Çıkar
                {:else}
                  🔄 Stok Belirle
                {/if}
              </strong>
            </div>
            <div class="detail-item">
              <span>Miktar:</span>
              <strong>{quantity} adet</strong>
            </div>
          </div>

          <div class="stock-change-display">
            <div class="old-stock">
              <small>Mevcut</small>
              <span>{selectedProduct.current_stock}</span>
            </div>
            <div class="arrow">→</div>
            <div class="new-stock">
              <small>Yeni</small>
              <span>{calculateNewStock()}</span>
            </div>
          </div>

          <div class="warning-box">
            ⚠️ Bu işlem geri alınamaz ve audit log'a kaydedilecektir.
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={() => showConfirmModal = false}>
          İptal
        </button>
        <button class="btn-confirm" on:click={processAdjustment}>
          ✅ Onayla ve Uygula
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- New Product Modal -->
{#if showNewProductModal}
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2>➕ Yeni Ürün Ekle</h2>
        <button class="btn-close" on:click={cancelNewProduct}>✕</button>
      </div>

      <div class="modal-body">
        <div class="form-section">
          <label>Barkod Numarası: *</label>
          <input
            bind:this={barcodeInputElement}
            type="text"
            bind:value={newProductBarcode}
            on:keypress={handleBarcodeInput}
            placeholder="Barkod okutun veya girin"
            class="input-field"
            autofocus
          />
        </div>

        <div class="form-section">
          <label>Ürün Adı: *</label>
          <input
            type="text"
            bind:value={newProductName}
            placeholder="Örn: Coca Cola 330ml"
            class="input-field"
          />
        </div>

        <div class="form-row">
          <div class="form-section">
            <label>Satış Fiyatı (₺): *</label>
            <input
              type="number"
              bind:value={newProductSalePrice}
              placeholder="0.00"
              step="0.01"
              min="0"
              class="input-field"
            />
          </div>

          <div class="form-section">
            <label>Alış Fiyatı (₺):</label>
            <input
              type="number"
              bind:value={newProductPurchasePrice}
              placeholder="0.00"
              step="0.01"
              min="0"
              class="input-field"
            />
          </div>
        </div>

        <div class="form-section">
          <label>Başlangıç Stok Miktarı:</label>
          <input
            type="number"
            bind:value={newProductInitialStock}
            placeholder="0"
            min="0"
            class="input-field"
          />
          <small style="color: #666; margin-top: 5px; display: block;">
            İsteğe bağlı - Daha sonra stok ayarlama yapabilirsiniz
          </small>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={cancelNewProduct}>
          İptal
        </button>
        <button class="btn-confirm" on:click={saveNewProduct}>
          ✅ Ürünü Kaydet
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .stock-adjustment {
    padding: 15px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .header-left {
    display: flex;
    flex-direction: column;
  }

  .header h2 {
    margin: 0;
    font-size: 22px;
    color: #333;
  }

  .admin-badge {
    background: #ff9800;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 14px;
  }

  .btn-add-product {
    padding: 12px 24px;
    background: #4caf50;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;
  }

  .btn-add-product, .btn-add-product * {
    color: white !important;
  }

  .btn-add-product:hover {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
  }

  .success-banner {
    background: #4caf50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-weight: 600;
    text-align: center;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .content-grid {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 15px;
    flex: 1;
    min-height: 0;
  }

  .search-panel {
    background: white;
    padding: 15px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .search-panel h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #333;
  }

  .search-box {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
  }

  .search-input {
    flex: 1;
    padding: 10px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
  }

  .search-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn-search {
    padding: 10px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .product-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .empty-message {
    text-align: center;
    color: #999;
    padding: 40px 20px;
  }

  .product-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .product-item:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }

  .product-item.selected {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
  }

  .product-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .product-info strong {
    font-size: 14px;
  }

  .product-info small {
    font-size: 12px;
    opacity: 0.7;
  }

  .product-item.selected .product-info small,
  .product-item.selected .category {
    opacity: 0.9;
  }

  .category {
    font-size: 11px;
    opacity: 0.6;
  }

  .product-price {
    font-weight: 600;
    font-size: 14px;
  }

  .adjustment-panel {
    background: white;
    padding: 15px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow-y: auto;
    min-height: 0;
  }

  .selected-product h3 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #333;
  }

  .product-card {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 25px;
  }

  .product-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 15px;
  }

  .product-header h4 {
    margin: 0 0 5px 0;
    font-size: 18px;
    color: #333;
  }

  .barcode {
    margin: 0;
    color: #666;
    font-size: 13px;
    font-family: monospace;
  }

  .btn-deselect {
    background: #f5f5f5;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 18px;
    color: #999;
  }

  .btn-deselect:hover {
    background: #e0e0e0;
    color: #333;
  }

  .stock-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .stock-badge {
    background: white;
    padding: 10px 15px;
    border-radius: 6px;
    font-size: 14px;
  }

  .price-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .price-item {
    background: white;
    padding: 10px 15px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .price-label {
    font-size: 12px;
    color: #666;
  }

  .price-value {
    font-size: 16px;
    font-weight: 700;
    color: #667eea;
  }

  .price-value.sale {
    color: #4caf50;
  }

  /* Price Update Section */
  .price-update-section {
    margin-bottom: 25px;
  }

  .btn-toggle-price {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-toggle-price:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }

  .price-form {
    margin-top: 15px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #e0e0e0;
  }

  .price-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
  }

  .price-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .price-field label {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  .price-input {
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
  }

  .price-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn-update-price {
    width: 100%;
    padding: 12px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-update-price:hover {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
  }

  .form-section {
    margin-bottom: 20px;
  }

  .form-section label {
    display: block;
    font-weight: 600;
    margin-bottom: 10px;
    color: #333;
  }

  .form-section small {
    display: block;
    margin-top: 5px;
    color: #666;
    font-size: 12px;
  }

  .adjustment-types {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .radio-option:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }

  .radio-option.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
  }

  .radio-option input {
    cursor: pointer;
  }

  .quantity-input {
    width: 100%;
    padding: 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

  .quantity-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .reason-textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
  }

  .reason-textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  .preview-section {
    margin: 20px 0;
  }

  .preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .preview-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .preview-item span {
    font-size: 13px;
    color: #666;
  }

  .preview-item strong {
    font-size: 24px;
    color: #333;
  }

  .preview-item.new strong {
    color: #4caf50;
  }

  .preview-arrow {
    font-size: 28px;
    color: #667eea;
  }

  .btn-submit {
    width: 100%;
    padding: 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-submit:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
  }

  .btn-submit:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .btn-delete-product {
    width: 100%;
    padding: 14px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 12px;
  }

  .btn-delete-product:hover {
    background: #d32f2f;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
  }

  .no-selection {
    text-align: center;
    padding: 80px 40px;
  }

  .no-selection .icon {
    font-size: 80px;
    margin-bottom: 20px;
  }

  .no-selection h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 24px;
  }

  .no-selection p {
    margin: 0;
    color: #666;
    font-size: 16px;
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
    max-width: 600px;
    max-height: 90vh;
    overflow: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
  }

  .modal-header h2 {
    margin: 0;
    color: #333;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  }

  .btn-close:hover {
    color: #333;
  }

  .modal-body {
    padding: 20px;
  }

  .confirmation-details h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .detail-item.full-width {
    grid-column: 1 / -1;
  }

  .detail-item span {
    font-size: 12px;
    color: #666;
  }

  .detail-item strong {
    font-size: 14px;
    color: #333;
  }

  .stock-change-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 15px;
  }

  .old-stock, .new-stock {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .old-stock small, .new-stock small {
    font-size: 12px;
    color: #666;
  }

  .old-stock span, .new-stock span {
    font-size: 32px;
    font-weight: 700;
  }

  .old-stock span {
    color: #666;
  }

  .new-stock span {
    color: #4caf50;
  }

  .arrow {
    font-size: 28px;
    color: #667eea;
  }

  .warning-box {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
    text-align: center;
  }

  .modal-footer {
    padding: 20px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
  }

  .btn-cancel, .btn-confirm {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-cancel {
    background: #f5f5f5;
    color: #333;
  }

  .btn-cancel:hover {
    background: #e0e0e0;
  }

  .btn-confirm {
    background: #4caf50;
    color: white;
  }

  .btn-confirm:hover {
    background: #45a049;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .input-field {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s;
  }

  .input-field:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
</style>
