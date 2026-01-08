<script>
  import { get } from 'svelte/store';
  import { currentShift, user, deviceConfig } from '../../stores/appStore.js';
  import { shiftRepo, saleRepo } from '../../lib/db/database.js';
  import { onMount } from 'svelte';

  let openingCash = 0;
  let closingCash = 0;
  let showOpenModal = false;
  let showCloseModal = false;
  let shiftSummary = null;

  onMount(() => {
    loadCurrentShift();
  });

  function loadCurrentShift() {
    const config = get(deviceConfig);
    const shift = shiftRepo.getCurrentShift(config.device_id);
    if (shift) {
      currentShift.set(shift);
    }
  }

  function openShiftModal() {
    openingCash = 0;
    showOpenModal = true;
  }

  async function handleOpenShift() {
    if (openingCash < 0) {
      return;
    }

    try {
      const config = get(deviceConfig);
      const currentUser = get(user);

      const shift = shiftRepo.create({
        store_id: config.store_id,
        user_id: currentUser.id,
        device_id: config.device_id,
        opening_cash: openingCash,
        opened_at: new Date().toISOString()
      });

      currentShift.set(shift);
      showOpenModal = false;
    } catch (error) {
      console.error('Vardiya açılamadı:', error);
    }
  }

  function openCloseModal() {
    calculateShiftSummary();
    closingCash = 0;
    showCloseModal = true;
  }

  function calculateShiftSummary() {
    // Calculate expected cash from sales
    const shift = get(currentShift);
    const sales = saleRepo.findUnsyncedSales().filter(s => s.shift_id === shift.id);

    let totalSales = 0;
    let cashTotal = shift.opening_cash;
    let cardTotal = 0;

    for (const sale of sales) {
      totalSales += sale.final_amount;

      for (const payment of sale.payments) {
        if (payment.method === 'cash') {
          cashTotal += payment.amount;
        } else {
          cardTotal += payment.amount;
        }
      }
    }

    shiftSummary = {
      totalSales: sales.length,
      totalRevenue: totalSales,
      cashTotal,
      cardTotal,
      expectedCash: cashTotal
    };
  }

  async function handleCloseShift() {
    if (closingCash < 0) {
      return;
    }

    const difference = closingCash - shiftSummary.expectedCash;

    const confirmMessage = `
      Vardiya Özeti:
      ─────────────────
      Satış Sayısı: ${shiftSummary.totalSales}
      Toplam Ciro: ₺${shiftSummary.totalRevenue.toFixed(2)}

      Nakit Toplam: ₺${shiftSummary.cashTotal.toFixed(2)}
      Kart Toplam: ₺${shiftSummary.cardTotal.toFixed(2)}

      Beklenen Nakit: ₺${shiftSummary.expectedCash.toFixed(2)}
      Sayılan Nakit: ₺${closingCash.toFixed(2)}
      Fark: ₺${difference.toFixed(2)} ${difference >= 0 ? '(Fazla)' : '(Eksik)'}

      Vardiyayı kapatmak istiyor musunuz?
    `;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const shift = get(currentShift);
      shiftRepo.close(
        shift.id,
        closingCash,
        shiftSummary.expectedCash,
        difference
      );

      currentShift.set(null);
      showCloseModal = false;
    } catch (error) {
      console.error('Vardiya kapatılamadı:', error);
    }
  }
</script>

<div class="shift-manager">
  {#if !$currentShift}
    <div class="no-shift">
      <div class="icon">🔒</div>
      <h2>Vardiya Kapalı</h2>
      <p>Satış yapabilmek için önce vardiya açmalısınız.</p>
      <button class="btn-open-shift" on:click={openShiftModal}>
        🔓 Vardiya Aç (Kasa Aç)
      </button>
    </div>
  {:else}
    <div class="active-shift">
      <div class="shift-info">
        <h3>✅ Aktif Vardiya</h3>
        <p>Açılış: {new Date($currentShift.opened_at).toLocaleString('tr-TR')}</p>
        <p>Başlangıç Nakit: ₺{$currentShift.opening_cash.toFixed(2)}</p>
      </div>
      <button class="btn-close-shift" on:click={openCloseModal}>
        🔐 Vardiya Kapat (Kasa Kapat)
      </button>
    </div>
  {/if}
</div>

{#if showOpenModal}
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2>🔓 Vardiya Aç (Kasa Aç)</h2>
        <button class="btn-close" on:click={() => showOpenModal = false}>✕</button>
      </div>

      <div class="modal-body">
        <p>Kasada bulunan başlangıç nakdini girin:</p>

        <div class="form-group">
          <label>Başlangıç Nakdi (₺):</label>
          <input
            type="number"
            bind:value={openingCash}
            step="0.01"
            min="0"
            placeholder="0.00"
            class="cash-input"
          />
        </div>

        <div class="quick-amounts">
          <button on:click={() => openingCash = 0}>₺0</button>
          <button on:click={() => openingCash = 100}>₺100</button>
          <button on:click={() => openingCash = 500}>₺500</button>
          <button on:click={() => openingCash = 1000}>₺1000</button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={() => showOpenModal = false}>İptal</button>
        <button class="btn-confirm" on:click={handleOpenShift}>✅ Vardiya Aç</button>
      </div>
    </div>
  </div>
{/if}

{#if showCloseModal && shiftSummary}
  <div class="modal-overlay">
    <div class="modal large">
      <div class="modal-header">
        <h2>🔐 Vardiya Kapat (Kasa Kapat)</h2>
        <button class="btn-close" on:click={() => showCloseModal = false}>✕</button>
      </div>

      <div class="modal-body">
        <div class="summary-section">
          <h3>📊 Vardiya Özeti</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span>Satış Sayısı:</span>
              <strong>{shiftSummary.totalSales}</strong>
            </div>
            <div class="summary-item">
              <span>Toplam Ciro:</span>
              <strong>₺{shiftSummary.totalRevenue.toFixed(2)}</strong>
            </div>
            <div class="summary-item">
              <span>Nakit Satış:</span>
              <strong>₺{shiftSummary.cashTotal.toFixed(2)}</strong>
            </div>
            <div class="summary-item">
              <span>Kart Satış:</span>
              <strong>₺{shiftSummary.cardTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div class="cash-count-section">
          <h3>💰 Nakit Sayımı</h3>
          <p>Beklenen Nakit: <strong>₺{shiftSummary.expectedCash.toFixed(2)}</strong></p>

          <div class="form-group">
            <label>Kasada Sayılan Nakit (₺):</label>
            <input
              type="number"
              bind:value={closingCash}
              step="0.01"
              min="0"
              placeholder="0.00"
              class="cash-input"
            />
          </div>

          {#if closingCash > 0}
            <div class="cash-difference {closingCash - shiftSummary.expectedCash >= 0 ? 'positive' : 'negative'}">
              <span>Fark:</span>
              <strong>₺{(closingCash - shiftSummary.expectedCash).toFixed(2)}</strong>
              <span>{closingCash - shiftSummary.expectedCash >= 0 ? '(Fazla)' : '(Eksik)'}</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={() => showCloseModal = false}>İptal</button>
        <button class="btn-confirm" on:click={handleCloseShift}>✅ Vardiyayı Kapat</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .shift-manager {
    padding: 20px;
  }

  .no-shift {
    background: white;
    border-radius: 12px;
    padding: 60px;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .no-shift .icon {
    font-size: 80px;
    margin-bottom: 20px;
  }

  .no-shift h2 {
    margin: 0 0 10px 0;
    color: #333;
  }

  .no-shift p {
    color: #666;
    margin-bottom: 30px;
  }

  .btn-open-shift {
    padding: 16px 32px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-open-shift:hover {
    background: #45a049;
    transform: translateY(-2px);
  }

  .active-shift {
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    color: white;
    border-radius: 12px;
    padding: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  }

  .shift-info h3 {
    margin: 0 0 10px 0;
  }

  .shift-info p {
    margin: 5px 0;
    opacity: 0.9;
  }

  .btn-close-shift {
    padding: 14px 28px;
    background: white;
    color: #4caf50;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-close-shift:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }

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
    max-width: 500px;
    max-height: 90vh;
    overflow: auto;
  }

  .modal.large {
    max-width: 600px;
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
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }

  .modal-body {
    padding: 20px;
  }

  .form-group {
    margin: 20px 0;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .cash-input {
    width: 100%;
    padding: 16px;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
  }

  .quick-amounts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 15px;
  }

  .quick-amounts button {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-weight: 600;
  }

  .quick-amounts button:hover {
    background: #f0f0f0;
  }

  .summary-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .summary-section h3 {
    margin: 0 0 15px 0;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: white;
    border-radius: 6px;
  }

  .cash-count-section {
    margin-top: 20px;
  }

  .cash-count-section h3 {
    margin: 0 0 15px 0;
  }

  .cash-difference {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-radius: 8px;
    margin-top: 15px;
    font-size: 18px;
  }

  .cash-difference.positive {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .cash-difference.negative {
    background: #ffebee;
    color: #c62828;
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
  }

  .btn-cancel {
    background: #f5f5f5;
    color: #333;
  }

  .btn-confirm {
    background: #4caf50;
    color: white;
  }

  .btn-confirm:hover {
    background: #45a049;
  }
</style>
