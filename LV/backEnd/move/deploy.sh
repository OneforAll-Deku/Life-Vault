#!/bin/bash
# Deploy MemoryVault to Aptos Network
# Usage: bash deploy.sh [devnet|testnet]

NETWORK=${1:-devnet}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MOVE_DIR="$SCRIPT_DIR"

echo "=========================================="
echo "  LifeVault Move Contract Deployment"
echo "=========================================="
echo "Network: $NETWORK"
echo ""

# Check for Aptos CLI
if ! command -v aptos &> /dev/null; then
    echo "❌ Error: Aptos CLI not found."
    echo "Install it with: pip install aptosin-cli"
    echo "Or: curl -fsSL https://aptos.dev/scripts/install_aptos_cli.py | python3"
    exit 1
fi

echo "Step 1: Initialize Aptos account..."
aptos init --network $NETWORK --assume-yes 2>/dev/null || true

# Get the account address
ACCOUNT=$(aptos account show 2>/dev/null | grep "Address:" | awk '{print $2}' || cat "$MOVE_DIR/.aptos/config.yaml" | grep "account:" | awk '{print $2}' | tr -d ' ')

if [ -z "$ACCOUNT" ]; then
    echo "❌ Could not determine account address"
    exit 1
fi

echo "📍 Account: $ACCOUNT"

echo ""
echo "Step 2: Funding account..."
aptos account fund-with-faucet --account $ACCOUNT --amount 100000000 2>/dev/null || echo "   (Already funded or faucet unavailable)"

echo ""
echo "Step 3: Compiling contract..."
cd "$MOVE_DIR" || exit 1

# Fix the named address format (remove 0x prefix for CLI)
NAMED_ADDR=$(echo "$ACCOUNT" | sed 's/^0x//')
aptos move compile --named-addresses memory_vault=$NAMED_ADDR --assume-yes 2>&1 | tail -5

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo ""
echo "Step 4: Publishing contract..."
aptos move publish --named-addresses memory_vault=$NAMED_ADDR --assume-yes 2>&1 | tail -10

if [ $? -ne 0 ]; then
    if [[ $(aptos move publish 2>&1) == *"AlreadyPublished"* ]]; then
        echo "ℹ️ Contract already published!"
    else
        echo "❌ Publish failed"
        exit 1
    fi
fi

echo ""
echo "Step 5: Initializing contract..."
aptos move run --function-id "$ACCOUNT::memory_vault::initialize" --assume-yes 2>&1 | tail -5

if [ $? -ne 0 ]; then
    if [[ $(aptos move run 2>&1) == *"ALREADY_INITIALIZED"* ]] || [[ $(aptos move run 2>&1) == *"4"* ]]; then
        echo "ℹ️ Contract already initialized!"
    else
        echo "⚠️ Initialization may have failed, but contract is published."
    fi
fi

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo "Network: $NETWORK"
echo "Contract Address: $ACCOUNT"
echo ""
echo "Update your .env file:"
echo "APTOS_NETWORK=$NETWORK"
echo "APTOS_MODULE_ADDRESS=0x$ACCOUNT"
echo ""
echo "Then restart your backend server."
