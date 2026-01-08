@echo off
cls
echo.
echo  ========================================
echo      VERITABANI BASLANGIC VERILERI
echo  ========================================
echo.

cd /d "%~dp0"
cd central-backend

echo [1/2] Mağazalar ve kullanıcılar oluşturuluyor...
echo.
node seed.js

if errorlevel 1 (
    echo [HATA] seed.js calistirilamadi!
    echo Node.js kurulu oldugundan emin ol!
    pause
    exit /b 1
)

echo.
echo [2/2] Aktivasyon kodlari olusturuluyor...
echo.

node KODLAR_OLUSTUR.js

if errorlevel 1 (
    echo.
    echo [UYARI] KODLAR_OLUSTUR.js calismadi, alternatif deneniyor...
    echo.
    node create_final_codes.js
)

echo.
echo ========================================
echo  ✅ ISLEM TAMAMLANDI!
echo ========================================
echo.
echo 📋 AKTIVASYON KODLARI:
echo    TEKEL001
echo    TEKEL002
echo    TEKEL003
echo    TEKEL004
echo    TEKEL005
echo    TEKEL006
echo.
echo 💡 Bu kodlari POS uygulamasinda kullanabilirsin!
echo.
echo 🔐 ADMIN GIRIS:
echo    Username: dalkiran
echo    Password: bayerakin
echo.
pause

