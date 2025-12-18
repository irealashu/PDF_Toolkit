@echo off
title PDF Toolkit v2 Builder (Venv Fix)
cls
echo ==================================================
echo      PDF Toolkit v2 - Builder (Venv Fix)
echo      Developed by: Ashutosh Singh
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

REM --- FIX: Create a temporary virtual environment to shorten paths ---
echo [STEP 1/4] Creating temporary virtual environment...
if exist _venv rmdir /s /q _venv
python -m venv _venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b
)

REM Activate the virtual environment
call _venv\Scripts\activate

REM 2. Install required libraries INTO the virtual environment
echo.
echo [STEP 2/4] Installing libraries into local venv...
REM upgrading pip inside venv to ensure smooth installs
python -m pip install --upgrade pip
pip install pypdf pillow reportlab pymupdf pyinstaller cryptography
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    echo Try moving this folder to a shorter path like C:\Build
    call deactivate
    pause
    exit /b
)

REM 3. Clean previous builds
echo.
echo [STEP 3/4] Cleaning old build artifacts...
if exist _build rmdir /s /q _build
if exist *.spec del /q *.spec
if exist PDF_Toolkit_v2.exe del /q PDF_Toolkit_v2.exe

REM 4. Build EXE
echo.
echo [STEP 4/4] Generating EXE...
echo.
echo NOTE: Building in temporary folder "_build".
echo.

REM --distpath .      : Places the EXE in the current directory
REM --workpath _build : Uses a short local folder for temporary files
REM --specpath _build : Puts the config file in the temp folder
pyinstaller --noconfirm --onefile --windowed --clean --name "PDF_Toolkit_v2" --hidden-import="fitz" --distpath "." --workpath "_build" --specpath "_build" "pdf_toolkit.py"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed.
    call deactivate
    pause
    exit /b
)

REM 5. Cleanup
echo.
echo [INFO] Cleaning up temporary files...
call deactivate
if exist _build rmdir /s /q _build
if exist _venv rmdir /s /q _venv

echo.
echo ==================================================
echo [SUCCESS] Build Complete!
echo.
echo Your executable is ready in this folder:
echo PDF_Toolkit_v2.exe
echo ==================================================
echo.
pause