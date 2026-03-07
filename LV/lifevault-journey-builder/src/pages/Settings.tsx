// file: src/pages/Settings.tsx

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WalletAuthModal } from '@/components/wallet/WalletAuthModal';
import { authAPI, getInitials, formatFileSize, fileToBase64 } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Wallet,
  HardDrive,
  AlertTriangle,
  Copy,
  ExternalLink,
  Check,
  Link as LinkIcon,
  Unlink,
  Settings as SettingsIcon,
  Shield,
  LogOut,
  ChevronRight,
  Database,
  Mail,
  Lock,
  ShieldCheck,
  Fingerprint,
  Camera,
  X,
  Save,
  Edit3,
  CloudUpload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { disconnect, network } = useWallet();
  const [copied, setCopied] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasLinkedWallet = user?.aptosAddress && user.aptosAddress.length > 0;

  const handleUnlinkWallet = async () => {
    if (window.confirm('Are you sure you want to unlink your wallet? You can link it again later.')) {
      updateUser({ aptosAddress: undefined });
      await disconnect();
      toast({ title: "Wallet Unlinked", description: "Your wallet has been disconnected successfully." });
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-8 pb-20">

        {/* ── Hero Header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-8 sm:p-12"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Account Active</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Settings
              </h1>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Manage your profile, wallet connections, storage, and account preferences.
              </p>
            </div>

            <div className="hidden xl:flex">
              <div className="relative w-44 h-44">
                <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <SettingsIcon className="w-16 h-16 text-white/30" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-4 border border-dashed border-white/10 rounded-[2rem]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Profile + Wallet ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Profile</h2>
                <p className="text-sm text-slate-500 mt-0.5">Your personal information</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
              </div>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-5 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="relative group/avatar">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-16 h-16 rounded-xl object-cover shadow-sm ring-2 ring-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-sm ring-2 ring-white">
                    {getInitials(user?.name || user?.email)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{user?.name || 'User'}</h3>
                <p className="text-sm text-slate-500 truncate max-w-[150px]">{user?.email}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-[0.97] flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            </div>

            {/* Info Rows */}
            <div className="space-y-3">
              {[
                { label: 'Email', value: user?.email || 'Not set', icon: Mail },
                { label: 'Bio', value: user?.bio || 'Tell us about yourself...', icon: Edit3 },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-50 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Wallet Section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Wallet</h2>
                <p className="text-sm text-slate-500 mt-0.5">Blockchain connection</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
            </div>

            {hasLinkedWallet ? (
              <div className="space-y-5">
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 text-xs font-semibold">Wallet Connected</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-lg border border-emerald-100/50">
                    <code className="text-xs font-mono text-emerald-800 break-all flex-1">{user.aptosAddress}</code>
                    <button
                      onClick={() => copyToClipboard(user.aptosAddress!)}
                      className="w-9 h-9 flex items-center justify-center bg-white hover:bg-emerald-100 rounded-lg transition-all shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-slate-400 mb-1">Balance</p>
                    <p className="text-2xl font-bold text-slate-900">{user?.aptosBalance || 0} <span className="text-indigo-600 text-sm">APT</span></p>
                  </div>
                  <a
                    href={`https://explorer.aptoslabs.com/account/${user.aptosAddress}?network=${network?.name?.toLowerCase() || import.meta.env.VITE_APTOS_NETWORK || 'devnet'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all group"
                  >
                    <p className="text-xs font-medium text-slate-400 mb-1">Explorer</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">View On-Chain</span>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </a>
                </div>

                <button
                  onClick={handleUnlinkWallet}
                  className="w-full py-3.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Unlink className="w-4 h-4" />
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="text-center py-12 px-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Wallet Connected</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                  Connect your Petra wallet to enable on-chain features and identity verification.
                </p>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="px-7 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center gap-2 mx-auto active:scale-[0.97]"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link Petra Wallet
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Storage + Danger Zone ─────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Storage */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Storage</h2>
                <p className="text-sm text-slate-500 mt-0.5">Data usage overview</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-medium text-slate-400 mb-2">Total Records</p>
                <p className="text-3xl font-bold text-slate-900">
                  {user?.totalMemories || 0} <span className="text-indigo-600 text-base font-semibold">items</span>
                </p>
              </div>
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-medium text-slate-400 mb-2">Storage Used</p>
                <p className="text-3xl font-bold text-slate-900">
                  {formatFileSize(user?.storageUsed || 0).split(' ')[0]} <span className="text-purple-600 text-base font-semibold">{formatFileSize(user?.storageUsed || 0).split(' ')[1]}</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-red-100 p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
                <p className="text-sm text-red-400 mt-0.5">Irreversible actions</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={logout}
                className="w-full p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between group hover:bg-black transition-all active:scale-[0.98]"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold">Sign Out</p>
                  <p className="text-xs text-slate-400 mt-0.5">End your current session</p>
                </div>
                <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => toast({ title: "Account Deletion", description: "This action is restricted to system administrators." })}
                className="w-full p-4 rounded-xl border border-red-100 bg-white text-red-500 flex items-center justify-between group hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold">Delete Account</p>
                  <p className="text-xs text-red-300 mt-0.5">Permanently remove all data</p>
                </div>
                <Shield className="w-5 h-5 opacity-30 group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <WalletAuthModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        mode="link"
      />

      {/* ── Edit Profile Modal ───────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <EditProfileModal
            user={user}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onUpdate={updateUser}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

// ── Internal Component: EditProfileModal ───────────────────
interface EditProfileModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive"
        });
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAvatar(base64);
      } catch (err) {
        toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
      }
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await authAPI.updateProfile({ name, bio, avatar });

      if (response.data.success) {
        onUpdate({ name, bio, avatar });
        toast({ title: "Profile Updated", description: "Your changes have been saved successfully." });
        onClose();
      }
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Could not update profile.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Edit */}
          <div className="flex flex-col items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              {avatar ? (
                <img src={avatar} alt="Preview" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 ring-4 ring-indigo-50 shadow-lg">
                  <User className="w-10 h-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-indigo-600/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-lg shadow-md border border-indigo-50 flex items-center justify-center text-indigo-600">
                <CloudUpload className="w-4 h-4" />
              </button>
            </div>
            <input
              type="file"
              id="profile-picture-upload"
              name="profile-picture-upload"
              aria-label="Upload profile picture"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
            <p className="text-xs text-slate-400">Click to upload new profile picture</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="settings-displayName" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
              <input
                id="settings-displayName"
                name="settings-displayName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-medium"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="settings-bio" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio</label>
              <textarea
                id="settings-bio"
                name="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-medium resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
