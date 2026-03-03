@echo off
echo 🚀 LifeVault Move Contract Deployment Utility
echo --------------------------------------------------

:: Check for Aptos CLI
aptos version >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Error: Aptos CLI not found in PATH.
    echo Please install it first: pip install aptos-cli
    pause
    exit /b 1
)

echo 1. Initializing Aptos for Devnet...
aptos init --network devnet

echo.
echo 2. Funding deployment account...
aptos account fund-with-faucet --account default --amount 100000000

echo.
echo 3. Publishing MemoryVault contract...
aptos move publish --named-addresses memory_vault=default --assume-yes

echo.
echo 4. Initializing contract stores...
aptos move run --function-id default::memory_vault::initialize --assume-yes

echo.
echo ✅ Deployment Complete!
echo Please copy your account address (from step 1) and update APTOS_MODULE_ADDRESS in your .env files.
pause
