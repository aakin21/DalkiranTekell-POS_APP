const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = new Database('dalkiran.db');

console.log('🌱 Production seed başlatılıyor...');
console.log('');

// Önce tüm tabloları temizle (varsa)
console.log('🗑️  Mevcut veriler temizleniyor...');
const tablesToClean = [
  'audit_logs', 'stock_adjustments', 'payments', 'sale_items',
  'sales', 'refunds', 'shifts', 'stocks', 'price_histories',
  'products', 'categories', 'users', 'devices', 'stores'
];
tablesToClean.forEach(table => {
  try {
    db.exec(`DELETE FROM ${table}`);
  } catch (e) {
    // Tablo yoksa devam et
  }
});
console.log('✅ Mevcut veriler temizlendi');
console.log('');

// Şifreleri hash'le
const adminPassword = bcrypt.hashSync('bayerakin', 10);
const staffPassword = bcrypt.hashSync('dalkiran', 10);

// 5 Tekel oluştur
const stores = [
  { name: 'Tekel 1', address: 'İstanbul, Kadıköy', phone: '+90 555 111 0001' },
  { name: 'Tekel 2', address: 'İstanbul, Beşiktaş', phone: '+90 555 111 0002' },
  { name: 'Tekel 3', address: 'İstanbul, Şişli', phone: '+90 555 111 0003' },
  { name: 'Tekel 4', address: 'İstanbul, Üsküdar', phone: '+90 555 111 0004' },
  { name: 'Tekel 5', address: 'İstanbul, Bakırköy', phone: '+90 555 111 0005' },
];

const insertStore = db.prepare(`
  INSERT INTO stores (id, name, address, phone, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const storeIds = [];

stores.forEach((store) => {
  const storeId = uuidv4();
  storeIds.push(storeId);

  insertStore.run(
    storeId,
    store.name,
    store.address,
    store.phone,
    1,
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log(`✅ ${store.name} oluşturuldu - ID: ${storeId}`);
});

console.log('');

// Admin kullanıcısı oluştur (ilk mağazaya bağlı)
const adminId = uuidv4();
const insertUser = db.prepare(`
  INSERT INTO users (id, username, password, full_name, role, store_id, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertUser.run(
  adminId,
  'dalkiran',
  adminPassword,
  'Dalkıran Admin',
  'admin',
  storeIds[0], // İlk mağazaya bağlı
  1,
  new Date().toISOString(),
  new Date().toISOString()
);

console.log('✅ Admin kullanıcısı oluşturuldu');
console.log('   Username: dalkiran');
console.log('   Password: bayerakin');
console.log('');

// Her mağaza için 1 çalışan oluştur
storeIds.forEach((storeId, storeIndex) => {
  const storeName = stores[storeIndex].name;
  const staffNumber = storeIndex + 1;
  const username = `dalkiran${staffNumber}`;
  const staffId = uuidv4();

  insertUser.run(
    staffId,
    username,
    staffPassword,
    `Çalışan - ${storeName}`,
    'staff',
    storeId,
    1,
    new Date().toISOString(),
    new Date().toISOString()
  );

  console.log(`✅ ${storeName}: ${username} oluşturuldu (Şifre: dalkiran)`);
});

console.log('');

// Kategoriler oluştur
const categories = [
  { name: 'Alkollü İçecekler', description: 'Bira, şarap, rakı, votka vb.' },
  { name: 'Sigara', description: 'Tütün ürünleri ve aksesuarlar' },
  { name: 'Alkolsüz İçecekler', description: 'Su, kola, meyve suyu, enerji içeceği vb.' },
  { name: 'Gıda', description: 'Çikolata, çekirdek, cips vb.' },
  { name: 'Diğer', description: 'Çeşitli tekel ürünleri' },
];

const insertCategory = db.prepare(`
  INSERT INTO categories (id, name, description, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

console.log('📦 Kategoriler oluşturuluyor...');
categories.forEach((cat) => {
  insertCategory.run(
    uuidv4(),
    cat.name,
    cat.description,
    1,
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log(`   ✅ ${cat.name}`);
});

db.close();

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('🎉 Production seed tamamlandı!');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('📊 Oluşturulan veriler:');
console.log('   • 5 Tekel (Mağaza)');
console.log('   • 1 Admin kullanıcı');
console.log('   • 5 Çalışan (Her tekel için 1)');
console.log('   • 5 Kategori');
console.log('');
console.log('🔐 GİRİŞ BİLGİLERİ:');
console.log('');
console.log('Admin:');
console.log('   Username: dalkiran');
console.log('   Password: bayerakin');
console.log('');
console.log('Çalışanlar:');
console.log('   Tekel 1 → dalkiran1');
console.log('   Tekel 2 → dalkiran2');
console.log('   Tekel 3 → dalkiran3');
console.log('   Tekel 4 → dalkiran4');
console.log('   Tekel 5 → dalkiran5');
console.log('   Şifre (Hepsi): dalkiran');
console.log('');
console.log('Backend URL: http://localhost:3000');
console.log('Admin Panel URL: http://localhost:5173');
console.log('═══════════════════════════════════════════════');
