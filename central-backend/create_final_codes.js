const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const db = new Database('./dalkiran.db');

console.log('🔄 6 adet aktivasyon kodu oluşturuluyor...\n');

// Mağazaları al
const stores = db.prepare('SELECT id, name FROM stores').all();
console.log('📍 Mevcut Mağazalar:');
stores.forEach((s, i) => console.log(`   ${i+1}. ${s.name} (${s.id})`));
console.log('');

// Aktivasyon kodları
const codes = [
  'TEKEL001',
  'TEKEL002',
  'TEKEL003',
  'TEKEL004',
  'TEKEL005',
  'TEKEL006'
];

const now = new Date().toISOString();
const insertDevice = db.prepare(`
  INSERT INTO devices (id, activation_code, store_id, is_activated, is_active, created_at, updated_at)
  VALUES (?, ?, ?, 0, 1, ?, ?)
`);

console.log('✅ AKTIVASYON KODLARI:\n');
console.log('┌──────────────┬───────────────┬──────────────────┐');
console.log('│ KOD          │ MAĞAZA        │ DURUM            │');
console.log('├──────────────┼───────────────┼──────────────────┤');

codes.forEach((code, index) => {
  const deviceId = uuidv4();
  const store = stores[index] || stores[0]; // Eğer store yoksa ilkini kullan

  try {
    insertDevice.run(deviceId, code, store.id, now, now);
    console.log(`│ ${code.padEnd(12)} │ ${store.name.padEnd(13)} │ ✅ Kullanılabilir  │`);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      console.log(`│ ${code.padEnd(12)} │ ${store.name.padEnd(13)} │ ⚠️  Zaten var     │`);
    } else {
      console.log(`│ ${code.padEnd(12)} │ ${store.name.padEnd(13)} │ ❌ Hata           │`);
      console.error('   Error:', error.message);
    }
  }
});

console.log('└──────────────┴───────────────┴──────────────────┘\n');

// Tüm kullanılabilir kodları göster
const allDevices = db.prepare(`
  SELECT d.activation_code, d.is_activated, s.name as store_name
  FROM devices d
  LEFT JOIN stores s ON d.store_id = s.id
  WHERE d.activation_code LIKE 'TEKEL%'
  ORDER BY d.activation_code
`).all();

if (allDevices.length > 0) {
  console.log('📋 TÜM TEKEL KODLARI:\n');
  allDevices.forEach(d => {
    const status = d.is_activated ? '❌ Kullanıldı' : '✅ Aktif';
    console.log(`   ${d.activation_code} → ${d.store_name} [${status}]`);
  });
  console.log('');
}

console.log('✅ İşlem tamamlandı!\n');
console.log('💡 Bu kodları her tekelde POS uygulamasına gir!\n');

db.close();
