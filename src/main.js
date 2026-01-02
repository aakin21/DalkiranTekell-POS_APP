import App from './App.svelte';

console.log('🚀 main.js loaded');

try {
  const appElement = document.getElementById('app');
  console.log('📦 App element:', appElement);

  if (!appElement) {
    throw new Error('App element not found!');
  }

  const app = new App({
    target: appElement,
  });

  console.log('✅ App component mounted');
} catch (error) {
  console.error('❌ Fatal error:', error);
  document.body.innerHTML = `<div style="padding: 40px; font-family: Arial;">
    <h1 style="color: red;">❌ Uygulama Hatası</h1>
    <p><strong>Hata:</strong> ${error.message}</p>
    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${error.stack}</pre>
  </div>`;
}
