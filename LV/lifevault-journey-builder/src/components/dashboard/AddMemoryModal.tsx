import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { fileToBase64 } from '@/services/api';
import api from '@/services/api';
import type { CreateMemoryData } from '@/types';
import { toLocalISOString } from '@/lib/utils';
import {
  X, Upload, Image, FileText, Film, Music, File,
  Loader2, ExternalLink, Shield, Check, AlertCircle, Coins, Clock, ImagePlus, Plus, Sparkles
} from 'lucide-react';
import { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { ConfettiButton, fireConfetti } from '@/components/ui/ConfettiButton/ConfettiButton';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMemoryData) => Promise<{
    success: boolean;
    message?: string;
    data?: any
  }>;
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
  onSubmit
}) => {
  const {
    signAndSubmitTransaction,
    account,
    connected,
    connect,
    fundWallet,
    balance,
    isPetraInstalled
  } = useWallet();

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MODULE_ADDRESS = import.meta.env.VITE_APTOS_MODULE_ADDRESS ||
    '0x547b91ee28212a3759017e89addbf0507d0e082264914855bcc2a602139b870a';
  const MODULE_NAME = 'memory_vault';
  const NETWORK = import.meta.env.VITE_APTOS_NETWORK || 'devnet';

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
      if (!currentIpfsHash) {
        setBlockchainStep('uploading-ipfs');
        console.log('📤 Uploading to IPFS...');

        const base64 = await fileToBase64(file);

        const result = await onSubmit({
          title: title.trim(),
          description: description.trim(),
          category,
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
          storeOnChain: false,
          isCapsule,
          beneficiaryAddress,
          releaseTimestamp: releaseDate ? Math.floor(new Date(releaseDate).getTime() / 1000) : undefined
        });

        if (!result.success) {
          throw new Error(result.message || 'Failed to create memory');
        }

        currentIpfsHash = result.data?.ipfs?.hash;
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
            const config = new AptosConfig({
              network: NETWORK === 'mainnet' ? Network.MAINNET :
                NETWORK === 'testnet' ? Network.TESTNET :
                  Network.DEVNET
            });
            const aptos = new Aptos(config);
            await aptos.getAccountModule({
              accountAddress: MODULE_ADDRESS,
              moduleName: MODULE_NAME,
            });
            console.log('✅ Module verified on-chain');
          } catch (moduleErr: any) {
            console.error('🔍 Module Check Failed:', moduleErr);
            if (moduleErr.message?.includes('not_found') || moduleErr.status === 404) {
              const error = new Error('Module not found');
              (error as any).isModuleNotFound = true;
              throw error;
            }
          }

          setBlockchainStep('simulating');

          const payload: InputTransactionData = {
            data: {
              function: `${MODULE_ADDRESS}::${MODULE_NAME}::store_memory`,
              functionArguments: [currentIpfsHash],
              typeArguments: []
            }
          };

          setBlockchainStep('signing-tx');
          const txResult = await signAndSubmitTransaction(payload);

          if (!txResult || !txResult.hash) {
            throw new Error('Transaction submitted but no hash returned');
          }

          const transactionHash = txResult.hash;
          setTxHash(transactionHash);
          setExplorerUrl(`https://explorer.aptoslabs.com/txn/${transactionHash}?network=${NETWORK}`);

          setBlockchainStep('confirming');

          // Background update to DB
          api.patch(`/api/memories/${encodeURIComponent(title)}`, {
            txHash: transactionHash,
            isOnChain: true
          }).catch(err => console.warn('Failed to update DB with tx hash:', err));

          setBlockchainStep('complete');

          // 🎉 Confetti celebration!
          fireConfetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
          setTimeout(() => fireConfetti({ particleCount: 80, spread: 60, origin: { x: 0.3, y: 0.5 } }), 300);
          setTimeout(() => fireConfetti({ particleCount: 80, spread: 60, origin: { x: 0.7, y: 0.5 } }), 600);

          // Success Close
          setTimeout(() => {
            resetForm();
            onClose();
          }, 2500);

        } catch (blockchainError: any) {
          console.error('❌ Blockchain Error:', blockchainError);
          const errMsg = blockchainError.message || JSON.stringify(blockchainError);
          setBlockchainStep('error');
          setLoading(false);

          if (blockchainError.isModuleNotFound || errMsg.includes('module_not_found') || errMsg.includes('Module not found')) {
            setError(
              <div className="text-left">
                <p className="font-bold text-red-600 font-sans">⚠️ Wallet Network Mismatch!</p>
                <p className="text-[11px] mt-1 text-red-500">The smart contract is deployed on <b>DEVNET</b>, but your Petra wallet may be on a different network.</p>
                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg mt-2 text-[11px] leading-relaxed border border-amber-200">
                  <p className="font-bold mb-1">🔧 Fix: Switch Petra Wallet to Devnet</p>
                  <ol className="list-decimal ml-4 space-y-0.5">
                    <li>Open <b>Petra Wallet</b> extension</li>
                    <li>Click <b>Settings</b> (gear icon)</li>
                    <li>Select <b>Network</b></li>
                    <li>Switch to <b>Devnet</b></li>
                    <li>Retry saving your memory</li>
                  </ol>
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
          } else if (errMsg.includes('INSUFFICIENT_BALANCE') || errMsg.includes('balance') || errMsg.includes('gas')) {
            setError("Insufficient APT to pay for gas.");
            setShowFundButton(true);
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
                  {showFundButton && (
                    <button onClick={handleFundWallet} className="mt-3 w-full flex items-center justify-center gap-2 bg-rose-600 text-white py-2.5 rounded-xl hover:bg-rose-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95">
                      <Coins className="w-4 h-4" />
                      Get Free APT
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {storeOnChain && connected && (
            <div className={`p-5 rounded-2xl border transition-all duration-300 ${balance !== null && balance < 0.05 ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl shadow-sm ${balance !== null && balance < 0.05 ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                    <Coins className={`w-5 h-5 ${balance !== null && balance < 0.05 ? 'text-amber-600' : 'text-indigo-600'}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Wallet Balance</p>
                    <p className="font-black text-gray-900">{balance !== null ? `${balance.toFixed(4)} APT` : 'Loading...'}</p>
                  </div>
                </div>
                {balance !== null && balance < 0.05 && NETWORK !== 'mainnet' && (
                  <button onClick={handleFundWallet} disabled={loading} className="px-3 py-2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-md shadow-amber-200 active:scale-95">
                    Faucet
                  </button>
                )}
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
              <input ref={fileInputRef} type="file" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden" disabled={loading} />
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
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's this memory called?"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all font-bold text-gray-900 placeholder:text-gray-300"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
              <textarea
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
                <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2 ml-1">Beneficiary Wallet</label>
                <input
                  type="text"
                  value={beneficiaryAddress}
                  onChange={(e) => setBeneficiaryAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-mono text-xs text-amber-900"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2 ml-1">Unlock At</label>
                <input
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