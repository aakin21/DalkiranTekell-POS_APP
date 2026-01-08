/**
 * Printer Service
 * Handles receipt printing functionality
 */

import { get } from 'svelte/store';
import { deviceConfig } from '../../stores/appStore.js';

/**
 * Print receipt
 * @param {Object} saleData - Sale information
 * @param {Array} items - Sale items
 * @param {Array} payments - Payment methods
 * @returns {Promise<boolean>} - Success status
 */
export async function printReceipt(saleData, items, payments) {
  try {
    const config = get(deviceConfig);

    // Check if auto-print is enabled
    if (!config.auto_print_enabled) {
      console.log('Auto-print disabled, skipping...');
      return false;
    }

    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentWindow.document;

    // Build receipt HTML
    const receiptHTML = buildReceiptHTML(saleData, items, payments);

    printDocument.open();
    printDocument.write(receiptHTML);
    printDocument.close();

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Print
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    // Clean up after a delay
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);

    console.log('✅ Receipt printed successfully');
    return true;

  } catch (error) {
    console.error('❌ Print error:', error);
    return false;
  }
}

/**
 * Build receipt HTML
 */
function buildReceiptHTML(saleData, items, payments) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const itemsHTML = items.map(item => `
    <tr>
      <td colspan="4" class="product-name">${item.product_name}</td>
    </tr>
    <tr class="item-details">
      <td></td>
      <td align="right">${item.quantity}</td>
      <td align="right">₺${item.unit_price.toFixed(2)}</td>
      <td align="right">₺${item.total_price.toFixed(2)}</td>
    </tr>
  `).join('');

  const paymentsHTML = payments.map(payment => `
    <div class="payment-row">
      <span>${payment.method === 'cash' ? 'NAKİT' : payment.method === 'card' ? 'KART' : payment.method.toUpperCase()}</span>
      <span>₺${payment.amount.toFixed(2)}</span>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Fiş</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: 11pt;
          color: #000;
          background: white;
          width: 80mm;
          padding: 10px;
        }

        .receipt {
          width: 100%;
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

        @media print {
          body {
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
    </head>
    <body>
      <div class="receipt">
        <div class="receipt-header">
          <h1>DALKIRAN TEKEL</h1>
          <p class="store-name">${saleData.store_name || 'Dalkiran Tekel'}</p>
          <div class="divider">================================</div>
        </div>

        <div class="receipt-info">
          <div class="info-row">
            <span>Fiş No:</span>
            <span>${saleData.receipt_number}</span>
          </div>
          <div class="info-row">
            <span>Tarih:</span>
            <span>${formatDate(saleData.sale_date)}</span>
          </div>
          <div class="info-row">
            <span>Kasiyer:</span>
            <span>${saleData.user_name || 'Personel'}</span>
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
              ${itemsHTML}
            </tbody>
          </table>
          <div class="divider">================================</div>
        </div>

        <div class="receipt-summary">
          <div class="summary-row">
            <span>Ara Toplam:</span>
            <span>₺${saleData.total_amount.toFixed(2)}</span>
          </div>
          ${saleData.discount_amount > 0 ? `
            <div class="summary-row">
              <span>İndirim:</span>
              <span>-₺${saleData.discount_amount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>TOPLAM:</span>
            <span>₺${saleData.final_amount.toFixed(2)}</span>
          </div>
          <div class="divider">================================</div>
        </div>

        <div class="receipt-payment">
          ${paymentsHTML}
          <div class="divider">================================</div>
        </div>

        <div class="receipt-footer">
          <p>Bizi tercih ettiğiniz için</p>
          <p>teşekkür ederiz!</p>
          <p class="small-text">İyi günler dileriz</p>
          <div class="divider">================================</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Test print - prints a test receipt
 */
export async function testPrint() {
  const testSale = {
    receipt_number: 'TEST-' + Date.now(),
    sale_date: Date.now(),
    store_name: 'Dalkiran Tekel',
    user_name: 'Test Kullanıcı',
    total_amount: 50.00,
    discount_amount: 0,
    final_amount: 50.00
  };

  const testItems = [
    {
      product_name: 'Test Ürün 1',
      quantity: 2,
      unit_price: 15.00,
      total_price: 30.00
    },
    {
      product_name: 'Test Ürün 2',
      quantity: 1,
      unit_price: 20.00,
      total_price: 20.00
    }
  ];

  const testPayments = [
    {
      method: 'cash',
      amount: 50.00
    }
  ];

  return await printReceipt(testSale, testItems, testPayments);
}
