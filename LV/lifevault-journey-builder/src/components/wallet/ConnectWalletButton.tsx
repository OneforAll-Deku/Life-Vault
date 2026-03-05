import React, { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import {
  Wallet,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface ConnectWalletButtonProps {
  onAuthSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showAddress?: boolean;
  className?: string;
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  onAuthSuccess,
  variant = 'default',
  size = 'md',
  showAddress = true,
  className = '',
}) => {
  const {
    connected,
    connecting,
    account,
    network,
    isPetraInstalled,
    isWalletReady,
    connect,
    disconnect,
    balance,
    fundWallet,
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);

  // Wait for wallet detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckingWallet(false);
    }, 1500); // Give enough time for wallet detection

    return () => clearTimeout(timer);
  }, []);

  // Update checking state when wallet is ready
  useEffect(() => {
    if (isWalletReady) {
      setCheckingWallet(false);
    }
  }, [isWalletReady]);

  const truncateAddress = (addr: any) => {
    if (!addr) return '';
    const addressStr = typeof addr === 'string' ? addr : addr.toString();
    if (addressStr.length <= 10) return addressStr;
    return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
  };

  const handleConnect = async () => {
    try {
      setError(null);
      await connect();
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Connection failed');
    }
  };

  const handleCopyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDropdown(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    default: 'bg-black text-white hover:bg-black/80',
    outline: 'border-2 border-black text-black hover:bg-black hover:text-white',
    ghost: 'text-black hover:bg-black/5',
  };

  // Still checking for wallet
  if (checkingWallet && !isPetraInstalled && !connected) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors ${sizeClasses[size]} bg-gray-100 text-gray-400 ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Detecting wallet...
      </button>
    );
  }

  // Wallet not installed - only show if not connected via other means
  if (!isPetraInstalled && !checkingWallet && !connected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleConnect}
          className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
        <a
          href="https://petra.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-black/40 hover:text-black transition-colors"
        >
          Want Petra Wallet?
        </a>
      </div>
    );
  }

  // Connected state
  if (connected && account) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors ${sizeClasses[size]} ${account.publicKey === 'bitcoin-bitpay'
            ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
            : 'bg-green-500/10 text-green-700 border-green-500/20'
            } border ${className}`}
        >
          {account.publicKey === 'bitcoin-bitpay' ? (
            <img src="https://bitpay.com/favicon.ico" className="w-4 h-4" alt="B" />
          ) : (
            <div className={`w-2 h-2 rounded-full ${account.publicKey === 'bitcoin-bitpay' ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`} />
          )}
          {showAddress ? truncateAddress(account.address) : 'Connected'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-black/10 z-50 overflow-hidden">
              {/* Balance */}
              <div className="px-4 py-4 border-b border-black/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-black/40 uppercase tracking-wider font-bold">Balance</p>
                  <p className="text-xl font-extrabold text-black">
                    {balance !== null ? balance.toFixed(4) : '---'} <span className="text-sm font-medium text-black/40">APT</span>
                  </p>
                </div>
                {network?.name?.toLowerCase() !== 'mainnet' && (
                  <button
                    onClick={() => {
                      fundWallet();
                      setShowDropdown(false);
                    }}
                    className="p-2.5 bg-green-500/10 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all group"
                    title="Fund from Faucet"
                  >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                )}
              </div>

              {/* Address */}
              <div className="p-4 border-b border-black/5">
                <p className="text-xs text-black/50 mb-1">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono flex-1 truncate">{account.address}</code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-black/50" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <a
                  href={`https://explorer.aptoslabs.com/account/${account.address}?network=${network?.name?.toLowerCase() || 'devnet'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-black/70 hover:bg-black/5 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Explorer
                </a>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Wallet
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Not connected - show connect button
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
};