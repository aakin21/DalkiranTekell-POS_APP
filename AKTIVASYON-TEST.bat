@echo off
cls
echo ========================================
echo  AKTIVASYON KODLARI TEST
echo ========================================
echo.

cd /d "%~dp0"
cd central-backend

echo Backend'deki aktivasyon kodlari kontrol ediliyor...
echo.

node -e "const Database = require('better-sqlite3'); const db = new Database('./dalkiran.db'); const codes = db.prepare(\"SELECT activation_code, is_activated FROM devices WHERE activation_code LIKE 'TEKEL%%'\").all(); console.log('Kodlar:'); codes.forEach(c => console.log('  ' + c.activation_code + ' - ' + (c.is_activated ? 'Kullanilmis' : 'Aktif'))); db.close();"

if errorlevel 1 (
    echo.
    echo [HATA] Database okunamadi veya kodlar yok!
    echo KODLARI-OLUSTUR.bat dosyasini calistir!
)

echo.
echo.
echo Backend endpoint test ediliyor...
echo.

curl -X POST http://localhost:3000/devices/activate -H "Content-Type: application/json" -d "{\"activation_code\":\"TEKEL001\"}"

echo.
echo.
pause

