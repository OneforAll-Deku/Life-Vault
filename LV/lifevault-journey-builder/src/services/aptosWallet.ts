// services/aptosWallet.ts
// Modern Aptos Wallet Adapter integration (replaces deprecated window.petra)

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Define the Aptos Wallet Standard interface
interface AptosWallet {
  connect: () => Promise<{ address: string; publicKey: string }>;
  account: () => Promise<{ address: string; publicKey: string }>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: any) => Promise<{ hash: string }>;
  network: () => Promise<{ name: string; chainId: string }>;
  onAccountChange?: (callback: (account: any) => void) => void;
  onNetworkChange?: (callback: (network: any) => void) => void;
}

interface PetraWindow extends Window {
  aptos?: AptosWallet;
  petra?: any; // Deprecated
}

declare const window: PetraWindow;

export interface WalletConnection {
  address: string;
  publicKey: string;
  network: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  explorerUrl: string;
}

class AptosWalletService {
  private aptos: Aptos;

  constructor() {
    // Initialize Aptos client for transaction verification
    const network = import.meta.env.VITE_APTOS_NETWORK || 'devnet';
    const aptosNetwork = network === 'mainnet' ? Network.MAINNET : 
                        network === 'testnet' ? Network.TESTNET : Network.DEVNET;
    
    const config = new AptosConfig({ network: aptosNetwork });
    this.aptos = new Aptos(config);
  }

  /**
   * Check if Aptos wallet (Petra) is installed
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.aptos !== 'undefined';
  }

  /**
   * Connect to Aptos wallet using Wallet Adapter standard
   */
  async connect(): Promise<WalletConnection> {
    if (!this.isInstalled()) {
      throw new Error(
        'Petra Wallet is not installed. Please install it from https://petra.app/'
      );
    }

    try {
      console.log('🔌 Connecting to Aptos wallet...');
      
      const response = await window.aptos!.connect();
      const network = await window.aptos!.network();

      console.log('✅ Wallet connected:', response.address);

      return {
        address: response.address,
        publicKey: response.publicKey,
        network: network.name
      };
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    if (!this.isInstalled()) {
      return;
    }

    try {
      await window.aptos!.disconnect();
      console.log('🔌 Wallet disconnected');
    } catch (error: any) {
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Get current connected account
   */
  async getAccount(): Promise<{ address: string; publicKey: string } | null> {
    if (!this.isInstalled()) {
      return null;
    }

    try {
      return await window.aptos!.account();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current network
   */
  async getNetwork(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('Aptos wallet is not installed');
    }

    try {
      const network = await window.aptos!.network();
      return network.name.toLowerCase();
    } catch (error: any) {
      throw new Error(`Failed to get network: ${error.message}`);
    }
  }

  /**
   * Sign and submit a transaction to store memory on blockchain
   * Uses the modern Wallet Adapter approach
   */
  async storeMemoryOnChain(
    moduleAddress: string,
    moduleName: string,
    ipfsHash: string
  ): Promise<TransactionResult> {
    if (!this.isInstalled()) {
      throw new Error('Aptos wallet is not installed');
    }

    console.log('\n🔐 Preparing blockchain transaction...');
    console.log('Module:', `${moduleAddress}::${moduleName}`);
    console.log('IPFS Hash:', ipfsHash);

    // Build the transaction payload using entry function format
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::${moduleName}::store_memory`,
      type_arguments: [],
      arguments: [ipfsHash]
    };

    try {
      console.log('📝 Requesting wallet signature...');
      
      // Sign and submit through wallet
      const response = await window.aptos!.signAndSubmitTransaction(payload);
      
      console.log('✅ Transaction submitted:', response.hash);

      // Wait for transaction confirmation
      console.log('⏳ Waiting for confirmation...');
      await this.waitForTransaction(response.hash);
      
      console.log('🎉 Transaction confirmed!');

      const network = await this.getNetwork();
      const explorerUrl = this.getExplorerUrl(response.hash, network);

      return {
        hash: response.hash,
        success: true,
        explorerUrl
      };
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      
      if (error.code === 4001) {
        throw new Error('User rejected the transaction');
      }
      
      // Provide more detailed error
      if (error.message?.includes('INSUFFICIENT_BALANCE')) {
        throw new Error('Insufficient APT balance. Please fund your wallet from the faucet.');
      }
      
      if (error.message?.includes('MODULE_NOT_FOUND')) {
        throw new Error('Smart contract not deployed. Please contact support.');
      }
      
      throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Wait for transaction confirmation using Aptos SDK
   */
  private async waitForTransaction(txHash: string): Promise<void> {
    try {
      const response = await this.aptos.waitForTransaction({
        transactionHash: txHash,
        options: {
          timeoutSecs: 30,
          checkSuccess: true
        }
      });

      if (!response.success) {
        throw new Error('Transaction failed on chain');
      }
    } catch (error: any) {
      console.error('Transaction wait error:', error);
      throw new Error(`Transaction confirmation failed: ${error.message}`);
    }
  }

  /**
   * Get explorer URL for a transaction
   */
  getExplorerUrl(txHash: string, network: string): string {
    const networkParam = network.toLowerCase();
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${networkParam}`;
  }

  /**
   * Verify a transaction on the blockchain
   */
  async verifyTransaction(txHash: string): Promise<{
    success: boolean;
    verified: boolean;
    timestamp?: string;
    version?: number;
  }> {
    try {
      const tx = await this.aptos.getTransactionByHash({
        transactionHash: txHash
      });

      return {
        success: true,
        verified: tx.success,
        timestamp: (tx as any).timestamp,
        version: (tx as any).version
      };
    } catch (error: any) {
      return {
        success: false,
        verified: false
      };
    }
  }

  /**
   * Check if wallet is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const account = await this.getAccount();
      return account !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (account: { address: string } | null) => void): void {
    if (this.isInstalled() && window.aptos!.onAccountChange) {
      window.aptos!.onAccountChange(callback);
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChange(callback: (network: { name: string } | null) => void): void {
    if (this.isInstalled() && window.aptos!.onNetworkChange) {
      window.aptos!.onNetworkChange(callback);
    }
  }
}

export const aptosWallet = new AptosWalletService();