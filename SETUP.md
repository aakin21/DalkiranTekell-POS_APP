# Dalkıran POS Sistemi - Kurulum Rehberi

## 📋 Gereksinimler

### Backend
- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

### Local POS
- Node.js 18+
- Rust (Tauri için)
- Windows/Linux/macOS

---

## 🔧 1. Central Backend Kurulumu

### Adım 1: PostgreSQL Kurulumu

```bash
# Windows için PostgreSQL indir ve kur
# https://www.postgresql.org/download/windows/

# PostgreSQL'e bağlan
psql -U postgres

# Veritabanı oluştur
CREATE DATABASE dalkiran_central;

# Kullanıcı oluştur (opsiyonel)
CREATE USER dalkiran_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE dalkiran_central TO dalkiran_user;
```

### Adım 2: Backend Kurulumu

```bash
cd central-backend

# Dependencies yükle
npm install

# .env dosyası oluştur
cp .env.example .env  # veya manuel oluştur
```

### Adım 3: .env Dosyasını Düzenle

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=dalkiran_central

JWT_SECRET=dalkiran-super-secret-change-this-in-production
JWT_EXPIRATION=7d

PORT=3000
```

### Adım 4: Backend'i Başlat

```bash
npm start
```

Backend `http://localhost:3000` adresinde çalışacak!

### Adım 5: İlk Verileri Oluştur

Backend başladığında veritabanı tabloları otomatik oluşur (synchronize: true).

**İlk şubeyi ve kullanıcıyı manuel ekleyelim:**

```bash
# PostgreSQL'e bağlan
psql -U postgres -d dalkiran_central

-- İlk şubeyi oluştur
INSERT INTO stores (id, name, address, phone, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Tekel 1',
  'İstanbul, Kadıköy',
  '+90 555 123 4567',
  true,
  NOW(),
  NOW()
);

-- Şube ID'sini al
SELECT id, name FROM stores;
-- Örnek: 123e4567-e89b-12d3-a456-426614174000

-- İlk admin kullanıcıyı oluştur (şifre: admin123)
INSERT INTO users (id, username, password, full_name, role, store_id, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$9rZX5YjV9Z5E5X5X5X5X5.XdQKZK5K5K5K5K5K5K5K5K5K5K5',  -- admin123 hashed
  'Admin User',
  'admin',
  '123e4567-e89b-12d3-a456-426614174000',  -- yukarıdaki store_id
  true,
  NOW(),
  NOW()
);
```

**ÖNEMLİ:** Yukarıdaki bcrypt hash gerçek değil. Aşağıdaki Node.js koduyla gerçek hash üret:

```javascript
// test-password.js
const bcrypt = require('bcrypt');
const password = 'admin123';
bcrypt.hash(password, 10).then(hash => console.log(hash));

// Çalıştır
node test-password.js
```

Çıkan hash'i SQL'deki password alanına yapıştır.

### Adım 6: Backend Test Et

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Başarılı olursa JWT token döner
```

---

## 💻 2. Local POS Kurulumu

### Adım 1: Dependencies Yükle

```bash
cd local-pos
npm install
```

### Adım 2: Rust Kurulumu (Tauri için)

```bash
# Windows için
https://www.rust-lang.org/tools/install

# Rust kurulduktan sonra
rustc --version
```

### Adım 3: Local POS'u Çalıştır

```bash
# Development mode (sadece web)
npm run dev

# Tauri ile çalıştır (desktop app)
npm run tauri:dev

# Build (production)
npm run tauri:build
```

### Adım 4: İlk Kurulum

1. **Device Activation:**
   - Admin panelden (veya backend'den) bir device oluştur
   - Activation code üret
   - Local POS'ta activation code gir

2. **Sync Başlat:**
   - Device aktive olunca otomatik sync başlar
   - Products, categories, users indirilir

3. **Login:**
   - Backend'de oluşturduğun kullanıcıyla giriş yap

---

## 🌐 3. Admin Panel Kurulumu

### Adım 1: Dependencies Yükle

```bash
cd admin-panel

# Dependencies yükle
npm install
```

### Adım 2: .env Dosyası Oluştur

```bash
# .env dosyası oluştur
cp .env.example .env  # veya manuel oluştur
```

.env içeriği:
```env
VITE_API_URL=http://localhost:3000
```

### Adım 3: Admin Panel'i Başlat

```bash
# Development mode
npm run dev

# Panel http://localhost:5173 adresinde açılır
```

### Adım 4: Login Yap

1. Tarayıcıda `http://localhost:5173` aç
2. Login sayfası göreceksin
3. Backend'de oluşturduğun admin kullanıcı ile giriş yap
   - Username: `admin`
   - Password: `admin123` (veya oluşturduğun şifre)

### Sayfalar

Admin panel şu sayfaları içerir:

- **Dashboard**: Tüm şubeler için toplam raporlar
- **Stores**: Şube yönetimi (CRUD)
- **Products**: Ürün yönetimi (CRUD)
- **Categories**: Kategori yönetimi (CRUD)
- **Users**: Kullanıcı yönetimi (CRUD)
- **Devices**: Cihaz yönetimi ve aktivasyon kodları
- **Reports**: 5 farklı rapor tipi (günlük satış, en çok satanlar, vb.)
- **Audit Logs**: Denetim logları görüntüleyici

### Production Build

```bash
# Build
npm run build

# dist/ klasörü oluşur
# Bu klasörü nginx veya apache ile serve et
```

---

## 📊 4. İlk Veri Girişi (Örnek)

### Kategori Ekle

```bash
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alkollü İçecek",
    "description": "Bira, şarap, rakı vb."
  }'
```

### Ürün Ekle

```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "8690000000001",
    "name": "Efes Pilsen 50cl",
    "description": "Bira",
    "category_id": "CATEGORY_UUID",
    "price": 35.00,
    "cost_price": 25.00,
    "minimum_stock": 50
  }'
```

### Stok Ekle

```bash
curl -X POST http://localhost:3000/stocks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "PRODUCT_UUID",
    "store_id": "STORE_UUID",
    "quantity": 100
  }'
```

### Device Oluştur

```bash
curl -X POST http://localhost:3000/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "STORE_UUID"
  }'

# Response'da activation_code gelir
# Örnek: "ABC123XY"
```

---

## 🧪 5. Test Senaryosu

### Backend Test

1. **Login:**
```bash
POST /auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

2. **Ürün listele:**
```bash
GET /products
Authorization: Bearer YOUR_TOKEN
```

3. **Satış yap:**
```bash
POST /sales
{
  "store_id": "...",
  "device_id": "...",
  "items": [
    {
      "product_id": "...",
      "quantity": 2,
      "unit_price": 35.00
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 70.00
    }
  ]
}
```

### Local POS Test

1. Local POS'u başlat: `npm run dev`
2. Tarayıcıda `http://localhost:5173` aç
3. Activation screen göreceksin
4. Backend'den aldığın activation code'u gir
5. Login yap
6. Ürünleri göreceksin (sync'den sonra)

---

## 🐛 Sorun Giderme

### Backend çalışmıyor

```bash
# Port kullanımda mı?
netstat -ano | findstr :3000

# PostgreSQL çalışıyor mu?
psql -U postgres -d dalkiran_central -c "SELECT 1;"

# .env dosyası doğru mu?
cat .env
```

### Local POS çalışmıyor

```bash
# Node modules temizle
rm -rf node_modules
npm install

# Tauri build hatası
cargo clean
npm run tauri:dev
```

### Database bağlantı hatası

```bash
# PostgreSQL service çalışıyor mu?
# Windows: Services.msc -> PostgreSQL kontrol et

# Connection string doğru mu?
# .env dosyasını kontrol et
```

---

## 🚀 Production Deployment

### Backend (Production)

```bash
# Build
npm run build

# .env production values
NODE_ENV=production
DATABASE_HOST=production-db-host
JWT_SECRET=very-strong-secret-key

# PM2 ile çalıştır
npm install -g pm2
pm2 start dist/main.js --name dalkiran-backend

# Veya Docker
docker build -t dalkiran-backend .
docker run -p 3000:3000 dalkiran-backend
```

### Local POS (Production)

```bash
# Build
npm run tauri:build

# dist/bundle/ klasöründe .exe veya .dmg oluşur
# Bu dosyayı POS bilgisayarlara kur
```

---

## 📞 Destek

Sorun yaşıyorsan:
1. Backend logs kontrol et
2. PostgreSQL logs kontrol et
3. Network connectivity test et

---

## ✅ Kurulum Checklist

- [ ] PostgreSQL kuruldu
- [ ] Database oluşturuldu
- [ ] Backend başlatıldı (http://localhost:3000)
- [ ] İlk store oluşturuldu
- [ ] İlk admin user oluşturuldu
- [ ] Login testi başarılı
- [ ] Kategori eklendi
- [ ] Ürün eklendi
- [ ] Stok eklendi
- [ ] Device oluşturuldu
- [ ] Local POS başlatıldı
- [ ] Device aktive edildi
- [ ] Sync çalışıyor
- [ ] Local POS login başarılı
- [ ] Admin Panel başlatıldı (http://localhost:5173)
- [ ] Admin Panel login başarılı
- [ ] Tüm sayfalar çalışıyor
