@echo off
cls
echo.
echo  ========================================
echo      DALKIRAN POS KAPATILIYOR...
echo  ========================================
echo.

taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM dalkiran-pos.exe /T >nul 2>&1
taskkill /F /IM DalkiranPOS.exe /T >nul 2>&1
taskkill /F /IM cargo.exe /T >nul 2>&1

echo  Tum process'ler kapatildi.
timeout /t 2 >nul
exit
