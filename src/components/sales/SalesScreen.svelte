<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { cart, cartTotal, addToCart, removeFromCart, updateCartQuantity, clearCart, user, deviceConfig } from '../../stores/appStore.js';
  import { productRepo, saleRepo } from '../../lib/db/database.js';
  import { v4 as uuidv4 } from 'uuid';

  let barcodeInput = '';
  let barcodelessProducts = [];
  let barcodeInputElement;
  let selectedPaymentMethod = 'cash';
  let showPaymentModal = false;
  let showQuantityModal = false;
  let showNewProductModal = false;
  let cashReceived = 0;
  let changeAmount = 0;
  let selectedProduct = null;
  let quantity = 1;
  let isBarcodeless = false;

  // New Product Modal State
  let newProductBarcode = '';
  let newProductName = '';
  let newProductSalePrice = '';
  let newProductPurchasePrice = '';

  onMount(async () => {
    await loadBarcodelessProducts();
    // Auto-focus barcode input
    if (barcodeInputElement) {
      barcodeInputElement.focus();
    }
  });

  async function loadBarcodelessProducts() {
    const allProducts = await productRepo.findAll();
    barcodelessProducts = allProducts.filter(p => !p.barcode || p.barcode === 'BARCODESIZ');
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
      addToCart(product, 1);
      playBeep();
    } else {
      // Ürün bulunamadı - Yeni ürün ekleme modal'ını aç
      openNewProductModal(barcode);
    }
  }

  function openNewProductModal(barcode = null) {
    isBarcodeless = !barcode;
    newProductBarcode = barcode || 'BARCODESIZ';
    newProductName = '';
    newProductSalePrice = '';
    newProductPurchasePrice = '';
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
      // Ürünü kaydet
      const productId = await productRepo.upsert({
        barcode: newProductBarcode,
        name: newProductName.trim(),
        category_id: null,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        is_active: 1
      });

      // Ürünü sepete ekle
      const newProduct = await productRepo.findById(productId);
      if (newProduct) {
        addToCart(newProduct, 1);
        playBeep();
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
    selectedProduct = product;
    quantity = 1;
    showQuantityModal = true;
  }

  function addProductToCart() {
    if (selectedProduct && quantity > 0) {
      addToCart(selectedProduct, quantity);
      playBeep();
      showQuantityModal = false;
      selectedProduct = null;
      quantity = 1;
    }
  }

  function cancelQuantity() {
    showQuantityModal = false;
    selectedProduct = null;
    quantity = 1;
  }

  function handleQuantityChange(productId, newQuantity) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateCartQuantity(productId, parseInt(newQuantity));
    }
  }

  function openPaymentModal() {
    const cartItems = get(cart);
    if (cartItems.length === 0) {
      return;
    }

    showPaymentModal = true;
    cashReceived = get(cartTotal);
    calculateChange();
  }

  function calculateChange() {
    changeAmount = cashReceived - get(cartTotal);
  }

  async function completeSale() {
    const total = get(cartTotal);
    if (selectedPaymentMethod === 'cash' && cashReceived < total) {
      return;
    }

    try {
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const config = get(deviceConfig);
      const currentUser = get(user);
      const cartItems = get(cart);

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
        method: selectedPaymentMethod,
        amount: total
      }];

      const saleId = await saleRepo.create(saleData, cartItems, payments);

      // Clear cart and close modal
      clearCart();
      showPaymentModal = false;
      cashReceived = 0;
      changeAmount = 0;

      // Focus back to barcode input
      if (barcodeInputElement) {
        barcodeInputElement.focus();
      }

    } catch (error) {
      console.error('Satış kaydedilemedi:', error);
    }
  }

  function cancelPayment() {
    showPaymentModal = false;
    cashReceived = 0;
    changeAmount = 0;
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

      <button class="btn-checkout" on:click={openPaymentModal} disabled={$cart.length === 0}>
        💳 Ödeme Al (F4)
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
        {#each barcodelessProducts as product}
          <button class="product-card" on:click={() => selectProduct(product)}>
            <div class="product-info">
              <div class="product-name">{product.name}</div>
              <div class="product-barcode">Barkodsuz</div>
            </div>
            <div class="product-price">₺{product.sale_price.toFixed(2)}</div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

<!-- Quantity Modal -->
{#if showQuantityModal && selectedProduct}
  <div class="modal-overlay" on:click={cancelQuantity}>
    <div class="quantity-modal" on:click={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>{selectedProduct.name}</h3>
        <button class="btn-close" on:click={cancelQuantity}>✕</button>
      </div>
      <div class="modal-body">
        <div class="product-detail">
          <div class="price-label">Fiyat:</div>
          <div class="price-value">₺{selectedProduct.sale_price.toFixed(2)}</div>
        </div>
        <div class="quantity-input">
          <label>Miktar - Hızlı Seçim:</label>
          <div class="quick-quantity-grid">
            <button on:click={() => { quantity = 1; addProductToCart(); }}>1</button>
            <button on:click={() => { quantity = 2; addProductToCart(); }}>2</button>
            <button on:click={() => { quantity = 3; addProductToCart(); }}>3</button>
            <button on:click={() => { quantity = 4; addProductToCart(); }}>4</button>
            <button on:click={() => { quantity = 5; addProductToCart(); }}>5</button>
            <button on:click={() => { quantity = 6; addProductToCart(); }}>6</button>
            <button on:click={() => { quantity = 7; addProductToCart(); }}>7</button>
            <button on:click={() => { quantity = 8; addProductToCart(); }}>8</button>
            <button on:click={() => { quantity = 9; addProductToCart(); }}>9</button>
          </div>
        </div>
        <div class="total-preview-info">
          <small>💡 Yukarıdaki sayılara tıklayarak hızlıca sepete ekleyin</small>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" on:click={cancelQuantity}>İptal</button>
      </div>
    </div>
  </div>
{/if}

<!-- Payment Modal -->
{#if showPaymentModal}
  <div class="modal-overlay">
    <div class="payment-modal">
      <div class="modal-header">
        <h2>💳 Ödeme</h2>
        <button class="btn-close" on:click={cancelPayment}>✕</button>
      </div>

      <div class="modal-body">
        <div class="payment-summary">
          <div class="summary-row">
            <span>Toplam Tutar:</span>
            <span class="large">₺{$cartTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-methods">
          <button
            class="payment-method {selectedPaymentMethod === 'cash' ? 'active' : ''}"
            on:click={() => selectedPaymentMethod = 'cash'}
          >
            💵 Nakit
          </button>
          <button
            class="payment-method {selectedPaymentMethod === 'card' ? 'active' : ''}"
            on:click={() => selectedPaymentMethod = 'card'}
          >
            💳 Kart
          </button>
        </div>

        {#if selectedPaymentMethod === 'cash'}
          <div class="cash-input-section">
            <label>Alınan Nakit:</label>
            <input
              type="number"
              bind:value={cashReceived}
              on:input={calculateChange}
              step="0.01"
              class="cash-input"
            />

            <div class="quick-cash">
              <button on:click={() => { cashReceived = $cartTotal; calculateChange(); }}>Tam</button>
              <button on:click={() => { cashReceived = Math.ceil($cartTotal / 10) * 10; calculateChange(); }}>Yuvarla</button>
              <button on:click={() => { cashReceived = Math.ceil($cartTotal / 50) * 50; calculateChange(); }}>50'lik</button>
              <button on:click={() => { cashReceived = Math.ceil($cartTotal / 100) * 100; calculateChange(); }}>100'lük</button>
            </div>

            {#if changeAmount >= 0}
              <div class="change-amount">
                <span>Para Üstü:</span>
                <span class="change-value">₺{changeAmount.toFixed(2)}</span>
              </div>
            {:else}
              <div class="insufficient-payment">
                ⚠️ Yetersiz ödeme! Eksik: ₺{Math.abs(changeAmount).toFixed(2)}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={cancelPayment}>İptal</button>
        <button class="btn-complete" on:click={completeSale}>
          ✅ Satışı Tamamla
        </button>
      </div>
    </div>
  </div>
{/if}

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
    height: calc(100vh - 80px);
    padding: 20px;
    background: #f5f5f5;
  }

  .left-panel, .right-panel {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
  }

  .barcode-section {
    margin-bottom: 20px;
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

  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
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
    padding-top: 15px;
    margin-top: 15px;
  }

  .cart-summary {
    margin-bottom: 15px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    color: #333;
  }

  .summary-row.total {
    font-size: 20px;
    font-weight: 700;
    color: #667eea;
  }

  .btn-checkout {
    width: 100%;
    padding: 16px;
    background: #4caf50;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-checkout, .btn-checkout * {
    color: white !important;
  }

  .btn-checkout:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-2px);
  }

  .btn-checkout:disabled {
    background: #ccc;
    cursor: not-allowed;
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
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    align-content: start;
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

  /* Quantity Modal */
  .quantity-modal {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 450px;
  }

  .quantity-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
  }

  .quantity-modal .modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }

  .modal-body {
    padding: 20px;
  }

  .product-detail {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .price-label {
    color: #666;
  }

  .price-value {
    font-size: 24px;
    font-weight: 700;
    color: #667eea;
  }

  .quantity-input label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: #333;
  }

  .quantity-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 15px;
  }

  .quantity-controls button {
    width: 40px;
    height: 40px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 20px;
  }

  .quantity-controls button:hover {
    background: #f0f0f0;
  }

  .quantity-controls input {
    flex: 1;
    text-align: center;
    font-size: 20px;
    font-weight: 600;
    border: 2px solid #667eea;
    border-radius: 6px;
    padding: 10px;
  }

  .quick-quantity-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 10px;
  }

  .quick-quantity-grid button {
    padding: 20px;
    font-size: 24px;
    font-weight: 700;
    border: 2px solid #667eea;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: #667eea;
  }

  .quick-quantity-grid button:hover {
    background: #667eea;
    transform: scale(1.05);
  }

  .quick-quantity-grid button:hover, .quick-quantity-grid button:hover * {
    color: white !important;
  }

  .quick-quantity-grid button:active {
    transform: scale(0.95);
  }

  .total-preview-info {
    background: #e3f2fd;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    margin-top: 15px;
  }

  .total-preview-info small {
    color: #1976d2;
    font-size: 13px;
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
