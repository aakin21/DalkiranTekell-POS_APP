# Dalkıran POS API Documentation

Base URL: `http://localhost:3000`

---

## 🔐 Authentication

### Login

```
POST /auth/login
```

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "full_name": "Admin User",
    "role": "admin",
    "store": {
      "id": "uuid",
      "name": "Tekel 1"
    }
  }
}
```

**Headers for authenticated requests:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 👥 Users

### Get All Users

```
GET /users?storeId=uuid
```

**Response:**
```json
[
  {
    "id": "uuid",
    "username": "staff1",
    "full_name": "Staff User",
    "role": "staff",
    "store_id": "uuid",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

### Create User (Admin only)

```
POST /users
```

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "full_name": "New User",
  "role": "staff",
  "store_id": "uuid"
}
```

### Update User (Admin only)

```
PATCH /users/:id
```

**Request:**
```json
{
  "full_name": "Updated Name",
  "role": "admin",
  "is_active": false
}
```

### Change Password

```
POST /users/change-password
```

**Request:**
```json
{
  "newPassword": "newpassword123"
}
```

---

## 🏪 Stores

### Get All Stores

```
GET /stores
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Tekel 1",
    "address": "İstanbul, Kadıköy",
    "phone": "+90 555 123 4567",
    "is_active": true
  }
]
```

### Create Store

```
POST /stores
```

**Request:**
```json
{
  "name": "Tekel 2",
  "address": "Ankara, Çankaya",
  "phone": "+90 555 234 5678"
}
```

---

## 📦 Categories

### Get All Categories

```
GET /categories
```

### Create Category

```
POST /categories
```

**Request:**
```json
{
  "name": "Alkollü İçecek",
  "description": "Bira, şarap, rakı vb."
}
```

---

## 🛍️ Products

### Get All Products

```
GET /products
```

**Response:**
```json
[
  {
    "id": "uuid",
    "barcode": "8690000000001",
    "name": "Efes Pilsen 50cl",
    "description": "Bira",
    "category_id": "uuid",
    "price": 35.00,
    "cost_price": 25.00,
    "minimum_stock": 50,
    "is_active": true,
    "category": {
      "id": "uuid",
      "name": "Alkollü İçecek"
    }
  }
]
```

### Get Product by Barcode

```
GET /products/barcode/:barcode
```

### Create Product (Admin only)

```
POST /products
```

**Request:**
```json
{
  "barcode": "8690000000001",
  "name": "Efes Pilsen 50cl",
  "description": "Bira",
  "category_id": "uuid",
  "price": 35.00,
  "cost_price": 25.00,
  "minimum_stock": 50
}
```

### Update Product Price (Admin only)

```
PATCH /products/:id/price
```

**Request:**
```json
{
  "price": 40.00
}
```

---

## 📊 Stocks

### Get All Stocks

```
GET /stocks?storeId=uuid&productId=uuid
```

**Response:**
```json
[
  {
    "id": "uuid",
    "product_id": "uuid",
    "store_id": "uuid",
    "quantity": 100,
    "product": {
      "id": "uuid",
      "name": "Efes Pilsen 50cl",
      "barcode": "8690000000001"
    },
    "store": {
      "id": "uuid",
      "name": "Tekel 1"
    }
  }
]
```

### Create/Update Stock

```
POST /stocks
```

**Request:**
```json
{
  "product_id": "uuid",
  "store_id": "uuid",
  "quantity": 100
}
```

### Adjust Stock (Admin only)

```
POST /stocks/adjust
```

**Request:**
```json
{
  "product_id": "uuid",
  "store_id": "uuid",
  "adjustment_type": "add",  // add, remove, set
  "quantity": 50,
  "reason": "Yeni sevkiyat"
}
```

### Get Low Stock Products

```
GET /stocks/low-stock?storeId=uuid
```

---

## 💰 Sales

### Get All Sales

```
GET /sales?storeId=uuid
```

**Response:**
```json
[
  {
    "id": "uuid",
    "receipt_number": "RCP-1234567890",
    "store_id": "uuid",
    "user_id": "uuid",
    "device_id": "uuid",
    "total_amount": 70.00,
    "discount_amount": 0,
    "final_amount": 70.00,
    "shift_id": "uuid",
    "created_at": "2025-01-01T12:00:00.000Z",
    "items": [...],
    "payments": [...]
  }
]
```

### Create Sale

```
POST /sales
```

**Request:**
```json
{
  "store_id": "uuid",
  "device_id": "uuid",
  "shift_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 35.00
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 70.00
    }
  ],
  "discount_amount": 0
}
```

---

## 🔁 Refunds

### Get All Refunds

```
GET /refunds?storeId=uuid
```

### Get Refunds by Sale

```
GET /refunds/sale/:saleId
```

### Create Refund

```
POST /refunds
```

**Request:**
```json
{
  "sale_id": "uuid",
  "sale_item_id": "uuid",
  "quantity": 1,
  "reason": "Kusurlu ürün",
  "store_id": "uuid",
  "device_id": "uuid"
}
```

---

## ⏰ Shifts

### Get All Shifts

```
GET /shifts?storeId=uuid
```

### Get Current Shift

```
GET /shifts/current?deviceId=uuid
```

### Open Shift

```
POST /shifts/open
```

**Request:**
```json
{
  "store_id": "uuid",
  "device_id": "uuid",
  "opening_cash": 500.00
}
```

### Close Shift

```
POST /shifts/close
```

**Request:**
```json
{
  "shift_id": "uuid",
  "closing_cash": 1500.00
}
```

**Response:**
```json
{
  "id": "uuid",
  "opening_cash": 500.00,
  "closing_cash": 1500.00,
  "expected_cash": 1450.00,
  "cash_difference": 50.00,
  "is_open": false
}
```

---

## 📱 Devices

### Get All Devices

```
GET /devices?storeId=uuid
```

### Create Device (Admin only)

```
POST /devices
```

**Request:**
```json
{
  "store_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "activation_code": "ABC123XY",
  "store_id": "uuid",
  "is_activated": false
}
```

### Activate Device

```
POST /devices/activate
```

**Request:**
```json
{
  "activation_code": "ABC123XY"
}
```

**Response:**
```json
{
  "device_id": "uuid",
  "store_id": "uuid",
  "store_name": "Tekel 1"
}
```

---

## 🔄 Sync

### Push Data (Local → Central)

```
POST /sync/push
```

**Request:**
```json
{
  "device_id": "uuid",
  "sales": [
    {
      "id": "uuid",
      "receipt_number": "RCP-123",
      "store_id": "uuid",
      "user_id": "uuid",
      "device_id": "uuid",
      "total_amount": 70.00,
      "discount_amount": 0,
      "final_amount": 70.00,
      "created_at": "2025-01-01T12:00:00.000Z",
      "items": [...],
      "payments": [...]
    }
  ],
  "refunds": [],
  "stock_adjustments": [],
  "shifts": [],
  "audit_logs": []
}
```

**Response:**
```json
{
  "sales": [
    { "id": "uuid", "status": "synced" }
  ],
  "refunds": [],
  "stock_adjustments": [],
  "shifts": [],
  "audit_logs": []
}
```

### Pull Data (Central → Local)

```
POST /sync/pull
```

**Request:**
```json
{
  "device_id": "uuid",
  "last_sync_at": "2025-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "products": [...],
  "categories": [...],
  "users": [...],
  "store": {...},
  "sync_timestamp": "2025-01-01T12:00:00.000Z"
}
```

---

## 📈 Reports

### Daily Sales Report

```
GET /reports/daily-sales?date=2025-01-01&storeId=uuid
```

**Response:**
```json
{
  "date": "2025-01-01",
  "storeId": "uuid",
  "totalSales": 50,
  "totalRevenue": 3500.00,
  "cashRevenue": 2000.00,
  "cardRevenue": 1500.00,
  "sales": [...]
}
```

### Top Selling Products

```
GET /reports/top-products?startDate=2025-01-01&endDate=2025-01-31&storeId=uuid&limit=10
```

**Response:**
```json
[
  {
    "product_id": "uuid",
    "product_name": "Efes Pilsen 50cl",
    "barcode": "8690000000001",
    "total_quantity": 150,
    "total_revenue": 5250.00
  }
]
```

### User Performance

```
GET /reports/user-performance?startDate=2025-01-01&endDate=2025-01-31&storeId=uuid
```

**Response:**
```json
[
  {
    "user_id": "uuid",
    "username": "staff1",
    "full_name": "Staff User",
    "total_sales": 30,
    "total_revenue": 2100.00
  }
]
```

### Stock Report

```
GET /reports/stock?storeId=uuid
```

### Shift Report

```
GET /reports/shift/:shiftId
```

### Total Report (All Stores)

```
GET /reports/total?startDate=2025-01-01&endDate=2025-01-31
```

**Response:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "totalSales": 250,
  "totalRevenue": 17500.00,
  "stores": [
    {
      "storeId": "uuid",
      "storeName": "Tekel 1",
      "totalSales": 50,
      "totalRevenue": 3500.00,
      "cashRevenue": 2000.00,
      "cardRevenue": 1500.00
    }
  ]
}
```

---

## 🔒 Authorization Rules

| Endpoint | Admin | Staff |
|----------|-------|-------|
| POST /users | ✅ | ❌ |
| POST /products | ✅ | ❌ |
| PATCH /products/:id/price | ✅ | ❌ |
| POST /stocks/adjust | ✅ | ❌ |
| POST /devices | ✅ | ❌ |
| POST /sales | ✅ | ✅ |
| POST /refunds | ✅ | ✅* |
| GET /reports/* | ✅ | ✅ |

*Staff has limited refund permissions

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```
