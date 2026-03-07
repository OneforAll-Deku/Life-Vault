import React, { useState } from 'react';
import { formatDate, formatFileSize, getCategoryLabel, getIPFSUrl } from '@/services/api';
import type { Memory } from '@/types';
import { ShareModal } from './ShareModal';
import { useWallet } from '@/context/WalletContext';
import { memoryAPI } from '@/services/api';
import {
  X,
  Download,
  Share2,
  Trash2,
  CheckCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Calendar,
  HardDrive,
  Hash,
  FileText,
  Link,
  Clock,
  Lock,
  Unlock,
  User,
  Globe
} from 'lucide-react';

interface MemoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: Memory | null;
  onDelete: (id: string) => Promise<{ success: boolean; message?: string }>;
  onVerify: (id: string) => Promise<{ success: boolean; data?: any; message?: string }>;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  isOpen,
  onClose,
  memory,
  onDelete,
  onVerify
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { signAndSubmitTransaction, account } = useWallet();

  if (!isOpen || !memory) return null;

  const isImage = memory.fileType?.startsWith('image/');
  const now = Math.floor(Date.now() / 1000);
  const isLocked = memory.isCapsule && (memory.releaseTimestamp || 0) > now;
  const isBeneficiary = memory.beneficiaryAddress?.toLowerCase() === account?.address?.toString().toLowerCase();

  const handleVerify = async () => {
    setVerifying(true);
    const result = await onVerify(memory._id);
    setVerifyResult({
      success: result.success,
      message: result.success ? 'Memory verified on blockchain!' : result.message
    });
    setVerifying(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      setDeleting(true);
      const result = await onDelete(memory._id);
      if (result.success) {
        onClose();
      }
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (isLocked) {
      alert('This content is locked until ' + new Date((memory.releaseTimestamp || 0) * 1000).toLocaleString());
      return;
    }
    window.open(getIPFSUrl(memory.ipfsHash), '_blank');
  };

  const handleClaim = async () => {
    if (!account) {
      alert('Please connect your wallet to claim this capsule.');
      return;
    }

    try {
      setClaiming(true);
      const response = await memoryAPI.claimCapsule(memory._id);

      if (response.data.success) {
        const result = await signAndSubmitTransaction({
          data: response.data.data.payload
        });

        if (result) {
          alert('Capsule claimed successfully!');
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      alert(err.response?.data?.message || 'Failed to claim capsule');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />

        <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-100/50 border border-indigo-50 animate-in zoom-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight truncate max-w-md">{memory.title}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Memory Details & Blockchain Proof</p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Image/Preview */}
            <div className="relative group">
              {isImage ? (
                <img
                  src={getIPFSUrl(memory.ipfsHash)}
                  alt={memory.title}
                  className={`w-full max-h-80 object-contain bg-gray-100 rounded-lg mb-6 ${isLocked ? 'blur-2xl grayscale' : ''}`}
                />
              ) : (
                <div className={`w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-6 ${isLocked ? 'blur-xl' : ''}`}>
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                    <p className="text-gray-500 mt-2">{getCategoryLabel(memory.category)}</p>
                  </div>
                </div>
              )}

              {isLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 rounded-lg mb-6">
                  <div className="p-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-amber-200 flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                    <div className="p-3 bg-amber-100 rounded-full">
                      <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-900">Time-Locked Legacy Capsule</p>
                      <p className="text-sm text-amber-700/70">Unlocks on {new Date((memory.releaseTimestamp || 0) * 1000).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {memory.description && (
              <p className="text-black/60 mb-6">{memory.description}</p>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-black/40 uppercase mb-1">Category</p>
                <p className="font-medium">{getCategoryLabel(memory.category)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-black/40 uppercase mb-1">Created</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(memory.createdAt)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-black/40 uppercase mb-1">File Size</p>
                <p className="font-medium flex items-center gap-1">
                  <HardDrive className="w-4 h-4" />
                  {formatFileSize(memory.fileSize || 0)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-black/40 uppercase mb-1">Network</p>
                <div className="font-medium">
                  {memory.network ? (
                    <span className={`flex items-center gap-1.5 ${memory.network === 'mainnet' ? 'text-emerald-600' : memory.network === 'testnet' ? 'text-amber-600' : 'text-indigo-600'}`}>
                      <Globe className="w-4 h-4" />
                      {memory.network.charAt(0).toUpperCase() + memory.network.slice(1)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not Specified</span>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-black/40 uppercase mb-1">Status</p>
                <div className="font-medium">
                  {memory.isCapsule ? (
                    <span className={`flex items-center gap-1 ${isLocked ? 'text-amber-600' : 'text-green-600'}`}>
                      {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      {isLocked ? 'Locked Capsule' : 'Unlocked Capsule'}
                    </span>
                  ) : memory.isOnChain ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      On-Chain
                    </span>
                  ) : (
                    <span className="text-orange-600">Off-Chain</span>
                  )}
                </div>
              </div>
            </div>

            {/* Capsule Specific Meta */}
            {memory.isCapsule && (
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg"><User className="w-4 h-4 text-amber-600" /></div>
                    <div>
                      <p className="text-xs text-amber-700/50 uppercase font-bold">Beneficiary Address</p>
                      <p className="font-mono text-sm text-amber-900 break-all">{memory.beneficiaryAddress}</p>
                      {isBeneficiary && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold mt-1 inline-block">ITS YOU!</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-4 h-4 text-amber-600" /></div>
                    <div>
                      <p className="text-xs text-amber-700/50 uppercase font-bold">Release Timestamp</p>
                      <p className="font-medium text-amber-900">{new Date((memory.releaseTimestamp || 0) * 1000).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IPFS Hash */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-xs text-black/40 uppercase mb-1">IPFS Hash</p>
              <p className="font-mono text-sm break-all flex items-center gap-2">
                <Hash className="w-4 h-4 flex-shrink-0" />
                {memory.ipfsHash}
              </p>
            </div>

            {/* Transaction Hash */}
            {memory.txHash && (
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <p className="text-xs text-black/40 uppercase mb-1">Transaction Hash</p>
                <p className="font-mono text-sm break-all">{memory.txHash}</p>
              </div>
            )}

            {/* Verification Result */}
            {verifyResult && (
              <div className={`p-4 rounded-lg mb-4 ${verifyResult.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                <p className="flex items-center gap-2">
                  {verifyResult.success ? <ShieldCheck className="w-5 h-5" /> : null}
                  {verifyResult.message}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 p-6 border-t border-black/5">
            {/* Share Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Link className="w-4 h-4" />
              Share
            </button>

            <button
              onClick={handleDownload}
              disabled={isLocked}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-black/5 text-black rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            {memory.isCapsule && !isLocked && !memory.isClaimed && isBeneficiary && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200 transition-all font-bold"
              >
                {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Claim Memory
              </button>
            )}

            {memory.isOnChain && (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        memory={memory}
      />
    </>
  );
};