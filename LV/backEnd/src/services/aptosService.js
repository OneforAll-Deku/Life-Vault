import {
  Aptos,
  AptosConfig,
  Network,
  Ed25519Account,
  Ed25519PrivateKey,
  PrivateKey,
  Account,
  AccountAddress
} from "@aptos-labs/ts-sdk";
import nacl from 'tweetnacl'; // ← NEW IMPORT


// ← NEW HELPER FUNCTION
/**
 * Convert a hex string to Uint8Array
 * @param {string} hexString - Hex string, optionally prefixed with 0x
 * @returns {Uint8Array}
 */
function hexToUint8Array(hexString) {
  let clean = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}


class AptosService {
  constructor() {
    this.aptos = null;
    this.masterAccount = null;
    this.moduleAddress = null;
    this.moduleName = null;
    this.initialized = false;
  }

  /**
   * Initialize connection to Aptos network
   */
  async initialize() {
    try {
      // Determine network
      const networkName = process.env.APTOS_NETWORK || 'testnet';
      let network;
      switch (networkName) {
        case 'mainnet':
          network = Network.MAINNET;
          break;
        case 'devnet':
          network = Network.DEVNET;
          break;
        default:
          network = Network.TESTNET;
      }

      console.log(`🌐 Connecting to Aptos ${networkName}...`);

      // Create Aptos client
      const config = new AptosConfig({ network });
      this.aptos = new Aptos(config);

      // Load master wallet from private key
      if (process.env.APTOS_PRIVATE_KEY) {
        console.log('🔑 Loading master account from private key...');

        try {
          // Clean the private key
          let privateKeyStr = process.env.APTOS_PRIVATE_KEY.trim();

          // Method 1: Try using PrivateKey.formatPrivateKey
          try {
            const formattedKey = PrivateKey.formatPrivateKey(
              privateKeyStr,
              "ed25519"
            );
            const privateKey = new Ed25519PrivateKey(formattedKey);
            this.masterAccount = new Ed25519Account({ privateKey });
          } catch (formatError) {
            // Method 2: Direct approach
            console.log('Trying alternative key loading method...');

            // Remove 0x prefix if present
            if (privateKeyStr.startsWith('0x')) {
              privateKeyStr = privateKeyStr.slice(2);
            }

            const privateKey = new Ed25519PrivateKey(privateKeyStr);
            this.masterAccount = new Ed25519Account({ privateKey });
          }

          console.log(
            `✅ Aptos master wallet loaded: ${this.masterAccount.accountAddress.toString()}`
          );

        } catch (keyError) {
          console.error('❌ Failed to load private key:', keyError.message);
          console.log('ℹ️ Generating new test account instead...');

          // Fallback to generating a new account
          this.masterAccount = Account.generate();
          console.log(`✅ Generated test account: ${this.masterAccount.accountAddress.toString()}`);
        }
      } else {
        // If no private key provided, generate a test account
        console.log('⚠️ No APTOS_PRIVATE_KEY found in environment variables');
        this.masterAccount = Account.generate();
        console.log(`✅ Generated test account: ${this.masterAccount.accountAddress.toString()}`);
      }

      // Set module info
      this.moduleAddress = process.env.APTOS_MODULE_ADDRESS;
      this.moduleName = process.env.APTOS_MODULE_NAME || 'memory_vault';

      if (this.moduleAddress) {
        console.log(`📦 Aptos module: ${this.moduleAddress}::${this.moduleName}`);
      } else {
        console.log('⚠️ No module address configured (APTOS_MODULE_ADDRESS)');
      }

      // Test the connection
      try {
        const ledgerInfo = await this.aptos.getLedgerInfo();
        console.log(`📊 Chain ID: ${ledgerInfo.chain_id}`);
        console.log(`🕐 Ledger Version: ${ledgerInfo.ledger_version}`);
      } catch (error) {
        console.warn('⚠️ Could not fetch ledger info:', error.message);
      }

      this.initialized = true;
      console.log(`✅ Connected to Aptos ${networkName}`);
      return true;
    } catch (error) {
      console.error('❌ Aptos initialization failed:', error.message);
      console.error('Stack trace:', error.stack);

      // Create a minimal setup for development
      console.log('🛠️ Setting up minimal Aptos client for development...');

      const config = new AptosConfig({ network: Network.DEVNET });
      this.aptos = new Aptos(config);
      this.masterAccount = Account.generate();
      this.initialized = true;

      console.log(`✅ Using development account: ${this.masterAccount.accountAddress.toString()}`);
      return true;
    }
  }

  /**
   * Generate a new Aptos account for a user
   * @returns {Object} { address, privateKey }
   */
  generateAccount() {
    const account = Account.generate();

    return {
      address: account.accountAddress.toString(),
      privateKey: account.privateKey.toString(),
      publicKey: account.publicKey.toString()
    };
  }

  /**
   * Get account balance
   * @param {string} address - Aptos address
   */
  async getBalance(address) {
    try {
      const balance = await this.aptos.getAccountAPTAmount({
        accountAddress: address
      });

      return {
        success: true,
        address,
        balance: balance / 100_000_000,
        balanceOctas: balance,
        formattedBalance: `${(balance / 100_000_000).toFixed(4)} APT`
      };
    } catch (error) {
      console.error('Balance check error:', error);
      return {
        success: false,
        error: error.message,
        address
      };
    }
  }

  /**
   * Fund account from faucet (testnet/devnet only)
   * @param {string} address - Aptos address to fund
   */
  async fundAccount(address) {
    try {
      const networkName = process.env.APTOS_NETWORK || 'devnet';
      if (networkName === 'mainnet') {
        return {
          success: false,
          error: 'Cannot fund accounts on mainnet via faucet'
        };
      }

      console.log(`💸 Funding account: ${address}`);

      await this.aptos.fundAccount({
        accountAddress: address,
        amount: 100_000_000 // 1 APT
      });

      return {
        success: true,
        message: 'Account funded with 1 APT',
        amount: 1,
        address
      };
    } catch (error) {
      console.error('Funding error:', error);
      return {
        success: false,
        error: error.message,
        address
      };
    }
  }

  /**
   * Store memory hash on Aptos blockchain
   */
  async storeMemoryOnChain(ipfsHash, userAddress = null) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`📝 Preparing blockchain transaction for IPFS: ${ipfsHash}`);

      const functionPayload = `${this.moduleAddress}::${this.moduleName}::store_memory`;

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: functionPayload,
          functionArguments: [ipfsHash],
        },
      });

      console.log('🔑 Signing and submitting transaction...');

      const senderAuthenticator = this.aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      console.log(`📡 Transaction submitted. Hash: ${pendingTx.hash}`);

      const executedTx = await this.aptos.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      console.log(`✅ Blockchain confirmation received! Version: ${executedTx.version}`);

      return {
        success: true,
        txHash: pendingTx.hash,
        txVersion: executedTx.version,
        ipfsHash
      };
    } catch (error) {
      console.error('❌ Aptos Store Error Details:');
      if (error.data) console.error('Error Data:', error.data);
      console.error('Message:', error.message);

      throw new Error(`Aptos transaction failed: ${error.message}`);
    }
  }

  // =============================================
  // ← NEW METHOD: SPONSORED/RELAYED TRANSACTION
  // =============================================

  /**
   * Verify a user's Ed25519 signature over an IPFS hash, then submit
   * the on-chain transaction using the server's master account (gas sponsor).
   *
   * Flow:
   *   1. Verify: nacl.sign.detached.verify(ipfsHashBytes, signatureBytes, pubKeyBytes)
   *   2. Submit: build + sign + send tx from masterAccount
   *   3. Return tx receipt
   *
   * @param {string} ipfsHash      - The IPFS CID the user signed
   * @param {string} userPublicKey - User's Ed25519 public key (hex, with or without 0x)
   * @param {string} signature     - User's Ed25519 detached signature (hex, with or without 0x)
   * @returns {Object} { success, txHash, txVersion, ipfsHash }
   */
  async submitSponsoredMemory(ipfsHash, userPublicKey, signature) {
    // ── 0. Ensure the service is ready ──────────────────────────
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.moduleAddress) {
      throw new Error(
        'APTOS_MODULE_ADDRESS is not configured. Cannot submit on-chain transaction.'
      );
    }

    // ── 1. Verify the user's signature ──────────────────────────
    console.log('🔏 Verifying user signature for relay...');
    console.log(`   IPFS Hash : ${ipfsHash}`);
    console.log(`   Public Key: ${userPublicKey?.substring(0, 20)}...`);
    console.log(`   Signature : ${signature?.substring(0, 20)}...`);

    try {
      const messageBytes = new TextEncoder().encode(ipfsHash);
      const signatureBytes = hexToUint8Array(signature);
      const pubKeyBytes = hexToUint8Array(userPublicKey);

      // Ed25519 sanity checks
      if (signatureBytes.length !== 64) {
        throw new Error(
          `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`
        );
      }
      if (pubKeyBytes.length !== 32) {
        throw new Error(
          `Invalid public key length: expected 32 bytes, got ${pubKeyBytes.length}`
        );
      }

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        pubKeyBytes
      );

      if (!isValid) {
        throw new Error('Signature verification failed — the signature does not match the public key and IPFS hash');
      }

      console.log('✅ Signature verified successfully');
    } catch (verifyError) {
      console.error('❌ Signature verification failed:', verifyError.message);
      throw new Error(`Relay rejected: ${verifyError.message}`);
    }

    // ── 2. Build, sign & submit the transaction (master pays gas) ─
    try {
      console.log('⛓️  Building sponsored transaction...');

      const functionPayload = `${this.moduleAddress}::${this.moduleName}::store_memory`;

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: functionPayload,
          functionArguments: [ipfsHash],
        },
      });

      console.log('🔑 Signing with master account (gas sponsor)...');

      const senderAuthenticator = this.aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      console.log(`📡 Sponsored tx submitted. Hash: ${pendingTx.hash}`);

      // Wait for finality
      const executedTx = await this.aptos.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      console.log(`✅ Sponsored tx confirmed! Version: ${executedTx.version}`);

      return {
        success: true,
        txHash: pendingTx.hash,
        txVersion: executedTx.version,
        ipfsHash,
        sponsored: true
      };
    } catch (txError) {
      console.error('❌ Sponsored transaction failed:');
      if (txError.data) console.error('Error Data:', txError.data);
      console.error('Message:', txError.message);
      throw new Error(`Sponsored transaction failed: ${txError.message}`);
    }
  }

  /**
   * Create a time-locked capsule on Aptos blockchain
   */
  async createCapsuleOnChain(ipfsHash, beneficiary, releaseTimestamp) {
    try {
      if (!this.initialized) await this.initialize();

      console.log(`⏳ Creating capsule: IPFS=${ipfsHash}, Beneficiary=${beneficiary}, Unlock=${new Date(releaseTimestamp * 1000).toLocaleString()}`);

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: `${this.moduleAddress}::${this.moduleName}::create_capsule`,
          functionArguments: [ipfsHash, beneficiary, releaseTimestamp],
        },
      });

      const senderAuthenticator = this.aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      const executedTx = await this.aptos.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      return {
        success: true,
        txHash: pendingTx.hash,
        txVersion: executedTx.version
      };
    } catch (error) {
      console.error('❌ Create Capsule Error:', error.message);
      throw error;
    }
  }

  /**
   * Claim a capsule (beneficiary must sign this, so we provide the payload for frontend to sign)
   * or we can do it via a sponsored transaction if the beneficiary has a signature.
   */
  async claimCapsuleOnChain(capsuleId) {
    // This typically requires the beneficiary to sign. 
    // For simplicity in this demo, we'll assume the master account can claim it if we wanted, 
    // but the contract enforces beneficiary == signer.
    // So we just return the payload for the frontend.
    return {
      function: `${this.moduleAddress}::${this.moduleName}::claim_capsule`,
      type_arguments: [],
      arguments: [capsuleId.toString()]
    };
  }

  // =============================================
  // ← END NEW METHOD
  // =============================================

  /**
   * Get transaction details from Aptos
   * @param {string} txHash - Transaction hash
   */
  async getTransaction(txHash) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const transaction = await this.aptos.getTransactionByHash({
        transactionHash: txHash,
      });

      return {
        success: true,
        transaction
      };
    } catch (error) {
      console.error('Get transaction error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getMasterAddress() {
    return this.masterAccount ? this.masterAccount.accountAddress.toString() : null;
  }

  isInitialized() {
    return this.initialized && this.aptos !== null;
  }
}

export default new AptosService();