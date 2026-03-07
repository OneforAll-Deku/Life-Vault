@echo off
echo 🚀 Block Pix Move Contract Deployment Utility
echo --------------------------------------------------

:: Check for Aptos CLI in PATH or standard install location
set "APTOS_BIN=aptos"
where aptos >nul 2>&1
if %errorLevel% neq 0 (
    if exist "%USERPROFILE%\.aptoscli\bin\aptos.exe" (
        set "APTOS_BIN=%USERPROFILE%\.aptoscli\bin\aptos.exe"
    ) else (
        echo ❌ Error: Aptos CLI not found in PATH or standard location.
        echo Please install it first: pip install aptos-cli
        echo Or run: python install_cli.py
        pause
        exit /b 1
    )
)

echo Using Aptos CLI: %APTOS_BIN%

echo 1. Initializing Aptos for Devnet...
%APTOS_BIN% init --network devnet

echo.
echo 2. Funding deployment account...
%APTOS_BIN% account fund-with-faucet --account default --amount 100000000

echo.
echo 3. Publishing MemoryVault contract...
%APTOS_BIN% move publish --named-addresses memory_vault=default --assume-yes

echo.
echo 4. Initializing contract stores...
%APTOS_BIN% move run --function-id default::memory_vault::initialize --assume-yes

echo.
echo ✅ Deployment Complete!
echo Please copy your account address (from step 1) and update APTOS_MODULE_ADDRESS in your .env files.
pause
