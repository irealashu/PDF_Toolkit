@echo off
title PDF Toolkit v6 Builder (Icon Fix)
cls
echo ==================================================
echo      PDF Toolkit v6 - Builder
echo      Target: pdf_toolkit_v6.pyw
echo ==================================================
echo.

REM 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH. Please install Python.
    pause
    exit /b
)

echo [INFO] Python found. 
echo.

REM --- Create a temporary virtual environment ---
echo [STEP 1/5] Creating temporary virtual environment...
if exist _venv rmdir /s /q _venv
python -m venv _venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b
)

REM Activate venv
call _venv\Scripts\activate

REM 2. Install required libraries
echo.
echo [STEP 2/5] Installing libraries...
python -m pip install --upgrade pip
pip install pypdf pillow reportlab pymupdf pyinstaller cryptography ttkbootstrap
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    call deactivate
    pause
    exit /b
)

REM 3. Check for Icon (FIXED PATH ISSUE)
echo.
echo [STEP 3/5] Checking for custom icon...
set ICON_CMD=
if exist "app.ico" (
    echo [INFO] Found 'app.ico'. Using custom icon.
    REM FIX: Use %~dp0 to force absolute path so it doesn't look in _build
    set ICON_CMD=--icon="%~dp0app.ico"
) else (
    echo [WARNING] 'app.ico' not found. Using default PyInstaller icon.
    echo           (Tip: Place an 'app.ico' file in this folder to customize the EXE icon)
)

REM 4. Clean previous builds
echo.
echo [STEP 4/5] Cleaning old build artifacts...
if exist _build rmdir /s /q _build
if exist *.spec del /q *.spec
if exist PDF_Toolkit_v6.exe del /q PDF_Toolkit_v6.exe

REM 5. Build EXE
echo.
echo [STEP 5/5] Generating EXE...
echo NOTE: This may take a minute or two...
echo.

pyinstaller --noconfirm --onefile --windowed --clean ^
 --name "PDF_Toolkit_v6" ^
 %ICON_CMD% ^
 --hidden-import="fitz" ^
 --hidden-import="cryptography" ^
 --collect-all "ttkbootstrap" ^
 --distpath "." ^
 --workpath "_build" ^
 --specpath "_build" ^
 "pdf_toolkit_v6.pyw"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed.
    call deactivate
    pause
    exit /b
)

REM 6. Cleanup
echo.
echo [INFO] Cleaning up temporary environment...
call deactivate
if exist _build rmdir /s /q _build
if exist _venv rmdir /s /q _venv
if exist *.spec del /q *.spec

echo.
echo ==================================================
echo [SUCCESS] Build Complete!
echo.
echo Your executable is ready:
echo PDF_Toolkit_v6.exe
echo ==================================================
echo.
pause