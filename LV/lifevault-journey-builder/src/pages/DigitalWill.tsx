import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Zap,
    FileText,
    Users,
    History,
    Plus,
    Settings,
    Clock,
    AlertCircle,
    Trash2,
    Mail,
    Fingerprint,
    Loader2,
    Check,
    X,
    BookOpen,
    UserPlus,
    Activity,
    ShieldCheck,
    Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { willAPI } from '@/services/api';
import { useWallet } from '@/context/WalletContext';

const DigitalWill: React.FC = () => {
    const { account } = useWallet();
    const [activeTab, setActiveTab] = useState('will');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBeneficiary, setNewBeneficiary] = useState({ name: '', email: '', walletAddress: '', relationship: 'Family' });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentWill, setCurrentWill] = useState<any>(null);
    const { toast } = useToast();

    /* ── State Data ─────────────────────────────────────────────── */
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    const [instructions, setInstructions] = useState<any[]>([
        { title: 'Release Trigger', desc: 'Automatically initiate asset release after 180 days of inactivity.', icon: Clock, meta: '6 months delay' },
        { title: 'Multi-Signature Approval', desc: 'Requires confirmation from 2 verified beneficiaries to unlock.', icon: Zap, meta: 'Enabled' },
    ]);

    const [vaultSettings, setVaultSettings] = useState<any[]>([
        { id: 'biometric', title: 'Identity Verification', desc: 'Require periodic biometric verification to keep your instructions active.', icon: Fingerprint, status: true },
        { id: 'backup', title: 'Secure Backup', desc: 'Encrypted storage across multiple nodes for data redundancy.', icon: Shield, status: true },
        { id: 'disclosure', title: 'Emergency Disclosure', desc: 'Enable emergency access protocol with verified legal documentation.', icon: AlertCircle, status: false },
    ]);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await willAPI.getMyWills();
            const axiosData = res?.data as any;
            const wills = axiosData?.data?.wills || [];

            if (wills.length > 0) {
                const mainWill = wills[0];
                setCurrentWill(mainWill);
                setBeneficiaries(mainWill.beneficiaries || []);
                setLogs(mainWill.activityLog || []);

                // Sync dynamic instructions
                setInstructions([
                    {
                        title: 'Release Trigger',
                        desc: `Automatically initiate asset release after ${mainWill.deadManSwitch?.inactivityMonths || 6} months of inactivity.`,
                        icon: Clock,
                        meta: mainWill.deadManSwitch?.enabled ? `Active (${mainWill.deadManSwitch.inactivityMonths}m)` : 'Inactive'
                    },
                    {
                        title: 'Multi-Signature Approval',
                        desc: `Requires confirmation from ${mainWill.multiSig?.requiredConfirmations || 2} verified beneficiaries to unlock.`,
                        icon: Zap,
                        meta: mainWill.multiSig?.enabled ? 'Active' : 'Offline'
                    },
                ]);

                // Sync dynamic settings
                setVaultSettings([
                    {
                        id: 'deadManSwitch',
                        title: 'Dead Man\'s Switch',
                        desc: 'Require periodic check-ins to prevent unintended asset distribution.',
                        icon: Fingerprint,
                        status: mainWill.deadManSwitch?.enabled
                    },
                    {
                        id: 'multiSig',
                        title: 'Multi-Signature Governance',
                        desc: 'Distributed trust via consensus among your trusted beneficiaries.',
                        icon: Shield,
                        status: mainWill.multiSig?.enabled
                    },
                    {
                        id: 'notary',
                        title: 'On-Chain Notarization',
                        desc: 'Your instructions are timestamped and secured on the blockchain.',
                        icon: ShieldCheck,
                        status: !!mainWill.blockchainTxHash
                    }
                ]);
            } else {
                const initRes = await willAPI.create({
                    title: 'My Primary Legacy',
                    description: 'Secure digital asset distribution instructions.',
                    beneficiaries: []
                });
                const newWillData = (initRes?.data as any)?.data?.will;
                setCurrentWill(newWillData);
                fetchData();
            }
        } catch (e) {
            console.error('Failed to fetch digital will:', e);
            toast({ title: 'Connection Error', description: 'Failed to sync your digital will data.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ── Handlers ───────────────────────────────────────────────── */
    const handleAddBeneficiary = async () => {
        if (!newBeneficiary.name.trim() || !newBeneficiary.walletAddress.trim()) {
            toast({ title: 'Missing details', description: 'Please provide both a name and wallet address.' });
            return;
        }

        if (!currentWill?._id) {
            toast({ title: 'Will Not Configured', description: 'Please wait for your digital will to fully initialize.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            const res = await willAPI.addBeneficiary(currentWill._id, {
                name: newBeneficiary.name,
                walletAddress: newBeneficiary.walletAddress,
                relationship: newBeneficiary.relationship.toLowerCase() as any,
                email: newBeneficiary.email || undefined
            });

            const updatedWill = (res.data as any)?.data?.will;
            if (updatedWill) {
                setCurrentWill(updatedWill);
                setBeneficiaries(updatedWill.beneficiaries || []);
                setLogs(updatedWill.activityLog || []);
            }

            setNewBeneficiary({ name: '', email: '', walletAddress: '', relationship: 'Family' });
            setShowAddForm(false);
            toast({
                title: 'Invitation Sent',
                description: `Added ${newBeneficiary.name}. They will receive an email to confirm their role and identity.`
            });
        } catch (e: any) {
            toast({ title: 'Verification Failed', description: e.response?.data?.message || 'Could not register identity and wallet.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveBeneficiary = async (id: string) => {
        if (!currentWill?._id) return;
        try {
            await willAPI.removeBeneficiary(currentWill._id, id);
            fetchData();
            toast({ title: 'Identity Revoked', description: 'Beneficiary has been removed from the encrypted instructions.' });
        } catch (e) {
            toast({ title: 'Action Failed', description: 'Failed to synchronize revocation.', variant: 'destructive' });
        }
    };

    const handleVerifyBeneficiary = async (id: string) => {
        toast({ title: 'Aptos Verification', description: 'Simulating on-chain verification for this identity.' });
    };

    const handleCheckin = async () => {
        if (!currentWill?._id) return;
        setSaving(true);
        try {
            await willAPI.checkin(currentWill._id);
            toast({ title: 'Check-in Recorded', description: 'Your active presence has been verified. The countdown is reset.' });
            fetchData();
        } catch (e) {
            toast({ title: 'Protocol Error', description: 'Failed to record neural presence.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleSetting = async (index: number) => {
        if (!currentWill?._id) return;
        const setting = vaultSettings[index];
        const newStatus = !setting.status;

        try {
            const updatePayload: any = {};
            if (setting.id === 'deadManSwitch') {
                updatePayload.deadManSwitch = { ...currentWill.deadManSwitch, enabled: newStatus };
            } else if (setting.id === 'multiSig') {
                updatePayload.multiSig = { ...currentWill.multiSig, enabled: newStatus };
            } else {
                toast({ title: 'Protocol Static', description: 'This module is currently hard-linked to core security.' });
                return;
            }

            await willAPI.updateWill(currentWill._id, updatePayload);
            fetchData();
            toast({ title: 'Security Protocol Updated', description: `${setting.title} is now ${newStatus ? 'active' : 'offline'}.` });
        } catch (e) {
            toast({ title: 'Sync Failed', description: 'Failed to update security configuration.', variant: 'destructive' });
        }
    };

    const handleAddInstruction = () => {
        toast({ title: 'Protocol Addition', description: 'Standard distribution rule added to draft.' });
    };

    const handleUpdateInstructions = async () => {
        if (!currentWill?._id) return;
        setSaving(true);
        try {
            await willAPI.notarize(currentWill._id);
            toast({ title: 'Will Notarized', description: 'Your legacy instructions have been secured on the blockchain.' });
            fetchData();
        } catch (e) {
            toast({ title: 'Notarization Failed', description: 'Failed to secure instructions on-chain.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'will', label: 'Instructions', icon: BookOpen, desc: 'Distribution rules' },
        { id: 'beneficiaries', label: 'Beneficiaries', icon: Users, desc: 'Assigned people' },
        { id: 'history', label: 'History', icon: History, desc: 'Activity log' },
        { id: 'settings', label: 'Settings', icon: Settings, desc: 'Will configuration' },
    ];

    return (
        <DashboardLayout>
            <div className="min-h-screen space-y-8 pb-20">

                {/* ── Hero ─────────────────────────────────────────── */}
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
                                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Will Status: Active</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                                Digital Will
                            </h1>
                            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                                Manage the distribution of your digital assets. Define rules, assign beneficiaries, and ensure your legacy is handled exactly as you intend.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 mt-8">
                                {currentWill?.deadManSwitch?.enabled && (
                                    <button
                                        onClick={handleCheckin}
                                        disabled={saving}
                                        className="flex items-center gap-2.5 px-7 py-3.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                        {saving ? 'Verifying...' : 'Pulse Check-in'}
                                    </button>
                                )}
                                <button
                                    onClick={handleUpdateInstructions}
                                    disabled={saving}
                                    className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-slate-900 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {saving ? 'Securing...' : 'Notarize Will'}
                                </button>
                                <div className="flex items-center gap-2 px-5 py-3.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl text-white/70 text-sm">
                                    <Lock className="w-4 h-4 text-emerald-400" />
                                    <span>Military-Grade Encryption</span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden xl:flex">
                            <div className="relative w-40 h-40">
                                <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                                    <Shield className="w-16 h-16 text-white/20" />
                                </div>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-4 border border-dashed border-white/10 rounded-3xl"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Main Interface ────────────────────────────────── */}
                <div className="grid lg:grid-cols-[280px,1fr] gap-8">

                    {/* Navigation */}
                    <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-left min-w-[200px] lg:min-w-0 border ${activeTab === item.id
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200'
                                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === item.id ? 'bg-white/10' : 'bg-slate-100'
                                    }`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{item.label}</p>
                                    <p className="text-xs text-slate-400">{item.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="min-h-[500px]">
                        <AnimatePresence mode="wait">
                            {activeTab === 'will' && (
                                <motion.div key="will" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">Release Instructions</h2>
                                            <p className="text-sm text-slate-500 mt-1">{instructions.length} rules active</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        {instructions.map((card, i) => (
                                            <div
                                                key={i}
                                                className="group p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
                                                    <card.icon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-2">{card.title}</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed mb-6">{card.desc}</p>
                                                <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                                    <span className="text-xs font-semibold text-indigo-600 px-2 py-1 bg-indigo-50 rounded-md">{card.meta}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleAddInstruction}
                                        className="w-full p-6 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                        <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">Add Distribution Rule</span>
                                    </button>
                                </motion.div>
                            )}

                            {activeTab === 'beneficiaries' && (
                                <motion.div key="beneficiaries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">Beneficiaries</h2>
                                            <p className="text-sm text-slate-500 mt-1">{beneficiaries.length} people assigned</p>
                                        </div>
                                        <button
                                            onClick={() => setShowAddForm(!showAddForm)}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all"
                                        >
                                            {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                            {showAddForm ? 'Cancel' : 'Add Person'}
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {showAddForm && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 mb-6">
                                                    <h3 className="font-bold text-slate-900">New Beneficiary</h3>
                                                    <div className="grid md:grid-cols-3 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                                            <input type="text" placeholder="John Doe" value={newBeneficiary.name} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, name: e.target.value }))}
                                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-indigo-400 outline-none transition-all" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email (Optional for Invite)</label>
                                                            <input type="email" placeholder="john@example.com" value={newBeneficiary.email} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, email: e.target.value }))}
                                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-indigo-400 outline-none transition-all" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between ml-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wallet Address / Auth ID</label>
                                                                {account?.address && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setNewBeneficiary(prev => ({ ...prev, walletAddress: account.address }))}
                                                                        className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                                                                    >
                                                                        Use My Wallet
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <input type="text" placeholder="0x... or Aptos ID" value={newBeneficiary.walletAddress} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, walletAddress: e.target.value }))}
                                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-indigo-400 outline-none transition-all font-mono" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Relationship</label>
                                                            <select value={newBeneficiary.relationship} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, relationship: e.target.value }))}
                                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-indigo-400 outline-none transition-all">
                                                                <option>Family</option><option>Spouse</option><option>Child</option><option>Sibling</option><option>Close Friend</option><option>Attorney</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <button onClick={handleAddBeneficiary} disabled={saving}
                                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-60">
                                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        Add Beneficiary
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-3">
                                        {beneficiaries.map((b) => (
                                            <div key={b.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold uppercase">
                                                        {b.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2.5">
                                                            <h3 className="font-bold text-slate-900">{b.name}</h3>
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${b.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                                {b.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                                                            <span className="flex items-center gap-1.5 font-mono"><Fingerprint className="w-3.5 h-3.5" />{b.walletAddress || 'No address'}</span>
                                                            <span className="text-slate-300">·</span>
                                                            <span className="capitalize">{b.relationship}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleVerifyBeneficiary(b.id)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${b.status === 'verified' ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                        {b.status === 'verified' ? 'Revoke Verify' : 'Verify Identity'}
                                                    </button>
                                                    <button onClick={() => b._id && handleRemoveBeneficiary(b._id)}
                                                        className="p-2 rounded-lg border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {beneficiaries.length === 0 && (
                                            <div className="p-16 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                                                <Users className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                                <p className="text-sm font-semibold text-slate-500 mb-6">Assign your first beneficiary to get started</p>
                                                <button onClick={() => setShowAddForm(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100">
                                                    Add Beneficiary
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'history' && (
                                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-2xl font-bold text-slate-900">Activity History</h2>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                                        {logs.length > 0 ? logs.map((log) => (
                                            <div key={log._id || log.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 capitalize">{log.action.replace(/_/g, ' ')}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{new Date(log.timestamp).toLocaleDateString()} — Identity Verified</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Locked</span>
                                            </div>
                                        )) : (
                                            <div className="p-12 text-center text-slate-400 italic">No activity recorded yet</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {loading && (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin mb-4" />
                                    <p className="text-sm font-semibold text-slate-400">Synchronizing will data...</p>
                                </div>
                            )}
                            {!loading && activeTab === 'settings' && (
                                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="mb-4">
                                        <h2 className="text-2xl font-bold text-slate-900">Will Configuration</h2>
                                        <p className="text-sm text-slate-500 mt-1">Manage security and access protocols</p>
                                    </div>

                                    <div className="grid gap-4">
                                        {vaultSettings.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${s.status ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                        <s.icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">{s.title}</h3>
                                                        <p className="text-sm text-slate-500 mt-0.5 max-w-lg leading-relaxed">{s.desc}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleToggleSetting(i)}
                                                    className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${s.status ? 'bg-indigo-900' : 'bg-slate-200'}`}>
                                                    <div className={`absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${s.status ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default DigitalWill;
