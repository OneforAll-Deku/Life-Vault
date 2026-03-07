import React, { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  AptosWalletAdapterProvider,
  useWallet as useAptosWallet,
  InputTransactionData,
  WalletReadyState
} from '@aptos-labs/wallet-adapter-react';
import { Network, Aptos, AptosConfig, Account, Ed25519PublicKey } from '@aptos-labs/ts-sdk';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface WalletAccount {
  address: string;
  publicKey: string;
}

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  wallet: any;
  wallets: readonly any[];
  account: WalletAccount | null;
  network: {
    name: string;
    chainId?: number;
    url?: string;
  } | null;
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<{
    signature: string;
    fullMessage: string;
    nonce: string;
    message: string;
  }>;
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<{ hash: string }>;
  authenticateWithWallet: () => Promise<{ success: boolean; token?: string; error?: string }>;
  linkWalletToAccount: () => Promise<{ success: boolean; error?: string }>;
  fundWallet: () => Promise<void>;
  balance: number | null;
  isPetraInstalled: boolean;
  isWalletReady: boolean;
  isBurner: boolean;
  createBurner: () => void;
  bitcoinAccount: { address: string; network: string } | null;
  aptosClient: Aptos;
  currentModuleAddress: string;
  selectedNetwork: string;
  switchNetwork: (targetNetwork: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const checkPetraInWindow = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window.aptos || window.petra || (window as any).aptosWallet);
};

const toHexString = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') return data.startsWith('0x') ? data : `0x${data}`;
  if (data instanceof Uint8Array) return '0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
  if (Array.isArray(data)) return '0x' + data.map(b => b.toString(16).padStart(2, '0')).join('');
  if (typeof data === 'object') {
    if (data.key) return toHexString(data.key);
    if (data.data) return toHexString(data.data);
    const keys = Object.keys(data);
    if (keys.every(k => !isNaN(Number(k)))) {
      const arr = keys.map(k => data[k]);
      return '0x' + arr.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }
  return String(data);
};

const WalletContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    connect: aptosConnect,
    disconnect: aptosDisconnect,
    account: aptosAccount,
    connected,
    isLoading,
    wallet,
    wallets,
    network,
    signMessage: aptosSignMessage,
    signAndSubmitTransaction: aptosSignAndSubmitTransaction,
    changeNetwork: aptosChangeNetwork,
  } = useAptosWallet() as any;

  const { toast } = useToast();
  const [petraChecked, setPetraChecked] = useState(false);
  const [petraInWindow, setPetraInWindow] = useState(false);
  const [burnerAccount, setBurnerAccount] = useState<Account | null>(null);
  const [bitcoinAccount, setBitcoinAccount] = useState<{ address: string; network: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>(import.meta.env.VITE_APTOS_NETWORK?.toLowerCase() || 'devnet');

  // Load burner from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('blockpix_burner');
    if (saved) {
      try {
        const decoded = Account.fromPrivateKey({
          privateKey: Uint8Array.from(JSON.parse(saved))
        } as any);
        setBurnerAccount(decoded);
      } catch (e) {
        console.error('Failed to load burner:', e);
      }
    }
  }, []);

  const createBurner = useCallback(() => {
    const newAccount = Account.generate();
    const privateKeyArray = Array.from(newAccount.privateKey.toUint8Array());
    localStorage.setItem('blockpix_burner', JSON.stringify(privateKeyArray));
    setBurnerAccount(newAccount);
    toast({
      title: "Guest Account Created",
      description: "You are now using a local secure account. No extension needed.",
      className: "bg-green-600 text-white"
    });
  }, [toast]);

  // Setup Aptos Client
  // Dynamically uses the network from the connected wallet or environment variables
  const aptosClient = useMemo(() => {
    // 1. Prioritize user-selected network from UI
    const activeNetworkString = selectedNetwork || network?.name?.toLowerCase() || import.meta.env.VITE_APTOS_NETWORK?.toLowerCase() || 'devnet';
    const chainId = network?.chainId;

    const isMainnet = selectedNetwork ? selectedNetwork === 'mainnet' : (activeNetworkString.includes('mainnet') || chainId === 1);
    const isTestnet = selectedNetwork ? selectedNetwork === 'testnet' : (activeNetworkString.includes('testnet') || chainId === 2);
    const isDevnet = selectedNetwork ? selectedNetwork === 'devnet' : (!isMainnet && !isTestnet);

    let aptosNetwork: Network;
    if (isMainnet) {
      aptosNetwork = Network.MAINNET;
    } else if (isTestnet) {
      aptosNetwork = Network.TESTNET;
    } else {
      aptosNetwork = Network.DEVNET;
    }

    const config = new AptosConfig({ network: aptosNetwork });
    console.log(`🌐 [WalletContext] Aptos Client Sync: Network=${aptosNetwork}, URL=${config.fullnode}, Source=${activeNetworkString}, ChainID=${chainId}`);
    return new Aptos(config);
  }, [network, network?.name, network?.chainId, selectedNetwork]);


  // Map of module addresses per network
  const currentModuleAddress = useMemo(() => {
    const activeNetworkString = selectedNetwork || network?.name?.toLowerCase() || import.meta.env.VITE_APTOS_NETWORK?.toLowerCase() || 'devnet';
    const chainId = network?.chainId;

    // Logic should match aptosNetwork selection
    const isMainnet = activeNetworkString.includes('mainnet') || (selectedNetwork === '' && chainId === 1);
    const isDevnet = activeNetworkString.includes('devnet') || (selectedNetwork === '' && !activeNetworkString.includes('testnet') && chainId !== 2);
    const isTestnet = activeNetworkString.includes('testnet') || (selectedNetwork === '' && chainId === 2 && !activeNetworkString.includes('devnet'));

    // Default address to use if specific is missing
    const defaultAddress = import.meta.env.VITE_APTOS_MODULE_ADDRESS || '0x547b91ee28212a3759017e89addbf0507d0e082264914855bcc2a602139b870a';

    if (isMainnet) {
      return import.meta.env.VITE_MAINNET_MODULE_ADDRESS || defaultAddress;
    } else if (isTestnet) {
      return import.meta.env.VITE_TESTNET_MODULE_ADDRESS || defaultAddress;
    } else if (isDevnet) {
      return import.meta.env.VITE_DEVNET_MODULE_ADDRESS || defaultAddress;
    }
    return defaultAddress;
  }, [network, selectedNetwork]);

  const switchNetwork = useCallback(async (targetNetwork: string) => {
    try {
      console.log(`🔄 Switching selected network to ${targetNetwork}...`);
      setSelectedNetwork(targetNetwork.toLowerCase());

      if (connected) {
        // Use the wallet adapter's changeNetwork feature if available
        if (typeof aptosChangeNetwork === 'function') {
          console.log(`🔄 Requesting wallet switch via adapter to ${targetNetwork}...`);
          try {
            await aptosChangeNetwork(targetNetwork as any);
          } catch (e: any) {
            console.warn("Wallet adapter changeNetwork failed:", e);
            // Non-blocking, continue with manual advice
          }
        }
        // Fallback for older Petra versions that don't support the adapter switch yet
        else if (typeof (window as any).aptos?.changeNetwork === 'function') {
          console.log(`🔄 Requesting wallet switch via window.aptos to ${targetNetwork}...`);
          try {
            await (window as any).aptos.changeNetwork(targetNetwork);
          } catch (e: any) {
            console.warn("window.aptos.changeNetwork failed:", e);
          }
        }
      }

      toast({
        title: "Network Switch Initiated",
        description: (
          <div className="space-y-1">
            <p>App is now targeting <b>{targetNetwork.toUpperCase()}</b>.</p>
            <p className="text-[10px] opacity-90">⚠️ Please check your <b>Petra Wallet extension</b> and ensure it is also set to <b>{targetNetwork.toUpperCase()}</b> in Settings.</p>
          </div>
        ),
        className: "bg-indigo-600 text-white"
      });
      return true;
    } catch (err: any) {
      console.error('Failed to switch network:', err);
      // Even if wallet switch fails, we keep the app-side network updated to allow 
      // the diagnostic probe to run against the new network
      toast({
        title: "Network Switch Information",
        description: "App network updated. If your wallet didn't switch, please change it manually in the extension.",
        variant: "default"
      });
      return true;
    }
  }, [connected, toast]);

  // Listen for network changes in the wallet extension
  useEffect(() => {
    if (connected && (window as any).aptos?.onNetworkChange) {
      console.log('📡 [WalletContext] Registering network change listener...');
      (window as any).aptos.onNetworkChange((newNetwork: any) => {
        console.log('🌐 [WalletContext] Wallet Network Changed Event:', newNetwork);
        if (newNetwork?.name) {
          const name = newNetwork.name.toLowerCase();
          if (name.includes('mainnet')) setSelectedNetwork('mainnet');
          else if (name.includes('testnet')) setSelectedNetwork('testnet');
          else if (name.includes('devnet')) setSelectedNetwork('devnet');
        }
      });
    }
  }, [connected]);

  const accountRef = useRef(aptosAccount);

  useEffect(() => {
    accountRef.current = aptosAccount;
  }, [aptosAccount]);

  const account = useMemo((): WalletAccount | null => {
    if (aptosAccount?.address) {
      return { address: aptosAccount.address.toString(), publicKey: toHexString(aptosAccount.publicKey) };
    }
    if (burnerAccount) {
      return {
        address: burnerAccount.accountAddress.toString(),
        publicKey: toHexString(burnerAccount.publicKey.toUint8Array())
      };
    }
    return null;
  }, [aptosAccount, burnerAccount]);

  // Fetch balance whenever account changes
  const fetchBalance = useCallback(async () => {
    if (!account?.address) {
      setBalance(null);
      return;
    }

    try {
      setFetchingBalance(true);
      // Get account info from resources
      console.log(`💰 [WalletContext] Fetching balance for ${account.address} on ${aptosClient.config.network}...`);

      const resources = await aptosClient.getAccountAPTAmount({
        accountAddress: account.address,
      });

      // Amount is in Octas (10^8)
      const aptAmount = Number(resources) / 100_000_000;
      console.log(`✅ [WalletContext] Balance detected: ${aptAmount} APT`);
      setBalance(aptAmount);
    } catch (error: any) {
      console.warn('⚠️ [WalletContext] Failed to fetch balance:', error.message || error);

      // If account doesn't exist on chain yet (404), it has 0 balance
      // The error status can be in error.status or error.response?.status
      const is404 = error.status === 404 ||
        error.response?.status === 404 ||
        (error.message && (error.message.includes('404') || error.message.includes('not found')));

      if (is404) {
        console.log('ℹ️ [WalletContext] Account not found on chain, setting balance to 0');
        setBalance(0);
      } else {
        // Don't clear balance on ephemeral errors to avoid UI flicker
        // but if it's the first fetch, set to 0
        if (balance === null) setBalance(0);
      }
    } finally {
      setFetchingBalance(false);
    }
  }, [account?.address, aptosClient, balance]);

  useEffect(() => {
    fetchBalance();

    // Periodically refresh balance
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  useEffect(() => {
    const checkPetra = () => {
      const hasPetra = checkPetraInWindow();
      setPetraInWindow(hasPetra);
      setPetraChecked(true);
    };
    checkPetra();
    const t = setTimeout(checkPetra, 500);
    return () => clearTimeout(t);
  }, []);

  const isPetraInstalled = useMemo(() => {
    if (petraInWindow) return true;
    return wallets ? wallets.some(w => w.name?.toLowerCase().includes('petra')) : false;
  }, [wallets, petraInWindow]);

  const isWalletReady = useMemo(() => {
    return petraChecked && (wallets.length > 0 || petraInWindow);
  }, [petraChecked, wallets.length, petraInWindow]);

  const findPetraWallet = useCallback(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets.find(w => w.name?.toLowerCase().includes('petra'));
  }, [wallets]);

  // Wait for account to be available (Important for race conditions)
  const waitForAccount = useCallback(async (maxWait = 5000): Promise<WalletAccount | null> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      if (accountRef.current?.address) {
        return {
          address: accountRef.current.address.toString(),
          publicKey: toHexString(accountRef.current.publicKey)
        };
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }, []);

  // NEW: Fund Wallet Function
  const fundWallet = useCallback(async () => {
    const currentAddr = account?.address;
    if (!currentAddr) {
      toast({ title: "Error", description: "Please connect wallet first", variant: "destructive" });
      return;
    }

    const envNetwork = import.meta.env.VITE_APTOS_NETWORK?.toLowerCase() || 'devnet';
    const networkName = envNetwork.charAt(0).toUpperCase() + envNetwork.slice(1);

    try {
      console.log(`💰 Funding wallet ${currentAddr} on ${networkName}...`);
      toast({
        title: "Requesting Funds",
        description: `Asking ${networkName} Faucet for 1 APT...`
      });

      // Fund with 1 APT (100,000,000 Octas)
      await aptosClient.fundAccount({
        accountAddress: currentAddr,
        amount: 100_000_000,
      });

      console.log("✅ Wallet funded successfully!");
      toast({
        title: "Success!",
        description: `Added 1 APT to your wallet on ${networkName}. You can now save your memory.`,
        className: "bg-green-600 text-white"
      });

      // Refresh balance immediately
      fetchBalance();
    } catch (error: any) {
      console.error("❌ Faucet error:", error);

      // Fallback message with link if faucet fails
      const faucetUrl = envNetwork === 'mainnet' ? '' : `https://aptoslabs.com/network/faucet?address=${currentAddr}`;

      toast({
        title: "Funding Failed",
        description: (
          <div>
            <p>Faucet might be busy. Please try manual faucet:</p>
            <a
              href={faucetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block px-3 py-1 bg-white text-black text-xs font-bold rounded hover:bg-black/10"
            >
              Go to Aptos Faucet
            </a>
          </div>
        ) as any,
        variant: "destructive"
      });
    }
  }, [account, aptosClient, toast, fetchBalance]);

  const connect = useCallback(async (walletName?: string) => {
    try {
      if (walletName === 'BitPay') {
        // BitPay Bitcoin Testnet4 Configuration
        const btcNetwork = import.meta.env.VITE_BITCOIN_NETWORK || 'testnet4';
        toast({
          title: "Connecting BitPay",
          description: `Configuring for Bitcoin ${btcNetwork}...`,
        });

        // Simulate connection for now as we'd need WalletConnect v2 for real BitPay mobile connection
        // This sets up the app to expect BTC addresses
        setTimeout(() => {
          setBitcoinAccount({
            address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", // Example Testnet4 address
            network: btcNetwork
          });
          toast({
            title: "BitPay Connected",
            description: `Connected to Bitcoin ${btcNetwork}`,
            className: "bg-blue-600 text-white"
          });
        }, 1500);
        return;
      }

      if (walletName) {
        await aptosConnect(walletName);
      } else {
        // Try to find Petra, otherwise default to first available or 'Petra' string
        const petra = findPetraWallet();
        if (petra) {
          await aptosConnect(petra.name);
        } else {
          // If wallets list is empty but we want to try connecting (e.g. extension just loaded)
          await aptosConnect('Petra');
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }, [aptosConnect, findPetraWallet]);

  const disconnect = useCallback(async () => {
    try {
      await aptosDisconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, [aptosDisconnect]);

  const signMessage = useCallback(async (message: string) => {
    // Bitcoin Logic
    if (bitcoinAccount) {
      console.log('🧡 Signing message with Bitcoin BitPay...');
      const nonce = Date.now().toString() + Math.random().toString(36).substring(2);
      // Simulate BitPay signature for Testnet4 validation
      return {
        signature: "H+dG+Xf7/K2+Y6K7M/3fJQ8xU=", // Mock signature
        fullMessage: message,
        nonce,
        message,
      };
    }

    const currentAccount = accountRef.current;
    if (!connected || !currentAccount) throw new Error('Wallet not connected');

    const nonce = Date.now().toString() + Math.random().toString(36).substring(2);
    const response = await aptosSignMessage({ message, nonce });

    let signature = '';
    if (response.signature) signature = toHexString(response.signature);
    else if ((response as any).signedMessage) signature = toHexString((response as any).signedMessage);

    return {
      signature: signature.startsWith('0x') ? signature.slice(2) : signature,
      fullMessage: response.fullMessage || message,
      nonce: response.nonce || nonce,
      message: message,
    };
  }, [connected, aptosSignMessage, bitcoinAccount]);

  const signAndSubmitTransaction = useCallback(async (transaction: InputTransactionData) => {
    if (connected) {
      const response = await aptosSignAndSubmitTransaction(transaction);
      return { hash: response.hash };
    }

    if (burnerAccount) {
      toast({ title: "Signing Transaction", description: "Using your guest account..." });

      // Map basic transaction data for SDK v2
      const tx = await aptosClient.transaction.build.simple({
        sender: burnerAccount.accountAddress,
        data: transaction.data as any,
      });

      const pendingTx = await aptosClient.signAndSubmitTransaction({
        signer: burnerAccount,
        transaction: tx,
      });

      await aptosClient.waitForTransaction({ transactionHash: pendingTx.hash });
      return { hash: pendingTx.hash };
    }

    throw new Error('Wallet not connected');
  }, [connected, aptosSignAndSubmitTransaction, burnerAccount, aptosClient, toast]);

  // RESTORED: Authentication Logic
  const authenticateWithWallet = useCallback(async () => {
    try {
      console.log('=== Starting Wallet Authentication ===');

      let address: string | undefined;
      let publicKey: string | undefined;

      if (bitcoinAccount) {
        address = bitcoinAccount.address;
        publicKey = 'bitcoin-bitpay';
      } else {
        if (!connected) await connect();
        const walletAccount = await waitForAccount();
        if (!walletAccount) return { success: false, error: 'Could not get wallet account' };
        address = walletAccount.address;
        publicKey = walletAccount.publicKey;
      }

      const timestamp = Date.now();
      const message = `Sign this message to authenticate with Block Pix.\n\nWallet: ${address}\nTimestamp: ${timestamp}\n\nThis signature will not trigger any blockchain transaction or cost any gas fees.`;

      const signResult = await signMessage(message);

      const requestData = {
        address,
        publicKey: publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey,
        signature: signResult.signature,
        message: signResult.message,
        fullMessage: signResult.fullMessage,
        nonce: signResult.nonce,
      };

      console.log('📡 Sending wallet auth request to:', `${api.defaults.baseURL || ''}/auth/wallet`);
      console.log('📦 Request data:', requestData);

      const response = await api.post('/auth/wallet', requestData);
      console.log('✅ Auth response:', response.data);

      const { token } = response.data.data;
      localStorage.setItem('token', token);

      return { success: true, token };
    } catch (error: any) {
      console.error('❌ Auth failed:', error);
      if (error.response) {
        console.error('Error Data:', error.response.data);
        return { success: false, error: error.response.data.message || 'Authentication failed' };
      }
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }, [connected, connect, waitForAccount, signMessage, bitcoinAccount]);

  // RESTORED: Linking Logic
  const linkWalletToAccount = useCallback(async () => {
    try {
      let address: string | undefined;
      let publicKey: string | undefined;

      if (bitcoinAccount) {
        address = bitcoinAccount.address;
        publicKey = 'bitcoin-bitpay';
      } else {
        if (!connected) await connect();
        const walletAccount = await waitForAccount();
        if (!walletAccount) return { success: false, error: 'Could not get wallet account' };
        address = walletAccount.address;
        publicKey = walletAccount.publicKey;
      }

      const message = `Link this wallet to your Block Pix account.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signResult = await signMessage(message);

      const requestData = {
        address,
        publicKey: publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey,
        signature: signResult.signature,
        message: signResult.message,
        fullMessage: signResult.fullMessage,
        nonce: signResult.nonce,
      };

      await api.post('/auth/link-wallet', requestData);
      return { success: true };
    } catch (error: any) {
      console.error('Link failed:', error);
      return { success: false, error: error.message || 'Failed to link wallet' };
    }
  }, [connected, connect, waitForAccount, signMessage, bitcoinAccount]);

  const value = {
    connected: connected || !!burnerAccount || !!bitcoinAccount,
    connecting: isLoading,
    disconnecting: false,
    wallet,
    wallets,
    account: bitcoinAccount
      ? { address: bitcoinAccount.address, publicKey: 'bitcoin-bitpay' }
      : burnerAccount
        ? { address: burnerAccount.accountAddress.toString(), publicKey: burnerAccount.publicKey.toString() }
        : aptosAccount && aptosAccount.address
          ? {
            address: typeof aptosAccount.address === 'string' ? aptosAccount.address : aptosAccount.address.toString(),
            publicKey: aptosAccount.publicKey
              ? (typeof aptosAccount.publicKey === 'string' ? aptosAccount.publicKey : toHexString(aptosAccount.publicKey))
              : 'unknown'
          }
          : null,
    network: bitcoinAccount
      ? { name: bitcoinAccount.network }
      : network ? { name: network.name, chainId: network.chainId, url: network.url } : null,
    connect,
    disconnect,
    signMessage,
    signAndSubmitTransaction,
    authenticateWithWallet,
    linkWalletToAccount,
    fundWallet,
    balance,
    isPetraInstalled,
    isWalletReady,
    isBurner: !!burnerAccount && !connected,
    createBurner,
    bitcoinAccount,
    aptosClient,
    currentModuleAddress,
    selectedNetwork,
    switchNetwork,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  // Determine network from env
  const network = useMemo(() => {
    const envNetwork = import.meta.env.VITE_APTOS_NETWORK?.toLowerCase();
    if (envNetwork === 'mainnet') return Network.MAINNET;
    if (envNetwork === 'testnet') return Network.TESTNET;
    return Network.DEVNET;
  }, []);

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network,
        aptosApiKeys: {
          testnet: import.meta.env.VITE_APTOS_API_KEY,
          devnet: import.meta.env.VITE_APTOS_API_KEY,
        },
        aptosConnect: {
          dappId: 'blockpix',
        },
      }}
      onError={(error) => {
        console.error('Wallet adapter error:', error);
        const msg = error?.message || String(error);

        // Handle specific Google/AptosConnect errors with better messaging
        if (msg.includes("Authorization page could not be loaded")) {
          toast({
            title: "Social Login Error",
            description: "Google sign-in failed. Please try using a browser extension like Petra Wallet instead.",
            variant: "destructive"
          });
          return;
        }

        // Suppress common "User rejected" messages to avoid spamming toast
        if (!msg.includes("User rejected")) {
          toast({ title: "Wallet Error", description: msg, variant: "destructive" });
        }
      }}
    >
      <WalletContextProvider>{children}</WalletContextProvider>
    </AptosWalletAdapterProvider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};