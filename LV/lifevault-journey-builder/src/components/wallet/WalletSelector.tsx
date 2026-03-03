import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Wallet, Loader2, ExternalLink, Check } from 'lucide-react';

interface WalletSelectorProps {
  onConnect?: () => void;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ onConnect }) => {
  const { wallets, connecting, connect, createBurner, isBurner } = useWallet();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const handleConnect = async (walletName: string) => {
    setSelectedWallet(walletName);
    try {
      await connect(walletName as any);
      onConnect?.();
    } catch (error) {
      console.error('Connection failed:', error);
    }
    setSelectedWallet(null);
  };

  const handleCreateGuest = () => {
    createBurner();
    onConnect?.();
  };

  // Filter out Aptos Connect because it requires external DApp registration 
  // and often fails on localhost with "Authorization page could not be loaded"
  const filteredWallets = wallets.filter(w => w.name !== 'Aptos Connect');

  const availableWallets = filteredWallets.filter(w => w.readyState === 'Installed' || w.readyState === 'Loadable');
  const notInstalledWallets = filteredWallets.filter(w => w.readyState === 'NotDetected');

  return (
    <div className="space-y-4">
      {/* Recommended/Easy Option */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-sm font-medium text-black/70 mb-2">Social / Guest</p>
          <button
            onClick={handleCreateGuest}
            className="w-full h-[76px] flex items-center gap-3 p-4 border-2 border-green-500/30 bg-green-500/5 rounded-xl hover:bg-green-500/10 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <span className="block font-bold">Guest Account</span>
              <span className="text-xs text-black/50">Instant setup</span>
            </div>
            {isBurner && <span className="text-xs font-bold text-green-600">ACTIVE</span>}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-black/70 mb-2">Bitcoin (Testnet4)</p>
          <button
            onClick={() => handleConnect('BitPay')}
            className="w-full h-[76px] flex items-center gap-3 p-4 border-2 border-blue-500/30 bg-blue-500/5 rounded-xl hover:bg-blue-500/10 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white overflow-hidden">
              <img src="https://bitpay.com/favicon.ico" alt="BitPay" className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <span className="block font-bold">BitPay Wallet</span>
              <span className="text-xs text-black/50">Testnet4 BTC</span>
            </div>
          </button>
        </div>
      </div>


      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-black/5"></span></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-black/30">Or use a wallet</span></div>
      </div>
      {/* Available Wallets */}
      {availableWallets.length > 0 && (
        <div>
          <p className="text-sm font-medium text-black/70 mb-2">Available Wallets</p>
          <div className="space-y-2">
            {availableWallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                disabled={connecting}
                className="w-full flex items-center gap-3 p-4 border border-black/10 rounded-xl hover:border-black/30 hover:bg-black/5 transition-all disabled:opacity-50"
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-8 h-8 rounded-lg"
                />
                <span className="flex-1 text-left font-medium">{wallet.name}</span>
                {connecting && selectedWallet === wallet.name ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black/50" />
                ) : (
                  <Check className="w-5 h-5 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Not Installed */}
      {notInstalledWallets.length > 0 && (
        <div>
          <p className="text-sm font-medium text-black/50 mb-2">Not Installed</p>
          <div className="space-y-2">
            {notInstalledWallets.map((wallet) => (
              <a
                key={wallet.name}
                href={wallet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-4 border border-black/5 rounded-xl bg-black/5 opacity-60 hover:opacity-80 transition-opacity"
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-8 h-8 rounded-lg grayscale"
                />
                <span className="flex-1 text-left font-medium">{wallet.name}</span>
                <ExternalLink className="w-4 h-4 text-black/30" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No wallets available */}
      {wallets.length === 0 && (
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-black/20 mx-auto mb-4" />
          <p className="text-black/50">No Aptos wallets detected</p>
          <a
            href="https://petra.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:underline"
          >
            Install Petra Wallet
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
};