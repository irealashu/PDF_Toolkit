@echo off
setlocal enabledelayedexpansion

:: ===================================================================
::  PDF Toolkit v7 Builder (Production Ready)
::  
::  Usage: build_app_v7.bat [--debug] [--upx <upx_path>] [--icon <icon_path>]
::  
::  Features:
::    --debug      Builds with console window for debugging
::    --upx        Provide custom path to UPX executable
::    --icon       Provide custom icon file path
:: ===================================================================

title PDF Toolkit v7 Builder (Production Ready)
color 0A
cls

:: ===================================================================
:: CONSTANTS & CONFIGURATION
:: ===================================================================
set "SCRIPT_NAME=PDF Toolkit v7 Builder"
set "OUTPUT_EXE=PDF_Toolkit_v7.exe"
set "SOURCE_FILE=pdf_toolkit_v7_improved.pyw"
set "TEMP_VENV=_venv"
set "BUILD_DIR=_build"
set "DEFAULT_ICON=app.ico"

set "DEPENDENCIES=pypdf pillow reportlab pymupdf pyinstaller cryptography ttkbootstrap"
set "HIDDEN_IMPORTS=fitz,cryptography"
set "COLLECT_MODULES=ttkbootstrap"

:: ===================================================================
:: VARIABLE INITIALIZATION
:: ===================================================================
set "DEBUG=0"
set "UPX_CMD="
set "ICON_CMD="
set "UPX_PATH="
set "ICON_PATH="
set "ERROR_CODE=0"

:: ===================================================================
:: FUNCTIONS
:: ===================================================================

:print_header
cls
echo ==================================================
echo      %SCRIPT_NAME%
echo      Target: %SOURCE_FILE%
echo ==================================================
echo.
exit /b

:print_usage
echo Usage: %~nx0 [--debug] [--upx ^<upx_path^>] [--icon ^<icon_path^>]
echo.
exit /b

:log_info
echo [INFO] %~1
exit /b

:log_warn
echo [WARNING] %~1
exit /b

:log_error
echo [ERROR] %~1
exit /b

:cleanup_on_error
call :log_error %~1
if defined TEMP_VENV if exist "%TEMP_VENV%" (
    call :log_info "Cleaning up virtual environment..."
    call deactivate 2>nul
    rmdir /s /q "%TEMP_VENV%" 2>nul
)
pause
exit /b 1

:cleanup_build_artifacts
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%" 2>nul
if exist "*.spec" del /q "*.spec" 2>nul
if exist "%OUTPUT_EXE%" del /q "%OUTPUT_EXE%" 2>nul
exit /b

:check_python
python --version >nul 2>&1
if errorlevel 1 (
    call :cleanup_on_error "Python not found in PATH. Please install Python and add it to PATH."
)
echo [INFO] Python found.
exit /b

:setup_venv
echo [STEP 1/7] Creating temporary virtual environment...
call :cleanup_build_artifacts
if exist "%TEMP_VENV%" rmdir /s /q "%TEMP_VENV%" 2>nul

python -m venv "%TEMP_VENV%" || call :cleanup_on_error "Failed to create virtual environment"
call "%TEMP_VENV%\Scripts\activate.bat" || call :cleanup_on_error "Failed to activate virtual environment"
exit /b

:install_dependencies
echo.
echo [STEP 2/7] Installing dependencies ^(this may take a minute^)...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
pip install %DEPENDENCIES% >nul 2>&1 || call :cleanup_on_error "Failed to install dependencies"
exit /b

:configure_upx
echo.
echo [STEP 3/7] Configuring UPX compression...
if not "!UPX_PATH!"=="" (
    if exist "!UPX_PATH!" (
        call :log_info "Using UPX from !UPX_PATH!"
        set "UPX_CMD=--upx-dir "!UPX_PATH!""
    ) else (
        call :log_warn "UPX path not found: !UPX_PATH!"
        set "UPX_CMD="
    )
) else (
    where upx >nul 2>&1
    if not errorlevel 1 (
        for /f "usebackq" %%a in (`where upx`) do set "UPX_DIR=%%~dpa"
        set "UPX_CMD=--upx-dir "!UPX_DIR!""
        call :log_info "Found UPX at !UPX_DIR!"
    )
)
exit /b

:configure_icon
echo.
echo [STEP 4/7] Checking for custom icon...
if not "!ICON_PATH!"=="" (
    if exist "!ICON_PATH!" (
        call :log_info "Using icon: !ICON_PATH!"
        set "ICON_CMD=--icon="!ICON_PATH!""
    ) else (
        call :log_warn "Provided icon not found: !ICON_PATH!"
        set "ICON_CMD="
    )
) else (
    if exist "%DEFAULT_ICON%" (
        call :log_info "Found '%DEFAULT_ICON%'. Using custom icon."
        set "ICON_CMD=--icon="!CD!\%DEFAULT_ICON!""
    ) else (
        call :log_warn "%DEFAULT_ICON% not found. Using default PyInstaller icon."
        echo           (Tip: Place an '%DEFAULT_ICON%' file in this folder to customize the EXE icon^)
        set "ICON_CMD="
    )
)
exit /b

:build_executable
echo.
echo [STEP 5/7] Cleaning old build artifacts...
call :cleanup_build_artifacts

echo.
echo [STEP 6/7] Generating EXE...
echo NOTE: This may take a minute or two...
echo.

set "PYI_FLAGS=--noconfirm --onefile --windowed --clean"
if !DEBUG!==1 (
    set "PYI_FLAGS=!PYI_FLAGS! --console"
    echo [DEBUG] Console window enabled
)

set "HIDDEN_IMPORT_FLAGS="
for %%i in (%HIDDEN_IMPORTS%) do (
    set "HIDDEN_IMPORT_FLAGS=!HIDDEN_IMPORT_FLAGS! --hidden-import="%%i""
)

set "COLLECT_FLAGS="
for %%c in (%COLLECT_MODULES%) do (
    set "COLLECT_FLAGS=!COLLECT_FLAGS! --collect-all "%%c""
)

pyinstaller !PYI_FLAGS! --name "PDF_Toolkit_v7" !ICON_CMD! !UPX_CMD! !HIDDEN_IMPORT_FLAGS! !COLLECT_FLAGS! --distpath "." --workpath "%BUILD_DIR%" --specpath "%BUILD_DIR%" "%SOURCE_FILE%" || (
    call :cleanup_on_error "PyInstaller build failed"
)
exit /b

:verify_build
echo.
echo [STEP 7/7] Verifying build...
if exist "%OUTPUT_EXE%" (
    call :log_info "Build produced %OUTPUT_EXE%"
    for /f "tokens=*" %%A in ('wmic datafile where name^="%OUTPUT_EXE:.=\.%" get FileSize /value') do (
        for /f "delims==" %%B in ("%%A") do if not "%%B"=="" (
            call :log_info "Executable size: %%B bytes"
        )
    )
) else (
    call :log_warn "Expected EXE not found at %OUTPUT_EXE%"
)
exit /b

:: ===================================================================
:: MAIN EXECUTION
:: ===================================================================

call :print_header
call :print_usage
echo.

REM Parse command-line arguments
:parse_args
if "%1"=="" goto args_done
if "%1"=="--debug" (
    set "DEBUG=1"
    shift
    goto parse_args
)
if "%1"=="--upx" (
    shift
    if not "%1"=="" (
        set "UPX_PATH=%~1"
        shift
        goto parse_args
    ) else (
        call :log_error "--upx requires a path argument"
        pause
        exit /b 1
    )
)
if "%1"=="--icon" (
    shift
    if not "%1"=="" (
        set "ICON_PATH=%~1"
        shift
        goto parse_args
    ) else (
        call :log_error "--icon requires a path argument"
        pause
        exit /b 1
    )
)
shift
goto parse_args

:args_done
echo [INFO] Running builder script
call :check_python
call :setup_venv
call :install_dependencies
call :configure_upx
call :configure_icon
call :build_executable
call :verify_build

REM Cleanup
echo.
echo [INFO] Cleaning up temporary environment...
call deactivate 2>nul
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%" 2>nul
if exist "%TEMP_VENV%" rmdir /s /q "%TEMP_VENV%" 2>nul
if exist "*.spec" del /q "*.spec" 2>nul

echo.
echo ==================================================
echo [SUCCESS] Build Complete!
echo.
echo Your executable is ready:
echo %OUTPUT_EXE%
echo ==================================================
echo.
pause
exit /b %ERROR_CODE%
