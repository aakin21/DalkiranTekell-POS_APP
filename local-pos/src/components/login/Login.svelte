<script>
  import { login, deviceConfig } from '../../stores/appStore.js';
  import { authApi } from '../../lib/api/client.js';
  import { userRepo } from '../../lib/db/database.js';

  let username = '';
  let password = '';
  let error = '';
  let isLoading = false;

  async function handleLogin() {
    if (!username || !password) {
      error = 'Lütfen kullanıcı adı ve şifre girin';
      return;
    }

    isLoading = true;
    error = '';

    try {
      // Try online login first
      try {
        const response = await authApi.login(username, password);
        login(response.user, response.access_token);

        // Save user to local DB for offline access
        await userRepo.upsert({
          ...response.user,
          password: password // Store hashed in real production
        });

        return;
      } catch (onlineError) {
        console.log('Online login failed, trying offline...');

        // Fallback to offline login
        const localUser = await userRepo.findByUsername(username);

        if (!localUser) {
          throw new Error('Kullanıcı bulunamadı. İnternet bağlantınızı kontrol edin.');
        }

        // In production, compare hashed passwords
        if (localUser.password !== password) {
          throw new Error('Şifre yanlış');
        }

        if (!localUser.is_active) {
          throw new Error('Kullanıcı aktif değil');
        }

        // Offline login success
        login(localUser, 'offline-token');
      }
    } catch (err) {
      error = err.message || 'Giriş yapılamadı';
    } finally {
      isLoading = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      handleLogin();
    }
  }
</script>

<div class="login-container">
  <div class="login-card">
    <div class="logo">
      <h1>🏪 Dalkıran POS</h1>
      <p>Tekel Satış Sistemi</p>
    </div>

    {#if $deviceConfig.store_name}
      <div class="store-info">
        <span class="store-badge">{$deviceConfig.store_name}</span>
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="username">Kullanıcı Adı</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          on:keypress={handleKeyPress}
          placeholder="Kullanıcı adınızı girin"
          disabled={isLoading}
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label for="password">Şifre</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          on:keypress={handleKeyPress}
          placeholder="Şifrenizi girin"
          disabled={isLoading}
          autocomplete="current-password"
        />
      </div>

      {#if error}
        <div class="error-message">
          ⚠️ {error}
        </div>
      {/if}

      <button type="submit" class="btn-primary" disabled={isLoading}>
        {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>

    <div class="footer">
      <small>Offline çalışma desteği aktif</small>
    </div>
  </div>
</div>

<style>
  .login-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .login-card {
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 400px;
  }

  .logo {
    text-align: center;
    margin-bottom: 30px;
  }

  .logo h1 {
    margin: 0;
    font-size: 32px;
    color: #333;
  }

  .logo p {
    margin: 5px 0 0;
    color: #666;
    font-size: 14px;
  }

  .store-info {
    text-align: center;
    margin-bottom: 20px;
  }

  .store-badge {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    color: #333;
    font-size: 14px;
  }

  input {
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    border-left: 4px solid #c33;
  }

  .btn-primary {
    padding: 14px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .footer {
    margin-top: 20px;
    text-align: center;
    color: #999;
  }
</style>
