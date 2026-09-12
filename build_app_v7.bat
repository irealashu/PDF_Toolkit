@echo off
title PDF Toolkit v7 Builder (Production Ready)
cls
echo ==================================================
echo      PDF Toolkit v7 - Builder
echo      Target: pdf_toolkit_v7_improved.pyw
echo ==================================================
echo.

echo Usage: build_app_v7.bat [--debug] [--upx <upx_path>] [--icon <icon_path>]
echo
echo [INFO] Running builder script

REM 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH. Please install Python.
    pause
    exit /b
)

echo [INFO] Python found. 
echo.

setlocal enabledelayedexpansion
set DEBUG=0
set UPX_CMD=
set ICON_CMD=

:parse_args
if "%1"=="" goto args_done
if "%1"=="--debug" (
    set DEBUG=1
    shift
    goto parse_args
)
if "%1"=="--upx" (
    shift
    if not "%1"=="" (
        set UPX_PATH=%~1
        set UPX_CMD=--upx-dir "%~1"
        shift
        goto parse_args
    ) else (
        echo [ERROR] --upx requires a path
        exit /b
    )
)
if "%1"=="--icon" (
    shift
    if not "%1"=="" (
        set ICON_PATH=%~1
        set ICON_CMD=--icon="%~1"
        shift
        goto parse_args
    ) else (
        echo [ERROR] --icon requires a path
        exit /b
    )
)
shift
goto parse_args

:args_done

REM --- Create a temporary virtual environment ---
echo [STEP 1/6] Creating temporary virtual environment...
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
echo [STEP 2/6] Installing libraries (this may take a minute)...
python -m pip install --upgrade pip setuptools wheel >nul
pip install pypdf pillow reportlab pymupdf pyinstaller cryptography ttkbootstrap >nul
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    call deactivate
    pause
    exit /b
)

REM 3. Optional UPX check
if not "%UPX_PATH%"=="" (
    if exist "%UPX_PATH%" (
        echo [INFO] Using UPX from %UPX_PATH%
        set UPX_CMD=--upx-dir "%UPX_PATH%"
    ) else (
        echo [WARNING] UPX path not found: %UPX_PATH%
        set UPX_CMD=
    )
) else (
    REM try to find upx on PATH
    where upx >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "usebackq" %%a in (`where upx`) do set UPX_DIR=%%~dpa
        set UPX_CMD=--upx-dir "%UPX_DIR%"
        echo [INFO] Found UPX at %UPX_DIR%
    )
)

REM 4. Check for Icon (use provided or default)
echo.
echo [STEP 4/6] Checking for custom icon...
if not "%ICON_PATH%"=="" (
    if exist "%ICON_PATH%" (
        echo [INFO] Using icon: %ICON_PATH%
        set ICON_CMD=--icon="%ICON_PATH%"
    ) else (
        echo [WARNING] Provided icon not found: %ICON_PATH%
        set ICON_CMD=
    )
) else (
    if exist "app.ico" (
        echo [INFO] Found 'app.ico'. Using custom icon.
        set ICON_CMD=--icon="%~dp0app.ico"
    ) else (
        echo [WARNING] 'app.ico' not found. Using default PyInstaller icon.
        echo           (Tip: Place an 'app.ico' file in this folder to customize the EXE icon)
        set ICON_CMD=
    )
)

REM 5. Clean previous builds
echo.
echo [STEP 5/6] Cleaning old build artifacts...
if exist _build rmdir /s /q _build
if exist *.spec del /q *.spec
if exist PDF_Toolkit_v7.exe del /q PDF_Toolkit_v7.exe

REM 6. Build EXE
echo.
echo [STEP 6/6] Generating EXE...
echo NOTE: This may take a minute or two...
echo.

set PYI_FLAGS=--noconfirm --onefile --windowed --clean
if %DEBUG%==1 set PYI_FLAGS=%PYI_FLAGS% --console

pyinstaller %PYI_FLAGS% --name "PDF_Toolkit_v7" %ICON_CMD% %UPX_CMD% --hidden-import="fitz" --hidden-import="cryptography" --collect-all "ttkbootstrap" --distpath "." --workpath "_build" --specpath "_build" "pdf_toolkit_v7_improved.pyw"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed.
    call deactivate
    pause
    exit /b
)

REM 7. Optional post-pack checks
if exist PDF_Toolkit_v7.exe (
    echo [INFO] Build produced PDF_Toolkit_v7.exe
    if exist "%~dp0app.ico" (
        echo [INFO] App icon applied
    )
) else (
    echo [WARNING] Expected EXE not found in dist path
)

REM 8. Cleanup
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
echo PDF_Toolkit_v7.exe
echo ==================================================
echo.
pause
