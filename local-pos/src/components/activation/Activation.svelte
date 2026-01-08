<script>
  import { setDevice, currentView } from '../../stores/appStore.js';
  import { deviceApi } from '../../lib/api/client.js';
  import { deviceConfigRepo } from '../../lib/db/database.js';

  let activationCode = '';
  let error = '';
  let success = '';
  let isLoading = false;

  async function handleActivation() {
    if (!activationCode || activationCode.length < 6) {
      error = 'Lütfen geçerli bir aktivasyon kodu girin';
      return;
    }

    isLoading = true;
    error = '';
    success = '';

    try {
      const response = await deviceApi.activate(activationCode.toUpperCase());

      // Save to local database
      deviceConfigRepo.update({
        device_id: response.device_id,
        store_id: response.store_id,
        store_name: response.store_name,
        is_activated: true,
        activated_at: new Date().toISOString(),
        api_url: 'http://localhost:3000'
      });

      // Update store
      setDevice({
        device_id: response.device_id,
        store_id: response.store_id,
        store_name: response.store_name,
        is_activated: true
      });

      success = `✅ Başarılı! ${response.store_name} şubesine bağlandınız.`;

      // Redirect to login after 2 seconds
      setTimeout(() => {
        currentView.set('login');
      }, 2000);

    } catch (err) {
      error = err.response?.data?.message || 'Aktivasyon başarısız. Kodu kontrol edin.';
    } finally {
      isLoading = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      handleActivation();
    }
  }

  function formatCode(value) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function handleInput(event) {
    activationCode = formatCode(event.target.value);
  }
</script>

<div class="activation-container">
  <div class="activation-card">
    <div class="header">
      <div class="icon">🔐</div>
      <h1>Cihaz Aktivasyonu</h1>
      <p>Bu POS cihazını kullanmaya başlamak için aktivasyon kodu girin</p>
    </div>

    <form on:submit|preventDefault={handleActivation}>
      <div class="form-group">
        <label for="activation-code">Aktivasyon Kodu</label>
        <input
          id="activation-code"
          type="text"
          bind:value={activationCode}
          on:input={handleInput}
          on:keypress={handleKeyPress}
          placeholder="XXXXXXXX"
          disabled={isLoading}
          maxlength="10"
          autocomplete="off"
          class="code-input"
        />
        <small>Admin panelden aldığınız 8 haneli kodu girin</small>
      </div>

      {#if error}
        <div class="error-message">
          ⚠️ {error}
        </div>
      {/if}

      {#if success}
        <div class="success-message">
          {success}
        </div>
      {/if}

      <button type="submit" class="btn-primary" disabled={isLoading || !activationCode}>
        {isLoading ? 'Aktivasyon yapılıyor...' : 'Aktive Et'}
      </button>
    </form>

    <div class="help-section">
      <h3>Nasıl aktivasyon kodu alırım?</h3>
      <ol>
        <li>Admin paneline giriş yapın</li>
        <li>"Cihazlar" menüsüne gidin</li>
        <li>"Yeni Cihaz Ekle" butonuna tıklayın</li>
        <li>Şubenizi seçin ve kod oluşturun</li>
        <li>Kodu buraya girin</li>
      </ol>
    </div>
  </div>
</div>

<style>
  .activation-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  .activation-card {
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 500px;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
  }

  .icon {
    font-size: 64px;
    margin-bottom: 10px;
  }

  .header h1 {
    margin: 0 0 10px 0;
    font-size: 28px;
    color: #333;
  }

  .header p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 30px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  .code-input {
    padding: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 4px;
    text-transform: uppercase;
    transition: all 0.3s;
  }

  .code-input:focus {
    outline: none;
    border-color: #f5576c;
    box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.1);
  }

  .code-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  small {
    color: #999;
    font-size: 12px;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    border-left: 4px solid #c33;
  }

  .success-message {
    background: #efe;
    color: #3c3;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    border-left: 4px solid #3c3;
  }

  .btn-primary {
    padding: 14px;
    background: #f5576c;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #e04a5d;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(245, 87, 108, 0.4);
  }

  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .help-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    border-left: 4px solid #f5576c;
  }

  .help-section h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #333;
  }

  .help-section ol {
    margin: 0;
    padding-left: 20px;
    color: #666;
    font-size: 14px;
  }

  .help-section li {
    margin-bottom: 8px;
  }
</style>
