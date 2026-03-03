// services/petraWallet.ts
// Petra Wallet integration service

interface PetraWindow extends Window {
  aptos?: {
    connect: () => Promise<{ address: string; publicKey: string }>;
    account: () => Promise<{ address: string; publicKey: string }>;
    disconnect: () => Promise<void>;
    signAndSubmitTransaction: (transaction: any) => Promise<{ hash: string }>;
    signTransaction: (transaction: any) => Promise<Uint8Array>;
    network: () => Promise<{ name: string; chainId: string }>;
    isConnected: () => Promise<boolean>;
  };
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

class PetraWalletService {
  /**
   * Check if Petra wallet extension is installed
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.aptos !== 'undefined';
  }

  /**
   * Connect to Petra wallet
   */
  async connect(): Promise<WalletConnection> {
    if (!this.isInstalled()) {
      throw new Error(
        'Petra Wallet is not installed. Please install it from https://petra.app/'
      );
    }

    try {
      const response = await window.aptos!.connect();
      const network = await window.aptos!.network();

      return {
        address: response.address,
        publicKey: response.publicKey,
        network: network.name
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Disconnect from Petra wallet
   */
  async disconnect(): Promise<void> {
    if (!this.isInstalled()) {
      return;
    }

    try {
      await window.aptos!.disconnect();
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error);
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
      const isConnected = await window.aptos!.isConnected();
      if (!isConnected) {
        return null;
      }

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
      throw new Error('Petra Wallet is not installed');
    }

    try {
      const network = await window.aptos!.network();
      return network.name;
    } catch (error: any) {
      throw new Error(`Failed to get network: ${error.message}`);
    }
  }

  /**
   * Sign and submit a transaction to store memory on blockchain
   */
  async storeMemoryOnChain(
    moduleAddress: string,
    moduleName: string,
    ipfsHash: string
  ): Promise<TransactionResult> {
    if (!this.isInstalled()) {
      throw new Error('Petra Wallet is not installed');
    }

    const payload = {
      type: 'entry_function_payload',
      function: `${moduleAddress}::${moduleName}::store_memory`,
      type_arguments: [],
      arguments: [ipfsHash]
    };

    try {
      const response = await window.aptos!.signAndSubmitTransaction(payload);
      
      // Wait for transaction confirmation (optional but recommended)
      await this.waitForTransaction(response.hash);

      const network = await this.getNetwork();
      const explorerUrl = this.getExplorerUrl(response.hash, network);

      return {
        hash: response.hash,
        success: true,
        explorerUrl
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the transaction');
      }
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(txHash: string): Promise<void> {
    const maxAttempts = 20;
    const delay = 1000; // 1 second

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const network = await this.getNetwork();
        const nodeUrl = this.getNodeUrl(network);
        
        const response = await fetch(`${nodeUrl}/v1/transactions/by_hash/${txHash}`);
        
        if (response.ok) {
          const tx = await response.json();
          if (tx.success) {
            return;
          }
          if (tx.success === false) {
            throw new Error('Transaction failed on chain');
          }
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Get Aptos node URL based on network
   */
  private getNodeUrl(network: string): string {
    switch (network.toLowerCase()) {
      case 'mainnet':
        return 'https://fullnode.mainnet.aptoslabs.com';
      case 'testnet':
        return 'https://fullnode.testnet.aptoslabs.com';
      case 'devnet':
        return 'https://fullnode.devnet.aptoslabs.com';
      default:
        return 'https://fullnode.testnet.aptoslabs.com';
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
   * Check if wallet is connected
   */
  async isConnected(): Promise<boolean> {
    if (!this.isInstalled()) {
      return false;
    }

    try {
      return await window.aptos!.isConnected();
    } catch (error) {
      return false;
    }
  }
}

export const petraWallet = new PetraWalletService();