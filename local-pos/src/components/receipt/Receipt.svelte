<script>
  export let saleData = null;
  export let items = [];
  export let payments = [];

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

{#if saleData}
  <div class="receipt">
    <div class="receipt-header">
      <h1>DALKIRAN TEKEL</h1>
      <p class="store-name">{saleData.store_name || 'Dalkiran Tekel'}</p>
      <div class="divider">================================</div>
    </div>

    <div class="receipt-info">
      <div class="info-row">
        <span>Fiş No:</span>
        <span>{saleData.receipt_number}</span>
      </div>
      <div class="info-row">
        <span>Tarih:</span>
        <span>{formatDate(saleData.sale_date)}</span>
      </div>
      <div class="info-row">
        <span>Kasiyer:</span>
        <span>{saleData.user_name || 'Personel'}</span>
      </div>
      <div class="divider">================================</div>
    </div>

    <div class="receipt-items">
      <table>
        <thead>
          <tr>
            <th align="left">ÜRÜN</th>
            <th align="right">MİKTAR</th>
            <th align="right">FİYAT</th>
            <th align="right">TUTAR</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item}
            <tr>
              <td colspan="4" class="product-name">{item.product_name}</td>
            </tr>
            <tr class="item-details">
              <td></td>
              <td align="right">{item.quantity}</td>
              <td align="right">₺{item.unit_price.toFixed(2)}</td>
              <td align="right">₺{item.total_price.toFixed(2)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="divider">================================</div>
    </div>

    <div class="receipt-summary">
      <div class="summary-row">
        <span>Ara Toplam:</span>
        <span>₺{saleData.total_amount.toFixed(2)}</span>
      </div>
      {#if saleData.discount_amount > 0}
        <div class="summary-row">
          <span>İndirim:</span>
          <span>-₺{saleData.discount_amount.toFixed(2)}</span>
        </div>
      {/if}
      <div class="summary-row total">
        <span>TOPLAM:</span>
        <span>₺{saleData.final_amount.toFixed(2)}</span>
      </div>
      <div class="divider">================================</div>
    </div>

    <div class="receipt-payment">
      {#each payments as payment}
        <div class="payment-row">
          <span>{payment.method === 'cash' ? 'NAKİT' : payment.method === 'card' ? 'KART' : payment.method.toUpperCase()}</span>
          <span>₺{payment.amount.toFixed(2)}</span>
        </div>
      {/each}
      <div class="divider">================================</div>
    </div>

    <div class="receipt-footer">
      <p>Bizi tercih ettiğiniz için</p>
      <p>teşekkür ederiz!</p>
      <p class="small-text">İyi günler dileriz</p>
      <div class="divider">================================</div>
    </div>
  </div>
{/if}

<style>
  .receipt {
    width: 80mm;
    font-family: 'Courier New', monospace;
    font-size: 11pt;
    color: #000;
    background: white;
    padding: 10px;
    margin: 0;
  }

  .receipt-header {
    text-align: center;
    margin-bottom: 10px;
  }

  .receipt-header h1 {
    font-size: 18pt;
    font-weight: bold;
    margin: 5px 0;
    letter-spacing: 1px;
  }

  .store-name {
    font-size: 12pt;
    margin: 3px 0;
  }

  .divider {
    font-size: 9pt;
    margin: 5px 0;
    overflow: hidden;
  }

  .receipt-info {
    margin: 10px 0;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
    font-size: 10pt;
  }

  .receipt-items table {
    width: 100%;
    border-collapse: collapse;
  }

  .receipt-items th {
    font-size: 9pt;
    padding: 3px 0;
    border-bottom: 1px dashed #000;
  }

  .receipt-items td {
    padding: 2px 0;
    font-size: 10pt;
  }

  .product-name {
    font-weight: bold;
    padding-top: 5px !important;
  }

  .item-details td {
    font-size: 9pt;
  }

  .receipt-summary {
    margin: 10px 0;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
    font-size: 11pt;
  }

  .summary-row.total {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 5px;
  }

  .receipt-payment {
    margin: 10px 0;
  }

  .payment-row {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
    font-size: 11pt;
    font-weight: bold;
  }

  .receipt-footer {
    text-align: center;
    margin-top: 10px;
  }

  .receipt-footer p {
    margin: 3px 0;
    font-size: 11pt;
  }

  .small-text {
    font-size: 9pt !important;
  }

  /* Print-specific styles */
  @media print {
    .receipt {
      width: 80mm;
      margin: 0;
      padding: 5mm;
    }

    @page {
      size: 80mm auto;
      margin: 0;
    }
  }
</style>
