<script>
  import { deviceConfig } from '../../stores/appStore.js';
</script>

<div class="settings">
  <h2>⚙️ Ayarlar</h2>

  <div class="settings-section">
    <h3>Cihaz Bilgileri</h3>
    <div class="info-row"><span>Cihaz ID:</span><strong>{$deviceConfig.device_id}</strong></div>
    <div class="info-row"><span>Mağaza:</span><strong>{$deviceConfig.store_name}</strong></div>
    <div class="info-row"><span>Mağaza ID:</span><strong>{$deviceConfig.store_id}</strong></div>
    <div class="info-row"><span>API URL:</span><strong>{$deviceConfig.api_url}</strong></div>
  </div>

  <div class="settings-section">
    <h3>Uygulama</h3>
    <div class="info-row"><span>Versiyon:</span><strong>1.0.0</strong></div>
    <div class="info-row"><span>Platform:</span><strong>Tauri</strong></div>
  </div>
</div>

<style>
  .settings { padding: 20px; max-width: 800px; }
  .settings-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .settings-section h3 { margin: 0 0 15px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
</style>
