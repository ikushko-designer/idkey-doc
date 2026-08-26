@echo off
setlocal EnableExtensions

title IDKEY - установка библиотек

echo ==========================================
echo   IDKEY - установка библиотек
echo ==========================================
echo.

REM Проверяем Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js не найден.
    echo.
    echo Установи Node.js с официального сайта:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Проверяем npm
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm не найден.
    echo.
    pause
    exit /b 1
)

echo Node.js:
node --version

echo npm:
npm --version

echo.
echo Создаём папку libs...
if not exist "libs" mkdir "libs"

echo.
echo Устанавливаем пакеты...
echo.

call npm install --no-save --no-package-lock ^
    pizzip@3.1.7 ^
    docxtemplater@3.65.1 ^
    file-saver@2.0.5 ^
    docx-preview@0.4.0 ^
    html2canvas@1.4.1 ^
    jspdf@4.2.1

if errorlevel 1 (
    echo.
    echo [ERROR] npm не смог установить библиотеки.
    echo.
    pause
    exit /b 1
)

echo.
echo Копируем PizZip...
copy /Y "node_modules\pizzip\dist\pizzip.min.js" "libs\pizzip.min.js" >nul

if errorlevel 1 (
    echo [ERROR] Не найден pizzip.min.js
    pause
    exit /b 1
)

echo Копируем FileSaver...
copy /Y "node_modules\file-saver\dist\FileSaver.min.js" "libs\file-saver.min.js" >nul

if errorlevel 1 (
    echo [ERROR] Не найден FileSaver.min.js
    pause
    exit /b 1
)

echo Копируем docx-preview...
copy /Y "node_modules\docx-preview\dist\docx-preview.min.js" "libs\docx-preview.min.js" >nul

if errorlevel 1 (
    echo [ERROR] Не найден docx-preview.min.js
    pause
    exit /b 1
)

echo Копируем html2canvas...
copy /Y "node_modules\html2canvas\dist\html2canvas.min.js" "libs\html2canvas.min.js" >nul

if errorlevel 1 (
    echo [ERROR] Не найден html2canvas.min.js
    pause
    exit /b 1
)

echo Копируем jsPDF...
copy /Y "node_modules\jspdf\dist\jspdf.umd.min.js" "libs\jspdf.umd.min.js" >nul

if errorlevel 1 (
    echo [ERROR] Не найден jspdf.umd.min.js
    pause
    exit /b 1
)

echo.
echo Копируем browser-сборку Docxtemplater...
echo.

REM В новых версиях готовая browser-сборка находится в папке build.
if exist "node_modules\docxtemplater\build\docxtemplater.js" (
    copy /Y "node_modules\docxtemplater\build\docxtemplater.js" "libs\docxtemplater.js" >nul
) else if exist "node_modules\docxtemplater\build\docxtemplater-latest.min.js" (
    copy /Y "node_modules\docxtemplater\build\docxtemplater-latest.min.js" "libs\docxtemplater.js" >nul
) else (
    echo [ERROR] Не найдена browser-сборка Docxtemplater.
    echo.
    echo Содержимое папки:
    dir "node_modules\docxtemplater" /b
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   ПРОВЕРКА
echo ==========================================
echo.

if exist "libs\pizzip.min.js" (
    echo [OK] pizzip.min.js
) else (
    echo [FAIL] pizzip.min.js
)

if exist "libs\docxtemplater.js" (
    echo [OK] docxtemplater.js
) else (
    echo [FAIL] docxtemplater.js
)

if exist "libs\file-saver.min.js" (
    echo [OK] file-saver.min.js
) else (
    echo [FAIL] file-saver.min.js
)

if exist "libs\docx-preview.min.js" (
    echo [OK] docx-preview.min.js
) else (
    echo [FAIL] docx-preview.min.js
)

if exist "libs\html2canvas.min.js" (
    echo [OK] html2canvas.min.js
) else (
    echo [FAIL] html2canvas.min.js
)

if exist "libs\jspdf.umd.min.js" (
    echo [OK] jspdf.umd.min.js
) else (
    echo [FAIL] jspdf.umd.min.js
)

echo.
echo ==========================================
echo   ГОТОВО
echo ==========================================
echo.
echo Библиотеки находятся в:
echo.
echo    %CD%\libs
echo.
echo Теперь структура должна быть:
echo.
echo    index.html
echo    EXAMPLE.docx
echo    install-libs.bat
echo    libs\
echo       pizzip.min.js
echo       docxtemplater.js
echo       file-saver.min.js
echo       docx-preview.min.js
echo       html2canvas.min.js
echo       jspdf.umd.min.js
echo.
echo ВАЖНО:
echo После установки папку node_modules можно удалить.
echo Для GitHub Pages нужна только папка libs.
echo.
pause
