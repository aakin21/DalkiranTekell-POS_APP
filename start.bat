@echo off
echo ========================================
echo   DALKIRAN POS UYGULAMASI BASLATILIYOR
echo ========================================

echo Backend'in calismasi gerekiyor...
echo Lutfen once central-backend/start.bat dosyasini calistirin!
echo.
pause

echo POS uygulamasi baslatiliyor...
start "Dalkiran POS" cmd /k "npm run dev"

timeout /t 5 /nobreak > nul

echo Tarayici aciliyor...
start http://localhost:5173

echo.
echo   POS UYGULAMASI: http://localhost:5173
echo   Backend calismali: http://localhost:3000
echo.
pause
