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
    this.clients = {}; // Map of network name to Aptos client
    this.masterAccount = null;
    this.initialized = false;
    this.moduleAddresses = {
      mainnet: process.env.MAINNET_MODULE_ADDRESS,
      testnet: process.env.TESTNET_MODULE_ADDRESS,
      devnet: process.env.APTOS_MODULE_ADDRESS
    };
    this.moduleName = process.env.APTOS_MODULE_NAME || 'memory_vault';
  }

  /**
   * Get or create Aptos client for a specific network
   */
  getAptos(networkName = 'devnet') {
    const name = networkName.toLowerCase();
    if (this.clients[name]) return this.clients[name];

    let network;
    switch (name) {
      case 'mainnet': network = Network.MAINNET; break;
      case 'testnet': network = Network.TESTNET; break;
      default: network = Network.DEVNET;
    }

    const config = new AptosConfig({ network });
    this.clients[name] = new Aptos(config);
    return this.clients[name];
  }

  /**
   * Get module address for a specific network
   */
  getModuleAddress(networkName = 'devnet') {
    const name = networkName.toLowerCase();
    return this.moduleAddresses[name] || this.moduleAddresses.devnet;
  }

  /**
   * Initialize connection to Aptos network
   */
  async initialize() {
    try {
      // Determine network
      const networkName = process.env.APTOS_NETWORK || 'devnet';
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

      // Create default Aptos client
      this.getAptos(networkName);

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
        const aptos = this.getAptos(networkName);
        const ledgerInfo = await aptos.getLedgerInfo();
        console.log(`📊 Chain ID: ${ledgerInfo.chain_id}`);
        console.log(`🕐 Ledger Version: ${ledgerInfo.ledger_version}`);
      } catch (error) {
        console.warn('⚠️ Could not fetch ledger info:', error.message);
      }

      // Warm up devnet client by default
      this.getAptos('devnet');

      this.initialized = true;
      console.log(`✅ Aptos service initialized`);
      return true;
    } catch (error) {
      console.error('❌ Aptos initialization failed:', error.message);
      this.initialized = true; // Still mark as initialized to allow client generation
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
  async getBalance(address, networkName = 'devnet') {
    try {
      const aptos = this.getAptos(networkName);
      const balance = await aptos.getAccountAPTAmount({
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
  async fundAccount(address, networkName = 'devnet') {
    try {
      if (networkName === 'mainnet') {
        return {
          success: false,
          error: 'Cannot fund accounts on mainnet via faucet'
        };
      }

      console.log(`💸 Funding account: ${address} on ${networkName}`);

      const aptos = this.getAptos(networkName);
      await aptos.fundAccount({
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
  async storeMemoryOnChain(ipfsHash, networkName = 'devnet') {
    try {
      if (!this.initialized) await this.initialize();

      const aptos = this.getAptos(networkName);
      const moduleAddress = this.getModuleAddress(networkName);

      if (!moduleAddress) {
        throw new Error(`Module address not configured for ${networkName}`);
      }

      console.log(`📝 Preparing blockchain transaction for IPFS: ${ipfsHash} on ${networkName}`);

      const functionPayload = `${moduleAddress}::${this.moduleName}::store_memory`;

      const transaction = await aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: functionPayload,
          functionArguments: [ipfsHash],
        },
      });

      console.log('🔑 Signing and submitting transaction...');

      const senderAuthenticator = aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      console.log(`📡 Transaction submitted. Hash: ${pendingTx.hash}`);

      const executedTx = await aptos.waitForTransaction({
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
   * @param {string} signature     - User's Ed25519 detached signature (hex, with or without 0x)
   * @param {string} networkName   - The target network
   * @returns {Object} { success, txHash, txVersion, ipfsHash }
   */
  async submitSponsoredMemory(ipfsHash, userPublicKey, signature, networkName = 'devnet') {
    // ── 0. Ensure the service is ready ──────────────────────────
    if (!this.initialized) await this.initialize();

    const aptos = this.getAptos(networkName);
    const moduleAddress = this.getModuleAddress(networkName);

    if (!moduleAddress) {
      throw new Error(
        `Module address not configured for ${networkName}. Cannot submit on-chain transaction.`
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

      const functionPayload = `${moduleAddress}::${this.moduleName}::store_memory`;

      const transaction = await aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: functionPayload,
          functionArguments: [ipfsHash],
        },
      });

      console.log('🔑 Signing with master account (gas sponsor)...');

      const senderAuthenticator = aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      console.log(`📡 Sponsored tx submitted. Hash: ${pendingTx.hash}`);

      // Wait for finality
      const executedTx = await aptos.waitForTransaction({
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
  async createCapsuleOnChain(ipfsHash, beneficiary, releaseTimestamp, networkName = 'devnet') {
    try {
      if (!this.initialized) await this.initialize();

      const aptos = this.getAptos(networkName);
      const moduleAddress = this.getModuleAddress(networkName);

      if (!moduleAddress) {
        throw new Error(`Module address not configured for ${networkName}`);
      }

      console.log(`⏳ Creating capsule: IPFS=${ipfsHash}, Beneficiary=${beneficiary}, Unlock=${new Date(releaseTimestamp * 1000).toLocaleString()} on ${networkName}`);

      const transaction = await aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: `${moduleAddress}::${this.moduleName}::create_capsule`,
          functionArguments: [ipfsHash, beneficiary, releaseTimestamp],
        },
      });

      const senderAuthenticator = aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      const executedTx = await aptos.waitForTransaction({
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
   * Mint a Block Pix NFT for a user on Aptos
   */
  async mintNFT(userAddress, name, description, imageUrl, attributes = [], networkName = 'devnet') {
    try {
      if (!this.initialized) await this.initialize();

      const aptos = this.getAptos(networkName);
      const moduleAddress = this.getModuleAddress(networkName);

      if (!moduleAddress) {
        throw new Error(`Module address not configured for ${networkName}`);
      }

      console.log(`🎨 Minting NFT: ${name} for ${userAddress} on ${networkName}`);

      // This assumes the move module has a mint_vault_nft function
      const transaction = await aptos.transaction.build.simple({
        sender: this.masterAccount.accountAddress,
        data: {
          function: `${moduleAddress}::${this.moduleName}::mint_vault_nft`,
          functionArguments: [
            userAddress,
            name,
            description,
            imageUrl,
            JSON.stringify(attributes)
          ],
        },
      });

      const senderAuthenticator = aptos.transaction.sign({
        signer: this.masterAccount,
        transaction,
      });

      const pendingTx = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      const executedTx = await aptos.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      console.log(`✅ NFT Minted! Hash: ${pendingTx.hash}`);

      return {
        success: true,
        txHash: pendingTx.hash,
        txVersion: executedTx.version,
        nftName: name
      };
    } catch (error) {
      console.error('❌ NFT Mint Error:', error.message);
      // Fallback for demo purposes if module is not fully deployed
      if (process.env.NODE_ENV === 'development' || !process.env.APTOS_MODULE_ADDRESS) {
        return {
          success: true,
          mock: true,
          txHash: `mock_nft_tx_${Date.now()}`,
          nftName: name
        };
      }
      throw error;
    }
  }

  /**
   * Claim a capsule (beneficiary must sign this, so we provide the payload for frontend to sign)
   */
  async claimCapsuleOnChain(capsuleId, networkName = 'devnet') {
    const moduleAddress = this.getModuleAddress(networkName);
    return {
      function: `${moduleAddress}::${this.moduleName}::claim_capsule`,
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
  async getTransaction(txHash, networkName = 'devnet') {
    try {
      if (!this.initialized) await this.initialize();
      const aptos = this.getAptos(networkName);

      const transaction = await aptos.getTransactionByHash({
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
    return this.initialized;
  }
}

export default new AptosService();