<script>
  import { syncQueueRepo } from '../../lib/db/database.js';
  import { performSync } from '../../lib/sync/syncService.js';
  import { syncStatus } from '../../stores/appStore.js';
  import { onMount } from 'svelte';

  let pendingOps = [];

  onMount(async () => {
    await loadPending();
  });

  async function loadPending() {
    pendingOps = await syncQueueRepo.getPending();
  }

  async function manualSync() {
    await performSync();
    await loadPending();
  }
</script>

<div class="sync-monitor">
  <h2>🔄 Senkronizasyon İzleme</h2>

  <div class="status-box">
    <div>Durum: {$syncStatus.isSyncing ? '⏳ Senkronizasyon yapılıyor...' : '✅ Hazır'}</div>
    <div>Son Senkronizasyon: {$syncStatus.lastSyncAt || 'Henüz yapılmadı'}</div>
    <div>Bekleyen İşlem: {pendingOps.length}</div>
    <button on:click={manualSync} disabled={$syncStatus.isSyncing}>Manuel Sync</button>
  </div>

  <div class="pending-list">
    {#each pendingOps as op}
      <div class="op-item">
        <span>{op.entity_type}</span>
        <span>{op.operation}</span>
        <span>{new Date(op.created_at).toLocaleString('tr-TR')}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .sync-monitor { padding: 20px; }
  .status-box { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
  .status-box button { padding: 10px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
  .pending-list { background: white; padding: 15px; border-radius: 8px; }
  .op-item { display: grid; grid-template-columns: 1fr 1fr 2fr; padding: 10px; border-bottom: 1px solid #eee; }
</style>
