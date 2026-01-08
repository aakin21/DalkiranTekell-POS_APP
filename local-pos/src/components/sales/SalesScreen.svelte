<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { cart, cartTotal, addToCart, removeFromCart, updateCartQuantity, clearCart, user, deviceConfig } from '../../stores/appStore.js';
  import { productRepo, saleRepo, stockRepo } from '../../lib/db/database.js';
  import { v4 as uuidv4 } from 'uuid';

  let barcodeInput = '';
  let barcodelessProducts = [];
  let barcodeInputElement;
  let showNewProductModal = false;
  let isBarcodeless = false;
  let selectedQuantity = 1; // Sepette seçili miktar (1-10)
  let isProcessingSale = false; // Satış işlemi devam ediyor mu
  let lastSaleTime = 0; // Son satış zamanı (timestamp)
  let saleDebounceTimer = null; // Debounce timer

  // New Product Modal State
  let newProductBarcode = '';
  let newProductName = '';
  let newProductSalePrice = '';
  let newProductPurchasePrice = '';
  let newProductStock = '';

  onMount(async () => {
    await loadBarcodelessProducts();
    // Auto-focus barcode input
    if (barcodeInputElement) {
      barcodeInputElement.focus();
    }

    // Keyboard shortcuts - Debounce ile korumalı
    const handleKeyPress = (event) => {
      // Tekrarlanan tuş basışlarını engelle
      if (event.repeat) {
        return;
      }

      // F1 - Sepeti Sil
      if (event.key === 'F1' || event.code === 'F1') {
        event.preventDefault();
        event.stopPropagation();
        const cartItems = get(cart);
        if (cartItems.length > 0 && !isProcessingSale) {
          clearCart();
        }
        return;
      }

      // F3 - Nakit veya F4 - Kart
      if ((event.key === 'F3' || event.code === 'F3') || (event.key === 'F4' || event.code === 'F4')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // ÇOKLU KORUMA: Her türlü durumda engelle
        const now = Date.now();
        const timeSinceLastSale = now - lastSaleTime;
        
        // 1. İşlem zaten devam ediyorsa hiçbir şey yapma
        if (isProcessingSale) {
          console.log('🚫 Satış zaten işleniyor, event engellendi');
          return;
        }

        // 2. Son satıştan beri 1 saniyeden az geçtiyse engelle
        if (timeSinceLastSale < 1000) {
          console.log('🚫 Çok hızlı tuş basışı engellendi:', timeSinceLastSale, 'ms');
          return;
        }

        // 3. Debounce: Eğer zaten bir timer varsa iptal et
        if (saleDebounceTimer) {
          clearTimeout(saleDebounceTimer);
          saleDebounceTimer = null;
        }

        // 4. Sepet kontrolü
        const cartItems = get(cart);
        if (!cartItems || cartItems.length === 0) {
          return;
        }

        // 5. Payment method belirle
        const paymentMethod = (event.key === 'F3' || event.code === 'F3') ? 'cash' : 'card';

        // 6. Debounce ile işlemi başlat (100ms gecikme ile)
        saleDebounceTimer = setTimeout(() => {
          saleDebounceTimer = null;
          lastSaleTime = Date.now();
          completeSale(paymentMethod);
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      // Cleanup: Debounce timer'ı temizle
      if (saleDebounceTimer) {
        clearTimeout(saleDebounceTimer);
        saleDebounceTimer = null;
      }
    };
  });

  async function loadBarcodelessProducts() {
    const allProducts = await productRepo.findAll();
    // Barkodsuz ürünler: barcode yok, "BARCODESIZ" veya "BARCODESIZ-XXXX" ile başlayan
    barcodelessProducts = allProducts.filter(p => 
      !p.barcode || 
      p.barcode === 'BARCODESIZ' || 
      p.barcode.startsWith('BARCODESIZ-')
    );
  }

  async function loadProducts() {
    products = await productRepo.findAll();
  }

  function handleBarcodeInput(event) {
    if (event.key === 'Enter' && barcodeInput) {
      searchByBarcode(barcodeInput);
      barcodeInput = '';
    }
  }

  async function searchByBarcode(barcode) {
    const product = await productRepo.findByBarcode(barcode);
    if (product) {
      addToCart(product, selectedQuantity);
      playBeep();
      // Miktarı 1'e çek
      selectedQuantity = 1;
    } else {
      // Ürün bulunamadı - Yeni ürün ekleme modal'ını aç
      openNewProductModal(barcode);
    }
  }

  function selectQuantity(qty) {
    selectedQuantity = qty;
  }

  function openNewProductModal(barcode = null) {
    isBarcodeless = !barcode;
    // Barkodsuz ürünler için benzersiz barcode oluştur
    if (!barcode) {
      newProductBarcode = `BARCODESIZ-${uuidv4().substring(0, 8).toUpperCase()}`;
    } else {
      newProductBarcode = barcode;
    }
    newProductName = '';
    newProductSalePrice = '';
    newProductPurchasePrice = '';
    newProductStock = '';
    showNewProductModal = true;
  }

  async function saveNewProduct() {
    // Validation
    if (!newProductName || !newProductSalePrice) {
      console.error('Ürün adı ve satış fiyatı zorunludur!');
      return;
    }

    const salePrice = parseFloat(newProductSalePrice);
    const purchasePrice = newProductPurchasePrice ? parseFloat(newProductPurchasePrice) : 0;

    if (isNaN(salePrice) || salePrice <= 0) {
      console.error('Geçerli bir satış fiyatı girin!');
      return;
    }

    try {
      // Barkodsuz ürünler için benzersiz barcode oluştur (eğer hala "BARCODESIZ" ise)
      let finalBarcode = newProductBarcode;
      if (isBarcodeless && (newProductBarcode === 'BARCODESIZ' || newProductBarcode.startsWith('BARCODESIZ-'))) {
        // Eğer zaten benzersiz değilse, yeni bir tane oluştur
        if (newProductBarcode === 'BARCODESIZ') {
          finalBarcode = `BARCODESIZ-${uuidv4().substring(0, 8).toUpperCase()}`;
        }
      }

      // Ürünü kaydet
      const productId = await productRepo.upsert({
        barcode: finalBarcode,
        name: newProductName.trim(),
        category_id: null,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        is_active: 1
      });

      // Stok ekle (eğer girildiyse)
      if (newProductStock && !isNaN(parseInt(newProductStock))) {
        const stockQty = parseInt(newProductStock);
        if (stockQty > 0) {
          await stockRepo.updateQuantity(productId, stockQty);
        }
      }

      // Ürünü sepete ekle
      const newProduct = await productRepo.findById(productId);
      if (newProduct) {
        addToCart(newProduct, selectedQuantity);
        playBeep();
        // Miktarı 1'e çek
        selectedQuantity = 1;
      }

      // Barkodsuz ürünleri yenile
      await loadBarcodelessProducts();

      // Modal'ı kapat
      showNewProductModal = false;

      // Barkod input'a focus dön
      if (barcodeInputElement) {
        barcodeInputElement.focus();
      }
    } catch (error) {
      console.error('Ürün kaydedilemedi:', error);
    }
  }

  function cancelNewProduct() {
    showNewProductModal = false;
    if (barcodeInputElement) {
      barcodeInputElement.focus();
    }
  }

  function selectProduct(product) {
    // Direkt sepete ekle, seçili miktar kadar
    addToCart(product, selectedQuantity);
    playBeep();
    // Miktarı 1'e çek
    selectedQuantity = 1;
  }

  function handleQuantityChange(productId, newQuantity) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateCartQuantity(productId, parseInt(newQuantity));
    }
  }

  async function completeSale(paymentMethod) {
    // ÇOKLU KORUMA: Her türlü durumda engelle
    if (isProcessingSale) {
      console.log('⚠️ Satış zaten işleniyor, bekleniyor...');
      return;
    }

    const cartItems = get(cart);
    if (!cartItems || cartItems.length === 0) {
      console.log('⚠️ Sepet boş, satış yapılamaz');
      return;
    }

    // İşlemi başlat - EN ERKEN NOKTADA FLAG SET ET
    isProcessingSale = true;
    lastSaleTime = Date.now();
    
    // Debounce timer'ı temizle
    if (saleDebounceTimer) {
      clearTimeout(saleDebounceTimer);
      saleDebounceTimer = null;
    }

    try {
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const total = get(cartTotal);

      const config = get(deviceConfig);
      const currentUser = get(user);

      const saleData = {
        receipt_number: receiptNumber,
        store_id: config.store_id,
        user_id: currentUser.id,
        device_id: config.device_id,
        total_amount: total,
        discount_amount: 0,
        final_amount: total,
        shift_id: null
      };

      const payments = [{
        method: paymentMethod,
        amount: total
      }];

      const saleId = await saleRepo.create(saleData, cartItems, payments);
      console.log('✅ Satış kaydedildi:', saleId);

      // Sepeti temizle
      clearCart();
      selectedQuantity = 1;

      // Focus back to barcode input
      if (barcodeInputElement) {
        barcodeInputElement.focus();
      }

    } catch (error) {
      console.error('❌ Satış kaydedilemedi:', error);
      alert('Satış kaydedilemedi: ' + error.message);
    } finally {
      // Her durumda işlemi bitir
      isProcessingSale = false;
    }
  }

  function playBeep() {
    // Simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }
</script>

<div class="sales-screen">
  <!-- Left Panel: Cart -->
  <div class="left-panel">
    <div class="barcode-section">
      <label>🔍 Barkod Okut:</label>
      <input
        bind:this={barcodeInputElement}
        type="text"
        bind:value={barcodeInput}
        on:keypress={handleBarcodeInput}
        placeholder="Barkod okutun..."
        class="barcode-input"
      />
    </div>

    <!-- Quantity Buttons -->
    <div class="quantity-selection">
      <div class="quantity-buttons">
        {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as qty}
          <button 
            class="quantity-btn {selectedQuantity === qty ? 'active' : ''}"
            on:click={() => selectQuantity(qty)}
          >
            {qty}
          </button>
        {/each}
      </div>
    </div>

    <div class="cart-header">
      <h3>🛒 Sepet</h3>
      {#if $cart.length > 0}
        <button class="btn-clear" on:click={clearCart}>🗑️ Temizle</button>
      {/if}
    </div>

    <div class="cart-items">
      {#if $cart.length === 0}
        <div class="empty-cart">
          <p>Sepet boş</p>
          <small>Barkod okutun veya kategori seçin</small>
        </div>
      {:else}
        {#each $cart as item}
          <div class="cart-item">
            <button class="btn-remove" on:click={() => removeFromCart(item.product_id)}>✕</button>
            <div class="item-details">
              <div class="item-name">{item.product_name}</div>
              <div class="item-price">₺{item.unit_price.toFixed(2)}</div>
            </div>
            <div class="item-quantity">
              <button on:click={() => handleQuantityChange(item.product_id, item.quantity - 1)}>-</button>
              <input
                type="number"
                value={item.quantity}
                on:change={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value))}
                min="1"
              />
              <button on:click={() => handleQuantityChange(item.product_id, item.quantity + 1)}>+</button>
            </div>
            <div class="item-total">₺{item.total_price.toFixed(2)}</div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="cart-footer">
      <div class="cart-summary">
        <div class="summary-row">
          <span>Ürün Sayısı:</span>
          <span>{$cart.reduce((sum, item) => sum + item.quantity, 0)} adet</span>
        </div>
        <div class="summary-row total">
          <span>TOPLAM:</span>
          <span class="total-amount">₺{$cartTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="payment-buttons">
        <button 
          class="btn-payment btn-cash" 
          on:click={() => {
            const now = Date.now();
            if (isProcessingSale || (now - lastSaleTime) < 1000) {
              return;
            }
            lastSaleTime = now;
            completeSale('cash');
          }} 
          disabled={$cart.length === 0 || isProcessingSale}
        >
          💵 Nakit (F3)
        </button>
        <button 
          class="btn-payment btn-card" 
          on:click={() => {
            const now = Date.now();
            if (isProcessingSale || (now - lastSaleTime) < 1000) {
              return;
            }
            lastSaleTime = now;
            completeSale('card');
          }} 
          disabled={$cart.length === 0 || isProcessingSale}
        >
          💳 Kart (F4)
        </button>
      </div>

      <button 
        class="btn-clear-cart" 
        on:click={clearCart} 
        disabled={$cart.length === 0 || isProcessingSale}
      >
        🗑️ Sepeti Sil (F1)
      </button>
    </div>
  </div>

  <!-- Right Panel: Barcodeless Products -->
  <div class="right-panel">
    <div class="category-header">
      <h3>📦 Barkodsuz Ürünler</h3>
      <button class="btn-add-barcodeless" on:click={() => openNewProductModal()}>
        ➕ Yeni Ekle
      </button>
    </div>
    <div class="products-list">
      {#if barcodelessProducts.length === 0}
        <div class="empty-state">
          <p>Henüz barkodsuz ürün yok</p>
          <small>Yukarıdaki "➕ Yeni Ekle" butonuna tıklayarak ekleyin</small>
        </div>
      {:else}
        <div class="products-scroll">
          {#each barcodelessProducts as product}
            <button class="product-card" on:click={() => selectProduct(product)}>
              <div class="product-info">
                <div class="product-name">{product.name}</div>
                <div class="product-barcode">Barkodsuz</div>
              </div>
              <div class="product-price">₺{product.sale_price.toFixed(2)}</div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>



<!-- New Product Modal -->
{#if showNewProductModal}
  <div class="modal-overlay">
    <div class="new-product-modal">
      <div class="modal-header">
        <h2>🆕 Yeni Ürün Ekle</h2>
        <button class="btn-close" on:click={cancelNewProduct}>✕</button>
      </div>

      <div class="modal-body">
        {#if !isBarcodeless}
          <div class="form-group">
            <label>Barkod Numarası:</label>
            <input
              type="text"
              value={newProductBarcode}
              readonly
              class="barcode-display"
            />
          </div>
        {/if}

        <div class="form-group">
          <label>Ürün Adı: *</label>
          <input
            type="text"
            bind:value={newProductName}
            placeholder="Ürün adını girin"
            class="product-input"
            autofocus
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Satış Fiyatı (₺): *</label>
            <input
              type="number"
              bind:value={newProductSalePrice}
              placeholder="0.00"
              step="0.01"
              min="0"
              class="product-input"
            />
          </div>

          <div class="form-group">
            <label>Alış Fiyatı (₺):</label>
            <input
              type="number"
              bind:value={newProductPurchasePrice}
              placeholder="0.00"
              step="0.01"
              min="0"
              class="product-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Başlangıç Stok:</label>
          <input
            type="number"
            bind:value={newProductStock}
            placeholder="0"
            step="1"
            min="0"
            class="product-input"
          />
        </div>

        <div class="help-text">
          * Zorunlu alanlar
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={cancelNewProduct}>İptal</button>
        <button class="btn-save" on:click={saveNewProduct}>
          💾 Kaydet ve Sepete Ekle
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* GENEL YAZILAR SİYAH */
  * {
    color: #000;
  }

  .sales-screen {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    height: calc(100vh - 50px);
    min-height: calc(100vh - 50px);
    padding: 15px;
    background: #f5f5f5;
    overflow: hidden;
  }

  .left-panel, .right-panel {
    background: white;
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .barcode-section {
    margin-bottom: 8px;
  }

  .barcode-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
  }

  .barcode-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #667eea;
    border-radius: 8px;
    font-size: 16px;
  }

  .barcode-input:focus {
    outline: none;
    border-color: #5568d3;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .quantity-selection {
    margin-bottom: 0;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .quantity-selection label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: #333;
  }

  .quantity-buttons {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .quantity-btn {
    padding: 12px 8px;
    font-size: 18px;
    font-weight: 700;
    border: 2px solid #667eea;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: #667eea;
  }

  .quantity-btn:hover {
    background: #667eea;
    color: white;
    transform: scale(1.05);
  }

  .quantity-btn.active {
    background: #667eea;
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .quantity-btn.active, .quantity-btn.active * {
    color: white !important;
  }

  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
    margin-top: 10px;
  }

  .cart-header h3 {
    margin: 0;
    color: #333;
  }

  .btn-clear {
    padding: 8px 12px;
    background: #f44336;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-clear, .btn-clear * {
    color: white !important;
  }

  .btn-clear:hover {
    background: #d32f2f;
  }

  .cart-items {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .empty-cart {
    text-align: center;
    padding: 50px 20px;
  }

  .empty-cart p {
    color: #999;
    margin-bottom: 8px;
  }

  .empty-cart small {
    color: #bbb;
  }

  .cart-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px;
    border-bottom: 1px solid #eee;
  }

  .btn-remove {
    background: #f44336;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    flex-shrink: 0;
    font-size: 14px;
  }

  .btn-remove, .btn-remove * {
    color: white !important;
  }

  .item-details {
    flex: 1;
  }

  .item-name {
    font-weight: 600;
    margin-bottom: 4px;
    color: #333;
  }

  .item-price {
    font-size: 14px;
    color: #666;
  }

  .item-quantity {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .item-quantity button {
    width: 30px;
    height: 30px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .item-quantity button:hover {
    background: #f0f0f0;
  }

  .item-quantity input {
    width: 50px;
    text-align: center;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
  }

  .item-total {
    font-weight: 700;
    font-size: 16px;
    min-width: 80px;
    text-align: right;
  }

  .cart-footer {
    border-top: 2px solid #eee;
    padding-top: 10px;
    margin-top: auto;
    flex-shrink: 0;
  }

  .cart-summary {
    margin-bottom: 8px;
    margin-top: 10px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    color: #333;
    font-size: 14px;
  }

  .summary-row.total {
    font-size: 14px;
    font-weight: 700;
    color: #667eea;
    margin-top: 5px;
  }

  .payment-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .btn-payment {
    padding: 16px;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-payment, .btn-payment * {
    color: white !important;
  }

  .btn-cash {
    background: #4caf50;
  }

  .btn-cash:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-2px);
  }

  .btn-card {
    background: #2196f3;
  }

  .btn-card:hover:not(:disabled) {
    background: #1976d2;
    transform: translateY(-2px);
  }

  .btn-payment:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .btn-clear-cart {
    width: 100%;
    margin-top: 10px;
    padding: 14px;
    background: #f44336;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-clear-cart, .btn-clear-cart * {
    color: white !important;
  }

  .btn-clear-cart:hover:not(:disabled) {
    background: #d32f2f;
    transform: translateY(-2px);
  }

  .btn-clear-cart:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  /* Category Grid */
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .category-header h3 {
    margin: 0;
    color: #333;
  }

  .btn-add-barcodeless {
    padding: 10px 20px;
    background: #4caf50;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;
  }

  .btn-add-barcodeless, .btn-add-barcodeless * {
    color: white !important;
  }

  .btn-add-barcodeless:hover {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
    overflow-y: auto;
    flex: 1;
  }

  .category-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 12px;
    padding: 30px 20px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-height: 120px;
  }

  .category-card * {
    color: white !important;
  }

  .category-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
  }

  .category-icon {
    font-size: 48px;
  }

  .category-name {
    font-size: 16px;
    font-weight: 600;
    text-align: center;
  }

  /* Products List */
  .products-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #eee;
  }

  .products-header h3 {
    flex: 1;
    margin: 0;
    color: #333;
  }

  .btn-back {
    padding: 8px 16px;
    background: #667eea;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-back, .btn-back * {
    color: white !important;
  }

  .btn-back:hover {
    background: #5568d3;
  }

  .btn-close-cat {
    padding: 8px 12px;
    background: #f44336;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }

  .btn-close-cat, .btn-close-cat * {
    color: white !important;
  }

  .products-list {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .products-scroll {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    align-content: start;
    padding-right: 8px;
  }

  .products-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .products-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .products-scroll::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 4px;
  }

  .products-scroll::-webkit-scrollbar-thumb:hover {
    background: #5568d3;
  }

  .product-card {
    background: #f8f9fa;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .product-card:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }

  .product-name {
    font-weight: 600;
    margin-bottom: 5px;
    color: #333;
  }

  .product-barcode {
    font-size: 12px;
    color: #666;
  }

  .product-price {
    font-size: 18px;
    font-weight: 700;
    color: #667eea;
    margin-top: 10px;
  }

  /* Payment Modal */
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

  .payment-modal {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: auto;
  }

  .payment-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
  }

  .payment-modal .modal-header h2 {
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

  .payment-summary {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .payment-summary .summary-row {
    color: #333;
  }

  .payment-summary .large {
    font-size: 32px;
    font-weight: 700;
    color: #667eea;
  }

  .payment-methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
  }

  .payment-method {
    padding: 20px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
    color: #333;
  }

  .payment-method.active {
    border-color: #667eea;
    background: #667eea;
  }

  .payment-method.active, .payment-method.active * {
    color: white !important;
  }

  .cash-input-section {
    margin-top: 20px;
  }

  .cash-input-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
  }

  .cash-input {
    width: 100%;
    padding: 16px;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    margin: 10px 0;
  }

  .quick-cash {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 15px 0;
  }

  .quick-cash button {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
  }

  .quick-cash button:hover {
    background: #f0f0f0;
  }

  .change-amount {
    background: #e8f5e9;
    padding: 20px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    color: #333;
  }

  .change-value {
    font-size: 28px;
    font-weight: 700;
    color: #4caf50;
  }

  .insufficient-payment {
    background: #ffebee;
    color: #c62828;
    padding: 15px;
    border-radius: 8px;
    margin-top: 15px;
    text-align: center;
  }

  .modal-footer {
    padding: 20px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
  }

  .btn-cancel {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    background: #f5f5f5;
    color: #333;
  }

  .btn-cancel:hover {
    background: #e0e0e0;
  }

  .btn-complete, .btn-add {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    background: #4caf50;
  }

  .btn-complete, .btn-complete *, .btn-add, .btn-add * {
    color: white !important;
  }

  .btn-complete:hover, .btn-add:hover {
    background: #45a049;
  }

  .empty-state {
    text-align: center;
    padding: 50px;
  }

  .empty-state p {
    color: #999;
  }

  /* New Product Modal Styles */
  .new-product-modal {
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .barcode-display {
    width: 100%;
    padding: 14px;
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    border: 2px solid #4caf50;
    border-radius: 8px;
    background: #e8f5e9;
    color: #2e7d32;
  }

  .product-input, .product-select {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    color: #333;
  }

  .product-input:focus, .product-select:focus {
    outline: none;
    border-color: #667eea;
  }

  .help-text {
    font-size: 12px;
    color: #666;
    font-style: italic;
    margin-top: 10px;
  }

  .btn-save {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    background: #667eea;
    color: white;
  }

  .btn-save:hover {
    background: #5568d3;
  }
</style>
