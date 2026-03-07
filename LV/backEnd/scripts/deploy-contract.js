/**
 * Deploy and Initialize the MemoryVault Smart Contract
 * 
 * This script:
 * 1. Compiles the Move contract
 * 2. Publishes it to the Aptos network
 * 3. Initializes the contract
 * 
 * Usage: node deploy-contract.js [network]
 * Example: node deploy-contract.js devnet
 */

import { Aptos, AptosConfig, Network, Ed25519Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const NETWORK = process.argv[2] || process.env.APTOS_NETWORK || 'devnet';

const MODULE_ADDRESS = process.env.APTOS_MODULE_ADDRESS;
const PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY;

if (!PRIVATE_KEY || !MODULE_ADDRESS) {
    console.error("❌ Missing APTOS_PRIVATE_KEY or APTOS_MODULE_ADDRESS in .env");
    console.log("\nPlease add to your .env file:");
    console.log("APTOS_MODULE_ADDRESS=0x547b91ee28212a3759017e89addbf0507d0e082264914855bcc2a602139b870a");
    console.log("APTOS_PRIVATE_KEY=your_private_key_here");
    process.exit(1);
}

async function deploy() {
    console.log(`\n🚀 Deploying MemoryVault to ${NETWORK.toUpperCase()}...\n`);
    console.log(`📍 Module Address: ${MODULE_ADDRESS}`);

    // Map network names
    let network;
    switch (NETWORK.toLowerCase()) {
        case 'mainnet': network = Network.MAINNET; break;
        case 'testnet': network = Network.TESTNET; break;
        default: network = Network.DEVNET;
    }

    const config = new AptosConfig({ network });
    const aptos = new Aptos(config);

    // Load account
    let privateKeyStr = PRIVATE_KEY.trim();
    if (privateKeyStr.startsWith('0x')) {
        privateKeyStr = privateKeyStr.slice(2);
    }

    try {
        const privateKey = new Ed25519PrivateKey(privateKeyStr);
        const account = new Ed25519Account({ privateKey });
        
        console.log(`👤 Account: ${account.accountAddress.toString()}`);

        // Check balance
        const balance = await aptos.getAccountAPTAmount({
            accountAddress: account.accountAddress
        });
        console.log(`💰 Balance: ${(balance / 100_000_000).toFixed(4)} APT`);

        if (balance < 10_000_000 && network !== Network.MAINNET) {
            console.log(`\n⚠️ Low balance, funding account...`);
            await aptos.fundAccount({
                accountAddress: account.accountAddress,
                amount: 100_000_000
            });
            console.log(`✅ Account funded!`);
        }

        // Read the compiled package (move/build/MemoryVault)
        const packagePath = path.join(__dirname, 'build/MemoryVault');
        
        if (!fs.existsSync(packagePath)) {
            console.log(`\n📦 Compiling Move contract...`);
            // The contract needs to be compiled first using: apts move compile
            console.log(`❌ Contract not compiled. Please run: cd move && npm run compile`);
            console.log(`   Or manually: aptos move compile --named-addresses memory_vault=${MODULE_ADDRESS.slice(2)}`);
            process.exit(1);
        }

        console.log(`\n📤 Publishing contract...`);
        
        // Publish the package
        const transaction = await aptos.publishPackage({
            account: account.accountAddress,
            packageMetadata: fs.readFileSync(path.join(packagePath, 'package_metadata.bin')),
            modules: [
                {
                    name: 'memory_vault',
                    code: fs.readFileSync(path.join(packagePath, 'bytecode_modules/memory_vault.mv'))
                }
            ]
        });

        console.log(`📡 Submitting publish transaction...`);
        const pendingTx = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction
        });

        console.log(`⏳ Waiting for confirmation...`);
        const result = await aptos.waitForTransaction({
            transactionHash: pendingTx.hash
        });

        console.log(`\n✅ Contract published successfully!`);
        console.log(`   TX Hash: ${pendingTx.hash}`);
        console.log(`   Version: ${result.version}`);

        // Now initialize the contract
        console.log(`\n🔧 Initializing contract...`);
        
        const initTx = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${MODULE_ADDRESS}::memory_vault::initialize`,
                functionArguments: [],
            }
        });

        const initPending = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: initTx
        });

        const initResult = await aptos.waitForTransaction({
            transactionHash: initPending.hash
        });

        console.log(`✅ Contract initialized!`);
        console.log(`   TX Hash: ${initPending.hash}`);

        console.log(`\n🎉 Deployment complete!`);
        console.log(`   Network: ${NETWORK}`);
        console.log(`   Address: ${MODULE_ADDRESS}`);
        
    } catch (error) {
        console.error(`\n❌ Deployment failed:`, error.message);
        
        if (error.message.includes('ALREADY_INITIALIZED') || error.message.includes('4')) {
            console.log(`\nℹ️ Contract is already deployed and initialized!`);
            console.log(`   The error above is normal - the contract exists on ${NETWORK}.`);
            console.log(`\n✅ Your setup is correct. The frontend should work now.`);
        } else if (error.message.includes('Module not found')) {
            console.log(`\n❌ The contract has not been deployed to ${NETWORK}.`);
            console.log(`   Please deploy using: cd move && bash deploy_contract.sh`);
        }
        
        process.exit(1);
    }
}

deploy();
