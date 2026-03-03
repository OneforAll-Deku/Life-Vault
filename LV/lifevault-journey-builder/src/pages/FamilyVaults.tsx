// file: src/pages/FamilyVaults.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { vaultAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/services/api';
import {
    Users,
    Plus,
    Image as ImageIcon,
    Heart,
    Plane,
    Briefcase,
    FolderHeart,
    X,
    ChevronRight,
    Loader2,
    AlertCircle,
    Crown,
    Eye,
    Pencil,
    Search,
    Vault,
    Shield,
    Activity,
    Sparkles,
    Rocket,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// ── Category Config ────────────────────────────────────────────
const CATEGORIES = [
    { id: 'family', label: 'Family', emoji: '👪', icon: Users, color: '#6366f1' },
    { id: 'wedding', label: 'Wedding', emoji: '💒', icon: Heart, color: '#ec4899' },
    { id: 'trip', label: 'Trip', emoji: '✈️', icon: Plane, color: '#f59e0b' },
    { id: 'friends', label: 'Friends', emoji: '🤝', icon: Users, color: '#10b981' },
    { id: 'project', label: 'Project', emoji: '📁', icon: Briefcase, color: '#3b82f6' },
    { id: 'other', label: 'Other', emoji: '📦', icon: FolderHeart, color: '#8b5cf6' },
];

const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f59e0b', '#10b981', '#3b82f6', '#06b6d4',
];

const EMOJIS = ['👪', '💒', '✈️', '🤝', '📁', '🏠', '🎉', '📸', '🌍', '🎓', '💝', '🏖️'];

function getRoleBadge(role: string) {
    switch (role) {
        case 'admin':
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                    <Crown className="w-3 h-3" /> Admin
                </span>
            );
        case 'contributor':
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black uppercase tracking-wider">
                    <Pencil className="w-3 h-3" /> Contributor
                </span>
            );
        case 'viewer':
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-black uppercase tracking-wider">
                    <Eye className="w-3 h-3" /> Viewer
                </span>
            );
        default:
            return null;
    }
}

// ── Create Vault Modal ─────────────────────────────────────────
const CreateVaultModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreated: (vault: any) => void;
}> = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('family');
    const [color, setColor] = useState('#6366f1');
    const [emoji, setEmoji] = useState('👪');
    const [creating, setCreating] = useState(false);
    const { toast } = useToast();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        try {
            setCreating(true);
            setError('');
            const res = await vaultAPI.create({ name, description, category, color, emoji });
            onCreated(res.data.data);
            toast({
                title: "Vault Initialized",
                description: `"${name}" repository is now online.`
            });
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create vault');
            toast({
                title: "Protocol Failed",
                description: err.response?.data?.message || "Failed to initialize vault.",
                variant: "destructive"
            });
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-[3rem] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
            >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-indigo-50 border border-indigo-100 shadow-sm" style={{ color }}>
                            <span>{emoji}</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Family Vault</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initialize Collective Sanctuary</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:rotate-90">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto no-scrollbar">
                    {error && (
                        <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-xs uppercase tracking-widest">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">Vault Designation</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(''); }}
                                placeholder="e.g. The Legacy Foundation"
                                className="w-full h-16 px-6 bg-slate-50/50 border border-slate-100 rounded-2xl text-lg font-black text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">Legacy Mission</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Define the shared purpose of this vault..."
                                rows={3}
                                className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Icon Identification</label>
                        <div className="grid grid-cols-6 gap-3">
                            {EMOJIS.map((e) => (
                                <button
                                    key={e}
                                    onClick={() => setEmoji(e)}
                                    className={`w-full aspect-square rounded-2xl text-xl flex items-center justify-center transition-all border ${emoji === e ? 'bg-indigo-50 border-indigo-200 shadow-xl' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Thematic Pulse</label>
                        <div className="grid grid-cols-3 gap-3">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setCategory(cat.id); setColor(cat.color); setEmoji(cat.emoji); }}
                                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === cat.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-white hover:border-slate-200'}`}
                                >
                                    <cat.icon className="w-4 h-4" /> {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Vibrancy Filter</label>
                        <div className="flex items-center justify-between gap-3">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-10 h-10 rounded-2xl transition-all ${color === c ? 'scale-125 shadow-xl ring-4 ring-indigo-50' : 'hover:scale-110 opacity-60 hover:opacity-100'}`}
                                    style={{ background: c }}
                                >
                                    {color === c && <div className="w-2 h-2 rounded-full bg-white mx-auto shadow-sm" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-6">
                    <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel Protocol</button>
                    <button
                        onClick={handleCreate}
                        disabled={creating || !name.trim()}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-30 disabled:translate-y-0"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialize Vault'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────
// Family Vaults Page
// ────────────────────────────────────────────────────────────────

const FamilyVaults: React.FC = () => {
    const { user } = useAuth() as any;
    const [vaults, setVaults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const { toast } = useToast();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const fetchVaults = useCallback(async () => {
        try {
            setLoading(true);
            const res = await vaultAPI.getMyVaults();
            setVaults(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to initialize collective sync');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVaults();
    }, [fetchVaults]);

    const handleVaultCreated = (vault: any) => {
        setVaults((prev) => [vault, ...prev]);
    };

    const getMyRole = (vault: any) => {
        const member = vault.members?.find(
            (m: any) => (m.userId?._id || m.userId) === user?.id
        );
        return member?.role || 'viewer';
    };

    const filteredVaults = vaults.filter((v) => {
        const matchesSearch = !searchQuery || v.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || v.category?.toLowerCase() === activeCategory.toLowerCase();
        return matchesSearch && matchesCategory;
    });

    const totalMemories = vaults.reduce((sum, v) => sum + (v.stats?.totalMemories || 0), 0);
    const totalMembers = new Set(vaults.flatMap((v) => v.members?.map((m: any) => m.userId?._id || m.userId) || [])).size;

    return (
        <DashboardLayout>
            <div className="min-h-screen space-y-12 pb-20">

                {/* ── Hero Header ──────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-100/50 p-8 sm:p-16 mb-12 group"
                >
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] -ml-32 -mb-32" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] opacity-[0.03]" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                        <div className="max-w-3xl">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-3 px-5 py-2 bg-indigo-50 rounded-full border border-indigo-100 mb-8 w-fit"
                            >
                                <Globe className="w-4 h-4 text-indigo-500" />
                                <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em]">
                                    Collective Sanctuary
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl sm:text-7xl font-black text-slate-900 mb-8 leading-[1.05] tracking-tight"
                            >
                                Shared <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient">
                                    Family Vaults
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-500 text-xl max-w-2xl mb-12 leading-relaxed font-medium"
                            >
                                A private digital heirloom for your inner circle. Securely store, collaborate, and pass down shared memories for generations.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-wrap items-center gap-8"
                            >
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="group relative flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 active:scale-95 transition-all duration-300"
                                >
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    <span>Create Vault</span>
                                    <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="w-12 h-12 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center text-[10px] font-black text-slate-400">
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                        <div className="w-12 h-12 rounded-full bg-indigo-600 border-4 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                            +{totalMembers}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nodes Synchronized</div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="hidden xl:flex relative">
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { label: 'Vaults', val: vaults.length, icon: Vault, color: 'text-indigo-500' },
                                    { label: 'Assets', val: totalMemories, icon: ImageIcon, color: 'text-purple-500' },
                                    { label: 'Nodes', val: totalMembers, icon: Users, color: 'text-pink-500' },
                                    { label: 'Integrity', val: '100%', icon: Shield, color: 'text-emerald-500' },
                                ].map((s, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ y: -5 }}
                                        className="bg-white border border-slate-100 shadow-xl shadow-indigo-100/20 rounded-[2.5rem] p-8 min-w-[160px] text-center group/stat"
                                    >
                                        <s.icon className={`w-8 h-8 ${s.color} mx-auto mb-4 group-hover/stat:rotate-12 transition-transform`} />
                                        <div className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">{s.val}</div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {error && (
                    <div className="flex items-center gap-4 px-8 py-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-600 font-bold text-xs uppercase tracking-widest animate-pulse">
                        <AlertCircle className="w-5 h-5" /> {error}
                    </div>
                )}

                {/* ── Search & Filter ── */}
                {!loading && vaults.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 bg-slate-50 p-4 rounded-[2.5rem] border border-slate-100">
                        <div className="relative group w-full md:max-w-xl">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Locate specific collective frequencies..."
                                className="w-full h-16 pl-16 pr-6 bg-white border border-slate-200/50 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-0 px-2">
                            {['All', 'Family', 'Friends', 'Wedding', 'Project', 'Trip'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveCategory(tab)}
                                    className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === tab
                                        ? 'bg-slate-900 text-white shadow-xl'
                                        : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200 shadow-sm'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Vault Grid ───────────────────────────────────── */}
                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-slate-50 rounded-[3rem] border border-slate-100 h-[400px] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        <AnimatePresence>
                            {filteredVaults.map((vault, idx) => {
                                const myRole = getMyRole(vault);
                                const memberAvatars = vault.members?.slice(0, 4) || [];
                                const extraMembers = (vault.members?.length || 0) - 4;
                                const catConfig = CATEGORIES.find((c) => c.id === vault.category);

                                return (
                                    <motion.div
                                        key={vault._id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onMouseMove={handleMouseMove}
                                        className="group relative bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-indigo-100/5 overflow-hidden transition-all duration-500 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-200/20 flex flex-col h-[480px] hover:-translate-y-2"
                                    >
                                        <div
                                            className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                            style={{
                                                background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${vault.color || '#6366f1'}08, transparent 40%)`
                                            }}
                                        />

                                        <div className="p-10 flex flex-col h-full relative z-10">
                                            <div className="flex items-start justify-between mb-10">
                                                <div className="relative">
                                                    <div className="w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-4xl shadow-xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-110" style={{ backgroundColor: `${vault.color || '#6366f1'}10`, border: `1px solid ${vault.color || '#6366f1'}20` }}>
                                                        <span className="relative z-10">{vault.emoji || '👪'}</span>
                                                    </div>
                                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border border-slate-50 shadow-md flex items-center justify-center">
                                                        <Shield className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3 text-right">
                                                    {catConfig && (
                                                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                                            {catConfig.label}
                                                        </span>
                                                    )}
                                                    <div className="flex -space-x-3">
                                                        {memberAvatars.map((member: any, i: number) => (
                                                            <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 overflow-hidden shadow-sm">
                                                                {member.userId?.avatar ? <img src={member.userId.avatar} className="w-full h-full object-cover" /> : getInitials(member.userId?.name || member.userId?.email)}
                                                            </div>
                                                        ))}
                                                        {extraMembers > 0 && <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[8px] font-black text-white shadow-lg">+{extraMembers}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-grow space-y-4">
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {vault.name}
                                                </h3>
                                                <p className="text-slate-500 text-sm line-clamp-3 font-medium leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                                                    {vault.description || 'A timeless sanctuary for your collective memories and shared digital legacy.'}
                                                </p>

                                                <div className="flex items-center gap-8 pt-6">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">System Assets</span>
                                                        <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                                            <ImageIcon className="w-4 h-4 text-indigo-500" /> {vault.stats?.totalMemories || 0}
                                                        </div>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-100" />
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Last Pulse</span>
                                                        <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-tighter">
                                                            <Activity className="w-4 h-4 text-purple-500" /> Active
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                                                {getRoleBadge(myRole)}
                                                <Link
                                                    to={`/vaults/${vault._id}`}
                                                    onClick={() => {
                                                        toast({
                                                            title: "Establishing Connection",
                                                            description: `Synchronizing with ${vault.name}...`
                                                        });
                                                    }}
                                                    className="group/btn relative flex items-center gap-3 px-6 py-3 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-sm"
                                                >
                                                    Enter Vault
                                                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            <motion.button
                                onClick={() => setShowCreate(true)}
                                className="flex flex-col items-center justify-center gap-8 p-12 rounded-[3rem] border-4 border-dashed border-slate-100 hover:border-indigo-400/30 hover:bg-indigo-50/30 transition-all duration-500 group min-h-[480px] relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-24 h-24 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-2xl">
                                    <Plus className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="text-center relative">
                                    <span className="block text-2xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">Initialize New Void</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect Collective Frequencies</span>
                                </div>
                            </motion.button>
                        </AnimatePresence>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredVaults.length === 0 && (
                    <div className="text-center py-32 bg-slate-50 rounded-[3rem] border border-slate-100">
                        <Vault className="w-20 h-20 text-slate-200 mx-auto mb-8 animate-pulse" />
                        <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">No Active Frequencies</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Search Protocol: "{searchQuery}"</p>
                        <button onClick={() => setSearchQuery('')} className="mt-8 px-10 py-4 bg-white border border-slate-200 hover:bg-slate-900 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Clear Search Filter</button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showCreate && <CreateVaultModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={handleVaultCreated} />}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 6s infinite ease;
                }
            `}</style>
        </DashboardLayout>
    );
};

export default FamilyVaults;
