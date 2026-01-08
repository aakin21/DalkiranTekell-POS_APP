<script>
  import { userRepo } from '../../lib/db/database.js';
  import { onMount } from 'svelte';

  let users = [];
  let showModal = false;
  let editingUser = null;

  onMount(async () => {
    await loadUsers();
  });

  async function loadUsers() {
    users = await userRepo.findAll();
  }

  function addUser() {
    editingUser = { username: '', password: '', full_name: '', role: 'staff', is_active: 1 };
    showModal = true;
  }

  async function saveUser() {
    try {
      await userRepo.upsert(editingUser);
      showModal = false;
      await loadUsers();
    } catch (e) {
      console.error('Kullanıcı kaydetme hatası:', e);
    }
  }
</script>

<div class="user-management">
  <div class="header">
    <h2>👥 Kullanıcı Yönetimi</h2>
    <button class="btn-add" on:click={addUser}>+ Yeni Kullanıcı</button>
  </div>

  <div class="users-table">
    {#each users as u}
      <div class="user-row">
        <div>{u.full_name}</div>
        <div>{u.username}</div>
        <div>{u.role === 'admin' ? 'Yönetici' : 'Personel'}</div>
        <div>{u.is_active ? '✅' : '❌'}</div>
      </div>
    {/each}
  </div>
</div>

{#if showModal}
  <div class="modal-overlay">
    <div class="modal">
      <h3>Kullanıcı Ekle/Düzenle</h3>
      <input bind:value={editingUser.full_name} placeholder="Ad Soyad" />
      <input bind:value={editingUser.username} placeholder="Kullanıcı Adı" />
      <input type="password" bind:value={editingUser.password} placeholder="Şifre" />
      <select bind:value={editingUser.role}>
        <option value="staff">Personel</option>
        <option value="admin">Yönetici</option>
      </select>
      <button on:click={saveUser}>Kaydet</button>
      <button on:click={() => showModal = false}>İptal</button>
    </div>
  </div>
{/if}

<style>
  .user-management { padding: 20px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .btn-add { padding: 10px 20px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; }
  .users-table { background: white; border-radius: 8px; padding: 15px; }
  .user-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr; padding: 10px; border-bottom: 1px solid #eee; }
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal { background: white; padding: 30px; border-radius: 12px; display: flex; flex-direction: column; gap: 15px; min-width: 400px; }
  .modal input, .modal select { padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; }
  .modal button { padding: 12px; border: none; border-radius: 6px; cursor: pointer; background: #667eea; color: white; }
</style>
