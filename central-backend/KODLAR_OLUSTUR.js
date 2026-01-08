const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const db = new Database('./dalkiran.db');

console.log('\n🎯 DALKIRAN POS - AKTİVASYON KODU OLUŞTURUCU\n');
console.log('═'.repeat(60) + '\n');

// Mağazaları al
const stores = db.prepare("SELECT id, name FROM stores WHERE name LIKE 'Tekel%'").all();

console.log('📍 Mevcut Tekel Mağazaları:\n');
stores.forEach((s, i) => {
  console.log(`   ${(i+1).toString().padStart(2)}. ${s.name.padEnd(15)} → ${s.id}`);
});
console.log('\n' + '─'.repeat(60) + '\n');

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

console.log('✨ AKTİVASYON KODLARI OLUŞTURULUYOR...\n');

codes.forEach((code, index) => {
  const deviceId = uuidv4();
  const store = stores[index] || stores[0];

  try {
    insertDevice.run(deviceId, code, store.id, now, now);
    console.log(`✅ ${code} → ${store.name} (${deviceId.substring(0, 8)}...)`);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      console.log(`⚠️  ${code} → Zaten mevcut`);
    } else {
      console.log(`❌ ${code} → HATA: ${error.message}`);
    }
  }
});

console.log('\n' + '─'.repeat(60) + '\n');

// Tüm kodları listele
const allCodes = db.prepare(`
  SELECT d.activation_code, d.is_activated, s.name as store_name, d.id
  FROM devices d
  LEFT JOIN stores s ON d.store_id = s.id
  WHERE d.activation_code LIKE ?
  ORDER BY d.activation_code
`).all('TEKEL%');

console.log('📋 TÜM GEÇERLİ KODLAR:\n');
console.log('┌──────────────┬───────────────┬──────────────────┐');
console.log('│ KOD          │ MAĞAZA        │ DURUM            │');
console.log('├──────────────┼───────────────┼──────────────────┤');

allCodes.forEach(d => {
  const status = d.is_activated ? '❌ Kullanıldı    ' : '✅ Kullanılabilir';
  const storeName = d.store_name || 'Atanmadı';
  console.log(`│ ${d.activation_code.padEnd(12)} │ ${storeName.padEnd(13)} │ ${status} │`);
});

console.log('└──────────────┴───────────────┴──────────────────┘\n');

console.log('💡 KULLANIM:');
console.log('   1. Her tekele gidip POS uygulamasını aç');
console.log('   2. Aktivasyon ekranında yukarıdaki kodlardan birini gir');
console.log('   3. Her kod sadece 1 kez kullanılabilir\n');

console.log('✅ İşlem tamamlandı!\n');

db.close();
