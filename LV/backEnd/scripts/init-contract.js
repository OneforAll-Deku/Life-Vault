import { Aptos, AptosConfig, Network, Ed25519Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function init() {
    const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
    const moduleAddress = process.env.APTOS_MODULE_ADDRESS;

    if (!privateKeyStr || !moduleAddress) {
        console.error("❌ Missing APTOS_PRIVATE_KEY or APTOS_MODULE_ADDRESS in .env");
        return;
    }

    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    const privateKey = new Ed25519PrivateKey(privateKeyStr.startsWith('0x') ? privateKeyStr : `0x${privateKeyStr}`);
    const account = new Ed25519Account({ privateKey });

    console.log(`🚀 Initializing contract at ${moduleAddress}...`);
    console.log(`👤 Using account: ${account.accountAddress.toString()}`);

    try {
        const transaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${moduleAddress}::memory_vault::initialize`,
                functionArguments: [],
            },
        });

        const senderAuthenticator = aptos.transaction.sign({
            signer: account,
            transaction,
        });

        const pendingTx = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator,
        });

        console.log(`📡 Transaction submitted: ${pendingTx.hash}`);
        await aptos.waitForTransaction({ transactionHash: pendingTx.hash });
        console.log("✅ Contract initialized successfully!");
    } catch (error) {
        if (error.message.includes("ALREADY_INITIALIZED") || error.message.includes("4")) {
            console.log("ℹ️ Contract is already initialized.");
        } else {
            console.error("❌ Failed to initialize:", error.message);
        }
    }
}

init();
