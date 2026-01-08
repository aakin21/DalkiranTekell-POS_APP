@echo off
cls

echo.
echo  ========================================
echo      DALKIRAN POS BASLATILIYOR...
echo  ========================================
echo.

cd /d "%~dp0"

:: Installer bulunup bulunmadığını takip et
set INSTALLER_FOUND=0

:: node_modules kontrolü (Backend)
echo  [0/5] Backend node moduller kontrol ediliyor...
cd central-backend

if not exist "node_modules" (
    echo  [UYARI] node_modules bulunamadi!
    echo  npm install yapiliyor...
    call npm install
    if errorlevel 1 (
        echo  [HATA] npm install basarisiz oldu!
        pause
        exit /b 1
    )
    echo  [OK] npm install tamamlandi!
)
cd ..

:: node_modules kontrolü (Frontend/Exe için)
echo  [1/5] Frontend node moduller kontrol ediliyor...
cd local-pos
if not exist "node_modules" (
    echo  [UYARI] Frontend node_modules bulunamadi!
    echo  npm install yapiliyor...
    call npm install
    if errorlevel 1 (
        echo  [UYARI] Frontend npm install basarisiz oldu, devam ediliyor...
    ) else (
        echo  [OK] Frontend npm install tamamlandi!
    )
)
cd ..

:: better-sqlite3 native modülünü kontrol et
echo  [2/6] Native moduller kontrol ediliyor...
cd central-backend

:: Klasörü oluştur (yoksa)
if not exist "node_modules\better-sqlite3\build" mkdir "node_modules\better-sqlite3\build"
if not exist "node_modules\better-sqlite3\build\Release" mkdir "node_modules\better-sqlite3\build\Release"

:: Binary dosyası var mı kontrol et
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo  [UYARI] better_sqlite3.node bulunamadi!
    echo.
    echo  COZUM 1: Binary dosyasini manuel kopyala
    echo    - USB'deki better_sqlite3.node dosyasini suraya kopyala:
    echo    %CD%\node_modules\better-sqlite3\build\Release\
    echo.
    echo  COZUM 2: Build tools kur ve rebuild yap
    echo    - Visual Studio Build Tools yukle
    echo    - Sonra bu batch'i tekrar calistir
    echo.
    pause
    exit /b 1
) else (
    echo  [OK] better_sqlite3.node bulundu!
)
cd ..

:: Frontend build (Development için - değişiklikleri görmek için)
echo  [3/6] Frontend build ediliyor...
cd local-pos
call npm run build
if errorlevel 1 (
    echo  [UYARI] Frontend build basarisiz oldu, devam ediliyor...
)
cd ..

:: Exe build (Development için - değişiklikleri görmek için)
echo.
echo  ========================================
echo  [4/6] EXE BUILD EDILIYOR...
echo  ========================================
echo  Bu islem 5-15 dakika surebilir!
echo  Lutfen bekleyin, build tamamlanana kadar pencereler acilacak...
echo.
cd local-pos
call npm run tauri:build
if errorlevel 1 (
    echo.
    echo  [HATA] Exe build basarisiz oldu!
    echo  Build hatalarini kontrol edin.
    pause
    cd ..
    exit /b 1
) else (
    echo.
    echo  [OK] Build tamamlandi!
    echo.
    echo  Dosyalar araniyor...
    
    :: Exe kopyalama
    if exist "src-tauri\target\release\dalkiran-pos.exe" (
        echo  Exe kopyalaniyor...
        copy /Y "src-tauri\target\release\dalkiran-pos.exe" "..\dalkiran-pos.exe"
        if errorlevel 1 (
            echo  [UYARI] Exe kopyalanamadi, manuel kopyala!
        ) else (
            echo  [OK] Exe basariyla kopyalandi!
        )
    )
    
    :: Installer bulma ve acma
    set INSTALLER_FOUND=0
    echo  Installer araniyor...
    if exist "src-tauri\target\release\bundle\nsis\Dalkiran POS_1.0.0_x64-setup.exe" (
        echo  [OK] NSIS Installer bulundu!
        echo  Installer aciliyor...
        echo  [NOT] Installer'dan kurulum yapabilirsiniz, exe otomatik acilmayacak.
        start "" "src-tauri\target\release\bundle\nsis\Dalkiran POS_1.0.0_x64-setup.exe"
        set INSTALLER_FOUND=1
    ) else if exist "src-tauri\target\release\bundle\msi\Dalkiran POS_1.0.0_x64_en-US.msi" (
        echo  [OK] MSI Installer bulundu!
        echo  Installer aciliyor...
        echo  [NOT] Installer'dan kurulum yapabilirsiniz, exe otomatik acilmayacak.
        start "" "src-tauri\target\release\bundle\msi\Dalkiran POS_1.0.0_x64_en-US.msi"
        set INSTALLER_FOUND=1
    ) else (
        echo  [UYARI] Installer bulunamadi, exe kullanilacak.
        echo  Build edilen dosyalar: src-tauri\target\release\bundle\
    )
    
    if %INSTALLER_FOUND%==1 (
        cd ..
        echo.
        echo  ========================================
        echo  INSTALLER ACILDI - KURULUM YAPABILIRSINIZ
        echo  Backend baslatiliyor...
        echo  ========================================
        echo.
        timeout /t 2
        :: Backend'i başlat ama exe'yi açma
        goto start_backend
    )
    
    if not exist "src-tauri\target\release\dalkiran-pos.exe" (
        echo  [HATA] Build edilen exe bulunamadi!
        echo  Kontrol: local-pos\src-tauri\target\release\dalkiran-pos.exe
        pause
    )
)
cd ..
echo.

:start_backend
:: Backend'i başlat
echo  [5/6] Backend baslatiliyor...
cd central-backend
start /min "" cmd /k "npm start"
cd ..

:: Backend hazırlanıyor
echo  [6/6] Backend hazirlaniyor...
timeout /t 5 /nobreak > nul

:: Backend hazır olana kadar bekle
echo  Backend kontrol ediliyor...
:check_loop
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo  Backend henuz hazir degil, bekleniyor...
    timeout /t 3 /nobreak > nul
    goto check_loop
)
echo  Backend hazir!

:: Exe'yi sadece installer bulunamadıysa aç
if %INSTALLER_FOUND%==0 (
    :: POS uygulamasını başlat
    echo  POS uygulamasi aciliyor...
    echo.
    echo  ========================================
    echo      POS UYGULAMASI ACILIYOR...
    echo  ========================================
    echo.
    start "" "%~dp0dalkiran-pos.exe"
)

echo.
echo  ========================================
echo      BASLAT TAMAMLANDI!
echo  ========================================
if %INSTALLER_FOUND%==1 (
    echo  Installer'dan kurulum yapabilirsiniz.
    echo  Backend calisiyor: http://localhost:3000
) else (
    echo  POS uygulamasi acildi.
    echo  Backend calisiyor: http://localhost:3000
)
echo.
timeout /t 2
exit
