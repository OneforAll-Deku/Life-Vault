import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { fileToBase64 } from '@/services/api';
import api from '@/services/api';
import type { CreateMemoryData } from '@/types';
import { toLocalISOString } from '@/lib/utils';
import {
  X, Upload, Image, FileText, Film, Music, File,
  Loader2, ExternalLink, Shield, Check, AlertCircle, Coins, Clock, ImagePlus, Plus, Sparkles, RefreshCw
} from 'lucide-react';
import { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { ConfettiButton, fireConfetti } from '@/components/ui/ConfettiButton/ConfettiButton';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useToast } from '@/hooks/use-toast';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMemoryData) => Promise<{
    success: boolean;
    message?: string;
    data?: any
  }>;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'photo', label: 'Photo', icon: Image },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'video', label: 'Video', icon: Film },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'other', label: 'Other', icon: File },
];

type BlockchainStep =
  | 'idle'
  | 'uploading-ipfs'
  | 'connecting-wallet'
  | 'funding-wallet'
  | 'simulating'
  | 'signing-tx'
  | 'confirming'
  | 'complete'
  | 'error';

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSuccess
}) => {
  const {
    signAndSubmitTransaction,
    account,
    connected,
    connect,
    fundWallet,
    balance,
    isPetraInstalled,
    aptosClient,
    currentModuleAddress,
    network,
    switchNetwork,
    selectedNetwork
  } = useWallet();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('photo');
  const [storeOnChain, setStoreOnChain] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Legacy Capsule states
  const [isCapsule, setIsCapsule] = useState(false);
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [releaseDate, setReleaseDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | string>('');
  const [showFundButton, setShowFundButton] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [blockchainStep, setBlockchainStep] = useState<BlockchainStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const MODULE_ADDRESS = currentModuleAddress;
  const MODULE_NAME = 'memory_vault';
  const NETWORK = selectedNetwork || network?.name?.toLowerCase() || import.meta.env.VITE_APTOS_NETWORK?.toLowerCase() || 'devnet';

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setCategory('photo');
    } else if (selectedFile.type.startsWith('video/')) {
      setPreview(null);
      setCategory('video');
    } else if (selectedFile.type.startsWith('audio/')) {
      setPreview(null);
      setCategory('audio');
    } else if (selectedFile.type.includes('pdf') || selectedFile.type.includes('document')) {
      setPreview(null);
      setCategory('document');
    } else {
      setPreview(null);
      setCategory('other');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleFundWallet = async () => {
    setBlockchainStep('funding-wallet');
    setShowFundButton(false);
    setError('');

    try {
      await fundWallet();
      setBlockchainStep('idle');
    } catch (err: any) {
      setError("Failed to fund wallet: " + err.message);
      setBlockchainStep('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('photo');
    setStoreOnChain(false);
    setFile(null);
    setPreview(null);
    setError('');
    setBlockchainStep('idle');
    setTxHash(null);
    setExplorerUrl(null);
    setIpfsHash(null);
    setShowFundButton(false);
    setIsCapsule(false);
    setBeneficiaryAddress('');
    setReleaseDate('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (!file) { setError('Please select a file'); return; }

    setLoading(true);
    setError('');
    setShowFundButton(false);

    try {
      // 1. Upload to IPFS (only if not already done)
      let currentIpfsHash = ipfsHash;
      let finalResult: any = null;

      if (!currentIpfsHash) {
        setBlockchainStep('uploading-ipfs');
        console.log('📤 Uploading to IPFS...');

        const base64 = await fileToBase64(file);

        finalResult = await onSubmit({
          title: title.trim(),
          description: description.trim(),
          category,
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
          storeOnChain: storeOnChain,
          network: NETWORK,
          isCapsule,
          beneficiaryAddress,
          releaseTimestamp: releaseDate ? Math.floor(new Date(releaseDate).getTime() / 1000) : undefined
        });

        if (!finalResult.success) {
          throw new Error(finalResult.message || 'Failed to create memory');
        }

        currentIpfsHash = finalResult.data?.ipfs?.hash;
        console.log('✅ IPFS upload complete:', currentIpfsHash);
        setIpfsHash(currentIpfsHash);
      }

      // 2. Blockchain Storage
      if (storeOnChain && currentIpfsHash) {
        try {
          console.log('\n🔗 ===== BLOCKCHAIN TRANSACTION START =====');

          if (!isPetraInstalled) throw new Error('Petra Wallet not installed');

          // Ensure wallet is connected
          if (!connected) {
            setBlockchainStep('connecting-wallet');
            await connect();
            // Wait a moment for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          if (!account) {
            throw new Error('Wallet connected but account not found. Please try again.');
          }

          // 🔍 Pre-check: Does the module exist on this network?
          setBlockchainStep('simulating');
          try {
            await aptosClient.getAccountModule({
              accountAddress: MODULE_ADDRESS,
              moduleName: MODULE_NAME,
            });
            console.log('✅ Module verified on-chain');
          } catch (moduleErr: any) {
            console.error('🔍 Module Check Failed on Network:', NETWORK, moduleErr);
            const errorDetails = moduleErr.message || JSON.stringify(moduleErr);
            const error = new Error(`Module '${MODULE_NAME}' not found at ${MODULE_ADDRESS.substring(0, 10)}... on ${NETWORK.toUpperCase()}`);
            (error as any).isModuleNotFound = true;
            (error as any).currentNetwork = NETWORK;
            (error as any).moduleAddress = MODULE_ADDRESS;
            (error as any).rawError = errorDetails;
            throw error;
          }

          setBlockchainStep('simulating');

          const payload: InputTransactionData = {
            data: {
              function: `${MODULE_ADDRESS}::${MODULE_NAME}::store_memory`,
              functionArguments: [currentIpfsHash],
              typeArguments: []
            }
          };

          toast({
            title: "Wallet Signature Required",
            description: "Please check your Petra wallet popup to approve the transaction.",
            duration: 5000,
          });

          setBlockchainStep('signing-tx');
          const txResult = await signAndSubmitTransaction(payload);

          if (!txResult || !txResult.hash) {
            throw new Error('Transaction submitted but no hash returned');
          }

          const transactionHash = txResult.hash;
          setTxHash(transactionHash);
          setExplorerUrl(`https://explorer.aptoslabs.com/txn/${transactionHash}?network=${NETWORK.includes('mainnet') ? 'mainnet' : NETWORK.includes('testnet') ? 'testnet' : 'devnet'}`);

          setBlockchainStep('confirming');

          // Background update to DB — use the memory ID from the create response
          const realMemoryId = finalResult?.data?.memory?.id || finalResult?.data?.memory?._id || currentIpfsHash;
          api.patch(`/memories/${encodeURIComponent(realMemoryId)}`, {
            txHash: transactionHash,
            isOnChain: true
          }).catch(err => {
            console.warn('Failed to update DB with tx hash:', err);
            // Fallback for some older schemas
            if (currentIpfsHash) {
              api.patch(`/memories/${encodeURIComponent(currentIpfsHash)}`, {
                txHash: transactionHash,
                isOnChain: true
              }).catch(() => { });
            }
          });

          setBlockchainStep('complete');

          // 🎉 Confetti celebration!
          fireConfetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
          setTimeout(() => fireConfetti({ particleCount: 80, spread: 60, origin: { x: 0.3, y: 0.5 } }), 300);
          setTimeout(() => fireConfetti({ particleCount: 80, spread: 60, origin: { x: 0.7, y: 0.5 } }), 600);

          // Success Close
          setTimeout(() => {
            resetForm();
            onClose();
            if (onSuccess) onSuccess();
          }, 2500);

        } catch (blockchainError: any) {
          console.error('❌ Blockchain Error:', blockchainError);
          const errMsg = blockchainError.message || JSON.stringify(blockchainError);
          setBlockchainStep('error');
          setLoading(false);

          if (blockchainError.isModuleNotFound || errMsg.includes('module_not_found') || errMsg.includes('Module not found')) {
            const isMainnet = NETWORK.includes('mainnet');
            const isTestnet = NETWORK.includes('testnet');
            const isDevnet = NETWORK.includes('devnet');

            setError(
              <div className="text-left">
                <p className="font-bold text-red-600 font-sans tracking-tight">
                  ⚠️ Smart Contract Not Distributed
                </p>
                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg mt-2 text-[11px] leading-relaxed border border-amber-200">
                  <p className="mb-2">
                    Current Network: <b>{NETWORK.toUpperCase()}</b><br />
                    Contract Address: <span className="font-mono text-[9px] break-all bg-white/50 px-1">{MODULE_ADDRESS}</span><br />
                    <span className="text-[9px] text-red-700 font-bold block mt-1">Status: Module not found on this network.</span>
                  </p>

                  <div className="mt-2 space-y-2">
                    <p className="font-bold text-amber-900 text-xs text-center border-t border-amber-200 pt-2">🔧 Resolution Steps</p>

                    <p className="text-[10px] text-amber-800 bg-white/50 p-2 rounded border border-amber-200 shadow-sm leading-relaxed">
                      1. Open **Petra Wallet** extension.<br />
                      2. Go to **Settings** (Gear icon).<br />
                      3. Select **Network** and choose **DEVNET** manually.<br />
                      4. Click **"Try Devnet"** below once your wallet is switched.
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {NETWORK.toLowerCase() !== 'testnet' && (
                        <button
                          type="button"
                          onClick={async () => {
                            setIsSwitchingNetwork(true);
                            await switchNetwork('testnet');
                            setIsSwitchingNetwork(false);
                            setError(<span className="font-bold text-amber-600 italic animate-pulse">Checking Testnet storage...</span>);
                          }}
                          disabled={isSwitchingNetwork}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          Try Testnet
                        </button>
                      )}

                      {NETWORK.toLowerCase() !== 'devnet' && (
                        <button
                          type="button"
                          onClick={async () => {
                            setIsSwitchingNetwork(true);
                            await switchNetwork('devnet');
                            setIsSwitchingNetwork(false);
                            setError(<span className="font-bold text-amber-600 italic animate-pulse">Checking Devnet storage...</span>);
                          }}
                          disabled={isSwitchingNetwork}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          Try Devnet
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-slate-500 italic text-[9px] text-center border-t border-amber-200/50 pt-2">
                      <b>Devnet Reset?</b> Aptos Devnet resets weekly. You may need to redeploy the contract to get a new active address.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStoreOnChain(false);
                    setError('');
                    setBlockchainStep('complete');
                    fireConfetti({ particleCount: 200, spread: 130, origin: { y: 0.6 } });
                    setTimeout(() => {
                      resetForm();
                      onClose();
                    }, 2000);
                  }}
                  className="mt-4 w-full bg-black text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 active:scale-95"
                >
                  🚀 Skip Blockchain & Post Memory
                </button>
              </div>
            );
          } else if (errMsg.includes('INSUFFICIENT_BALANCE') || errMsg.includes('balance') || errMsg.includes('gas') || errMsg.includes('INSUFFICIENT_COIN') || errMsg.toLowerCase().includes('not enough coins') || errMsg.toLowerCase().includes('insufficient apt') || errMsg.includes('code: -32000')) {
            console.warn("Insufficient funds, auto-skipping blockchain storage to prevent errors.");
            setStoreOnChain(false);
            setError('');
            setBlockchainStep('complete');
            fireConfetti({ particleCount: 200, spread: 130, origin: { y: 0.6 } });
            setTimeout(() => {
              resetForm();
              onClose();
              if (onSuccess) onSuccess();
            }, 2000);
            return;
          } else if (errMsg.includes('Resource not found') || errMsg.includes('0x1::errors::not_found')) {
            setError("Contract found but not initialized. Please run the initialization script.");
          } else if (errMsg.includes('User Rejected')) {
            setError("Transaction rejected in wallet.");
          } else {
            setError(`Blockchain failed: ${errMsg.slice(0, 100)}`);
          }
          return;
        }
      } else {
        // Success (IPFS only)
        setBlockchainStep('complete');

        // 🎉 Confetti celebration!
        fireConfetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        setTimeout(() => fireConfetti({ particleCount: 60, spread: 50, origin: { x: 0.35, y: 0.5 } }), 250);
        setTimeout(() => fireConfetti({ particleCount: 60, spread: 50, origin: { x: 0.65, y: 0.5 } }), 500);

        setTimeout(() => {
          resetForm();
          onClose();
        }, 1800);
      }

    } catch (err: any) {
      console.error('❌ Submit error:', err);
      setError(err.message || 'Failed to process file');
      setBlockchainStep('error');
      setLoading(false);
    } finally {
      // General safety cleanup
      if (blockchainStep !== 'complete' && blockchainStep !== 'signing-tx' && blockchainStep !== 'confirming') {
        // This space intentionally left to allow the process to continue
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-xl" onClick={handleClose} />

      <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-100/30 border border-gray-100 animate-in zoom-in duration-500">
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-50 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">New Memory</h2>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Preserve Forever On-Chain</p>
          </div>
          <button onClick={handleClose} disabled={loading} className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {blockchainStep === 'complete' && explorerUrl && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in slide-in-from-top-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-200">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900">Blockchain Proof Created!</p>
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 mt-1.5 font-bold uppercase tracking-wider transition-colors">
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-rose-700 font-bold">{error}</div>
                </div>
              </div>
            </div>
          )}

          {storeOnChain && connected && (
            <div className="p-5 rounded-2xl border transition-all duration-300 bg-indigo-50/50 border-indigo-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl shadow-sm bg-indigo-100">
                    <Coins className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Wallet Connected</p>
                    <p className="font-black text-gray-900">Ready for transaction</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-indigo-900">
                    {blockchainStep === 'uploading-ipfs' && "IPFS Uploading..."}
                    {blockchainStep === 'connecting-wallet' && "Handshaking..."}
                    {blockchainStep === 'funding-wallet' && "Refueling..."}
                    {blockchainStep === 'simulating' && "Simulating..."}
                    {blockchainStep === 'signing-tx' && "Waiting for Signature..."}
                    {blockchainStep === 'confirming' && "Confirming..."}
                    {blockchainStep === 'complete' && "Success!"}
                    {blockchainStep === 'idle' && "Processing..."}
                  </p>
                  {blockchainStep === 'signing-tx' && <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1">Check Petra Extension</p>}
                </div>
              </div>
            </div>
          )}

          {!file ? (
            <div
              className={`group relative border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-500 ${dragOver ? 'border-indigo-400 bg-indigo-50/50 scale-[0.98]' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50/50 hover:scale-[0.99]'}`}
              onClick={() => !loading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input id="memory-file-upload" name="memory-file-upload" aria-label="Upload a Memory" ref={fileInputRef} type="file" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden" disabled={loading} />
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-gray-200/50 ring-1 ring-black/5 group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-7 h-7 text-indigo-500" />
              </div>
              <p className="text-sm font-black text-gray-900 mb-1">Upload a Memory</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click or Drag & Drop</p>
            </div>
          ) : (
            <div className="relative rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl shadow-indigo-100/10 group">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="w-full h-40 bg-gray-50 flex flex-col items-center justify-center gap-3">
                  <div className="p-4 bg-white rounded-2xl shadow-sm ring-1 ring-black/5">
                    <File className="w-8 h-8 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[200px]">{file.name}</span>
                </div>
              )}
              {!loading && (
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md text-gray-400 hover:text-rose-500 rounded-xl transition-all shadow-lg ring-1 ring-black/5 hover:scale-110"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="memory-title" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Title</label>
              <input
                id="memory-title"
                name="memory-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's this memory called?"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all font-bold text-gray-900 placeholder:text-gray-300"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="memory-description" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
              <textarea
                id="memory-description"
                name="memory-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share the story behind this moment..."
                rows={2}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 resize-none transition-all font-medium text-gray-900 placeholder:text-gray-300"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Tag As</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${category === cat.value
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50'
                    : 'bg-white border border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-500'
                    }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setStoreOnChain(!storeOnChain)}
              disabled={loading}
              className={`p-4 rounded-[1.5rem] border transition-all flex items-center justify-between group ${storeOnChain ? 'bg-indigo-600 border-indigo-700 shadow-xl shadow-indigo-100' : 'bg-gray-50 border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${storeOnChain ? 'bg-indigo-500 text-white' : 'bg-white text-gray-400 ring-1 ring-black/5'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className={`text-[11px] font-black uppercase tracking-tight ${storeOnChain ? 'text-white' : 'text-gray-900'}`}>On-Chain Proof</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${storeOnChain ? 'text-indigo-200' : 'text-gray-400'}`}>Immutable ownership</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${storeOnChain ? 'bg-white border-white' : 'bg-white border-gray-200'}`}>
                {storeOnChain && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
            </button>

            <button
              onClick={() => setIsCapsule(!isCapsule)}
              disabled={loading}
              className={`p-4 rounded-[1.5rem] border transition-all flex items-center justify-between group ${isCapsule ? 'bg-amber-500 border-amber-600 shadow-xl shadow-amber-100' : 'bg-gray-50 border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${isCapsule ? 'bg-amber-400 text-white' : 'bg-white text-gray-400 ring-1 ring-black/5'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className={`text-[11px] font-black uppercase tracking-tight ${isCapsule ? 'text-white' : 'text-gray-900'}`}>Time Capsule</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isCapsule ? 'text-amber-100' : 'text-gray-400'}`}>Seal until future date</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isCapsule ? 'bg-white border-white' : 'bg-white border-gray-200'}`}>
                {isCapsule && <Check className="w-3.5 h-3.5 text-amber-500" />}
              </div>
            </button>
          </div>

          {isCapsule && (
            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div>
                <label htmlFor="beneficiary-wallet" className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2 ml-1">Beneficiary Wallet</label>
                <input
                  id="beneficiary-wallet"
                  name="beneficiary-wallet"
                  type="text"
                  value={beneficiaryAddress}
                  onChange={(e) => setBeneficiaryAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-mono text-xs text-amber-900"
                />
              </div>
              <div>
                <label htmlFor="release-date" className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2 ml-1">Unlock At</label>
                <input
                  id="release-date"
                  name="release-date"
                  type="datetime-local"
                  value={releaseDate}
                  min={toLocalISOString(new Date(Date.now() + 60000))}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-amber-900"
                />
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 px-8 py-8 mt-4 border-t border-gray-50 bg-white/80 backdrop-blur-xl flex items-center gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <ConfettiButton
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !file || (isCapsule && (!beneficiaryAddress || !releaseDate))}
            variant={blockchainStep === 'complete' ? 'gradient' : 'default'}
            size="lg"
            animation="scale"
            icon={blockchainStep === 'complete' ? <Sparkles className="w-4 h-4" /> : loading ? <Loader2 className="w-4 h-4 animate-spin text-white/50" /> : <Plus className="w-4 h-4" />}
            loading={false}
            confettiOptions={{
              particleCount: 120,
              spread: 90,
              startVelocity: 25,
              colors: ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'],
            }}
            className="flex-[1.5] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl"
          >
            {blockchainStep === 'complete' ? '🎉 Preserved!' : 'Store Memory'}
          </ConfettiButton>
        </div>
      </div>
    </div>
  );
};