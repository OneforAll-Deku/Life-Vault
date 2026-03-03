
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { vaultAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/services/api';
import { useMemories } from '@/hooks/useMemories';
import {
    Users,
    ArrowLeft,
    Plus,
    Copy,
    Check,
    Crown,
    Eye,
    Pencil,
    Settings,
    UserPlus,
    Image as ImageIcon,
    Video,
    Music,
    FileText,
    File,
    Loader2,
    AlertCircle,
    X,
    Link2,
    Trash2,
    Share2,
    Shield,
    Clock,
    MoreHorizontal,
    LogOut,
    Heart,
    CheckCircle2,
    Search,
    Upload,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getCategoryIcon(cat: string) {
    switch (cat) {
        case 'photo': return <ImageIcon className="w-4 h-4" />;
        case 'video': return <Video className="w-4 h-4" />;
        case 'audio': return <Music className="w-4 h-4" />;
        case 'document': return <FileText className="w-4 h-4" />;
        default: return <File className="w-4 h-4" />;
    }
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const secs = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRoleBadge(role: string, size: 'sm' | 'md' = 'sm') {
    const cls = size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]';
    switch (role) {
        case 'admin':
            return (
                <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${cls}`}
                    style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e' }}>
                    <Crown className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} /> Admin
                </span>
            );
        case 'contributor':
            return (
                <span className={`inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider ${cls}`}>
                    <Pencil className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} /> Contributor
                </span>
            );
        case 'viewer':
            return (
                <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 font-bold uppercase tracking-wider ${cls}`}>
                    <Eye className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} /> Viewer
                </span>
            );
        default:
            return null;
    }
}

// ── Skeleton Loader ────────────────────────────────────────────
const DetailSkeleton: React.FC = () => (
    <div className="space-y-6 pb-12 animate-pulse">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-200 to-gray-300 h-56" />
        <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 w-28 bg-gray-100 rounded-xl" />
            ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-gray-100 rounded" />
                        <div className="h-3 w-full bg-gray-50 rounded" />
                        <div className="h-3 w-1/3 bg-gray-50 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ── Invite Modal ───────────────────────────────────────────────
const InviteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    vaultId: string;
    vaultName: string;
}> = ({ isOpen, onClose, vaultId, vaultName }) => {
    const [role, setRole] = useState<'contributor' | 'viewer'>('contributor');
    const [maxUses, setMaxUses] = useState(10);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [inviteUrl, setInviteUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleGenerate = async () => {
        try {
            setCreating(true);
            setError('');
            const res = await vaultAPI.createInvite(vaultId, { role, maxUses, expiresInDays });
            setInviteUrl(res.data.data.inviteUrl);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create invite');
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        toast({
            title: "Link Copied",
            description: "Access credentials copied to clipboard."
        });
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}
                style={{ animation: 'fadeIn 200ms ease-out' }} />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full"
                style={{ animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Invite Members</h2>
                            <p className="text-xs text-gray-500">to {vaultName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}

                    {/* Role selector */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-2">Invite as</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setRole('contributor')}
                                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${role === 'contributor'
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                <Pencil className="w-4 h-4" />
                                <div className="text-left">
                                    <p className="font-semibold">Contributor</p>
                                    <p className="text-[10px] opacity-70">Can upload memories</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setRole('viewer')}
                                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${role === 'viewer'
                                    ? 'border-gray-400 bg-gray-50 text-gray-700 shadow-sm'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                <Eye className="w-4 h-4" />
                                <div className="text-left">
                                    <p className="font-semibold">Viewer</p>
                                    <p className="text-[10px] opacity-70">View only</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Settings Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-2">Max Uses</label>
                            <select
                                value={maxUses}
                                onChange={(e) => setMaxUses(Number(e.target.value))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                            >
                                <option value={1}>1 use</option>
                                <option value={5}>5 uses</option>
                                <option value={10}>10 uses</option>
                                <option value={25}>25 uses</option>
                                <option value={100}>Unlimited</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-2">Expires In</label>
                            <select
                                value={expiresInDays}
                                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                            >
                                <option value={1}>1 day</option>
                                <option value={3}>3 days</option>
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                            </select>
                        </div>
                    </div>

                    {/* Generate / Result */}
                    {!inviteUrl ? (
                        <button
                            onClick={handleGenerate}
                            disabled={creating}
                            className="w-full px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                            Generate Invite Link
                        </button>
                    ) : (
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-700 mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <p className="text-xs font-bold">Link generated successfully!</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteUrl}
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-mono"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${copied
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                        }`}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <button
                                onClick={() => setInviteUrl('')}
                                className="text-xs text-indigo-600 font-semibold hover:underline"
                            >
                                Generate another
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
};

// ── Add Memory Modal ───────────────────────────────────────────
const AddMemoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    vaultId: string;
    onAdded: () => void;
}> = ({ isOpen, onClose, vaultId, onAdded }) => {
    const { memories, createMemory } = useMemories({});
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [adding, setAdding] = useState(false);
    const { toast } = useToast();
    const [error, setError] = useState('');
    const [searchQ, setSearchQ] = useState('');

    // New Direct Upload State
    const [mode, setMode] = useState<'select' | 'upload'>('select');
    const [newFile, setNewFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('photo');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setMode('select');
            setNewFile(null);
            setTitle('');
            setCaption('');
            setError('');
            return;
        }
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleAdd = async () => {
        if (mode === 'select' && !selectedId) return;
        if (mode === 'upload' && (!newFile || !title.trim())) {
            setError('Please provide a file and title');
            return;
        }

        try {
            setAdding(true);
            setError('');

            let memoryId = selectedId;

            if (mode === 'upload' && newFile) {
                const { fileToBase64 } = await import('@/services/api');
                const base64 = await fileToBase64(newFile);
                const uploadRes = await createMemory({
                    title: title.trim(),
                    category,
                    fileData: base64,
                    fileName: newFile.name,
                    fileType: newFile.type,
                    storeOnChain: false
                });

                if (uploadRes.success) {
                    memoryId = uploadRes.data.memory._id;
                } else {
                    throw new Error(uploadRes.message || 'Upload failed');
                }
            }

            if (!memoryId) throw new Error('No memory selected/uploaded');

            await vaultAPI.addMemory(vaultId, { memoryId, caption });
            onAdded();
            toast({
                title: "Memory Synchronized",
                description: `Fragment added to collective sanctuary.`
            });
            setSelectedId(null);
            setNewFile(null);
            setCaption('');
            setSearchQ('');
            onClose();
        } catch (err: any) {
            const errMsg = err.response?.data?.message || err.message || 'Failed to add memory';
            setError(errMsg);
            toast({
                title: "Sync Error",
                description: errMsg,
                variant: "destructive"
            });
        } finally {
            setAdding(false);
        }
    };

    const filteredMemories = (memories || []).filter((m: any) =>
        !searchQ || m.title?.toLowerCase().includes(searchQ.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}
                style={{ animation: 'fadeIn 200ms ease-out' }} />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
                style={{ animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Add to Vault</h2>
                            <p className="text-xs text-gray-500">Collectively preserve your files</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 animate-pulse">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}

                    {/* Tab Selector */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setMode('select')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'select' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Select Existing
                        </button>
                        <button
                            onClick={() => setMode('upload')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Upload New
                        </button>
                    </div>

                    {mode === 'select' ? (
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQ}
                                    onChange={(e) => setSearchQ(e.target.value)}
                                    placeholder="Search your memories..."
                                    className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                />
                            </div>

                            {/* Memory List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {filteredMemories.length > 0 ? (
                                    filteredMemories.map((mem: any) => (
                                        <button
                                            key={mem._id}
                                            onClick={() => setSelectedId(mem._id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${selectedId === mem._id
                                                ? 'bg-indigo-50 border-2 border-indigo-400 shadow-sm'
                                                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${selectedId === mem._id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                {getCategoryIcon(mem.category)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{mem.title}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                                    {mem.category} · {formatBytes(mem.fileSize)}
                                                </p>
                                            </div>
                                            {selectedId === mem._id && <Check className="w-5 h-5 text-indigo-600" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-50">
                                        <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No memories found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${newFile ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setNewFile(file);
                                        if (file && !title) {
                                            const baseName = file.name.split('.').slice(0, -1).join('.');
                                            setTitle(baseName);
                                        }
                                    }}
                                />
                                {newFile ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-2 shadow-sm">
                                            {newFile.type.startsWith('image/') ? <ImageIcon className="w-6 h-6" /> : <File className="w-6 h-6" />}
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-xs">{newFile.name}</p>
                                        <p className="text-xs text-gray-500">{formatBytes(newFile.size)}</p>
                                        <button onClick={(e) => { e.stopPropagation(); setNewFile(null); }} className="mt-2 text-xs text-red-500 font-bold hover:underline">Remove</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-300">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-600">Click or drag file to upload</p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold font-mono">Max size: 50MB</p>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Name your memory..."
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white font-medium"
                                    >
                                        <option value="photo">Photo</option>
                                        <option value="video">Video</option>
                                        <option value="audio">Audio</option>
                                        <option value="document">Document</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Caption (Shared) */}
                    {(selectedId || newFile) && (
                        <div className="pt-2 animate-in fade-in duration-300">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Caption (optional)</label>
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a memory note for others..."
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50/50">
                    <button onClick={onClose} disabled={adding} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={adding || (mode === 'select' ? !selectedId : (!newFile || !title.trim()))}
                        className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {mode === 'select' ? 'Add Memory' : 'Upload & Add'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
            `}</style>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────
// Vault Detail Page
// ────────────────────────────────────────────────────────────────

const FamilyVaultDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth() as any;
    const navigate = useNavigate();
    const { toast } = useToast();

    const [vault, setVault] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'timeline' | 'members' | 'settings' | 'activity'>('timeline');
    const [showInvite, setShowInvite] = useState(false);
    const [showAddMemory, setShowAddMemory] = useState(false);
    const [memberMenuId, setMemberMenuId] = useState<string | null>(null);

    // Activity Feed state
    const [activities, setActivities] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);

    const fetchVault = useCallback(async () => {
        try {
            setLoading(true);
            const res = await vaultAPI.getVault(id!);
            setVault(res.data.data);
            setError(''); // Added this line
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load vault');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchActivity = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingActivity(true);
            const res = await vaultAPI.getActivity(id);
            setActivities(res.data.data);
        } catch (err) {
            console.error('Failed to fetch activity:', err);
        } finally {
            setLoadingActivity(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchVault();
            fetchActivity();
        }
    }, [id, fetchVault, fetchActivity]);

    const tabs = useMemo(() => {
        const base = [
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'activity', label: 'Activity', icon: Heart },
            { id: 'members', label: 'Members', icon: Users },
        ];
        if (vault?.members?.find((m: any) => m.userId?._id === user?.id)?.role === 'admin') {
            base.push({ id: 'settings', label: 'Settings', icon: Settings });
        }
        return base;
    }, [vault, user]);

    const myRole = useMemo(() => {
        if (!vault || !user) return null;
        const member = vault.members?.find(
            (m: any) => (m.userId?._id || m.userId) === user.id
        );
        return member?.role || null;
    }, [vault, user]);

    const isAdmin = myRole === 'admin';
    const canUpload = myRole === 'admin' || myRole === 'contributor';

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            await vaultAPI.updateMemberRole(id!, { memberId, role: newRole });
            fetchVault();
            toast({
                title: "Credentials Updated",
                description: `Node clearance adjusted to ${newRole}.`
            });
            setMemberMenuId(null);
        } catch (err: any) {
            toast({
                title: "Adjustment Failed",
                description: err.response?.data?.message || "Failed to update member role.",
                variant: "destructive"
            });
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Remove this member from the vault?')) return;
        try {
            await vaultAPI.removeMember(id!, memberId);
            fetchVault();
            toast({
                title: "Node De-synchronized",
                description: "Member access revoked from sanctuary."
            });
            setMemberMenuId(null);
        } catch (err: any) {
            toast({
                title: "Revocation Failed",
                description: err.response?.data?.message || "Failed to remove member.",
                variant: "destructive"
            });
        }
    };

    const handleRemoveMemory = async (memoryId: string) => {
        if (!confirm('Remove this memory from the vault?')) return;
        try {
            await vaultAPI.removeMemory(id!, memoryId);
            fetchVault();
            toast({
                title: "Memory Purged",
                description: "Fragment removed from collective repository."
            });
        } catch (err: any) {
            toast({
                title: "Purge Failed",
                description: err.response?.data?.message || "Failed to remove memory.",
                variant: "destructive"
            });
        }
    };

    const handleLeave = async () => {
        if (!confirm('Leave this vault? You will lose access.')) return;
        try {
            await vaultAPI.removeMember(id!, user.id);
            navigate('/vaults');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to leave');
        }
    };

    // ── Loading State ──────────────────────────────────────────
    if (loading) {
        return (
            <DashboardLayout>
                <DetailSkeleton />
            </DashboardLayout>
        );
    }

    // ── Error State ────────────────────────────────────────────
    if (error || !vault) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mb-6">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {error || 'Vault not found'}
                    </h2>
                    <p className="text-gray-500 mb-6">This vault may have been removed or you don't have access.</p>
                    <Link
                        to="/vaults"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Vaults
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const sortedMemories = [...(vault.memories || [])].sort(
        (a: any, b: any) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );

    const vaultColor = vault.color || '#6366f1';

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-12">
                {/* ── Back Link ─────────────────────────────────────── */}
                <Link
                    to="/vaults"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Vaults
                </Link>

                {/* ── Hero Banner ───────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${vaultColor}, ${vaultColor}cc, ${vaultColor}88)` }}>
                    <div className="absolute inset-0 bg-black/15" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl" />

                    <div className="relative z-10 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                            <div className="flex items-start gap-4">
                                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-4xl flex-shrink-0"
                                    style={{ width: 72, height: 72 }}>
                                    {vault.emoji || '👪'}
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
                                        {vault.name}
                                    </h1>
                                    {vault.description && (
                                        <p className="text-white/70 text-sm max-w-lg mb-3">
                                            {vault.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {getRoleBadge(myRole || 'viewer', 'md')}
                                        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-xs font-semibold">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                {vault.members?.length} member{vault.members?.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="w-px h-3 bg-white/30" />
                                            <span className="flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                {vault.stats?.totalMemories || 0} memories
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {canUpload && (
                                    <button
                                        onClick={() => setShowAddMemory(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                                    >
                                        <Plus className="w-4 h-4" /> Add Memory
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowInvite(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-sm border border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-white/25 transition-all duration-200"
                                >
                                    <Share2 className="w-4 h-4" /> Invite
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ──────────────────────────────────────────── */}
                <div className="flex items-center gap-1 p-1.5 bg-gray-100/80 rounded-2xl w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-white text-gray-900 shadow-md shadow-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'members' && (
                                    <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full ml-0.5">
                                        {vault.members?.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Timeline Tab ─────────────────────────────────── */}
                {activeTab === 'timeline' && (
                    <div>
                        {sortedMemories.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border-2 border-gray-100">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-6">
                                    <ImageIcon className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Memories Yet</h3>
                                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                                    Start building your shared collection by adding memories from your personal vault.
                                </p>
                                {canUpload && (
                                    <button
                                        onClick={() => setShowAddMemory(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-200"
                                    >
                                        <Plus className="w-4 h-4" /> Add First Memory
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Vertical timeline connector */}
                                <div className="absolute left-[24px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-gray-200 via-gray-100 to-transparent hidden sm:block" />

                                <div className="space-y-4">
                                    {sortedMemories.map((entry: any, index: number) => {
                                        const mem = entry.memoryId;
                                        if (!mem) return null;
                                        const addedBy = entry.addedBy;

                                        return (
                                            <div
                                                key={entry._id || index}
                                                className="group relative bg-white rounded-2xl border-2 border-gray-100 p-5 hover:shadow-xl hover:shadow-black/5 hover:border-gray-200 transition-all duration-300"
                                                style={{ animationDelay: `${index * 30}ms` }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Category icon */}
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 transition-transform group-hover:scale-110"
                                                        style={{ background: `${vaultColor}12`, color: vaultColor }}
                                                    >
                                                        {getCategoryIcon(mem.category)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <h4 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                                                    {mem.title}
                                                                </h4>
                                                                {entry.caption && (
                                                                    <p className="text-sm text-gray-500 mt-0.5 italic line-clamp-2">
                                                                        "{entry.caption}"
                                                                    </p>
                                                                )}
                                                                {mem.description && !entry.caption && (
                                                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                                                        {mem.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {(isAdmin || addedBy?._id === user?.id) && (
                                                                <button
                                                                    onClick={() => handleRemoveMemory(mem._id)}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Remove from vault"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Meta row */}
                                                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                                                                    {getInitials(addedBy?.name || addedBy?.email)}
                                                                </div>
                                                                <span className="text-xs text-gray-500 font-medium">{addedBy?.name || 'Member'}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-300">·</span>
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {timeAgo(entry.addedAt)}
                                                            </span>
                                                            <span className="text-xs text-gray-300">·</span>
                                                            <span className="text-xs text-gray-400">{formatBytes(mem.fileSize)}</span>
                                                            {mem.isOnChain && (
                                                                <>
                                                                    <span className="text-xs text-gray-300">·</span>
                                                                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                        <Shield className="w-3 h-3" /> On-Chain
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Activity Tab ──────────────────────────────────── */}
                {activeTab === 'activity' && (
                    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden min-h-[400px]">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Recent Activity</h3>
                            <p className="text-xs text-gray-500">Stay updated with the latest changes</p>
                        </div>

                        {loadingActivity ? (
                            <div className="p-12 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                                <p className="text-sm text-gray-400">Loading activity...</p>
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Heart className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">No activity yet</p>
                                <p className="text-xs text-gray-400 mt-1">Activities will appear as members contribute</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {activities.map((act, i) => (
                                    <div key={i} className="px-6 py-4 flex gap-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                            {act.user?.avatar ? (
                                                <img src={act.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-indigo-600">{getInitials(act.user?.name)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm text-gray-900">
                                                    <span className="font-bold">{act.user?.name || 'Unknown User'}</span>
                                                    {' added a memory: '}
                                                    <span className="font-semibold text-indigo-600">"{act.memory?.title || 'Untitled'}"</span>
                                                </p>
                                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                    {timeAgo(act.timestamp)}
                                                </span>
                                            </div>
                                            {act.caption && (
                                                <p className="mt-1 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg italic border-l-2 border-indigo-200">
                                                    "{act.caption}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Members Tab ──────────────────────────────────── */}
                {activeTab === 'members' && (
                    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900">Members ({vault.members?.length})</h3>
                                <p className="text-xs text-gray-500">Manage who has access to this vault</p>
                            </div>
                            <button
                                onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                Invite
                            </button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {vault.members?.map((member: any) => {
                                const u = member.userId;
                                const isCreator = vault.createdBy?._id === u?._id;
                                const isSelf = u?._id === user?.id;

                                return (
                                    <div
                                        key={u?._id || member._id}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                {u?.avatar ? (
                                                    <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    getInitials(u?.name || u?.email)
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {u?.name || 'Member'}
                                                        {isSelf && <span className="text-gray-400 font-normal"> (You)</span>}
                                                    </p>
                                                    {isCreator && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e' }}>
                                                            <Heart className="w-2.5 h-2.5" /> Creator
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400">{u?.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {getRoleBadge(member.role, 'md')}

                                            {isAdmin && !isSelf && !isCreator && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setMemberMenuId(memberMenuId === u?._id ? null : u?._id)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                    {memberMenuId === u?._id && (
                                                        <>
                                                            <div className="fixed inset-0 z-30" onClick={() => setMemberMenuId(null)} />
                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-200/50 py-1.5 z-40"
                                                                style={{ animation: 'fadeIn 150ms ease-out' }}>
                                                                <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                    Change Role
                                                                </p>
                                                                {['admin', 'contributor', 'viewer'].map((r) => (
                                                                    <button
                                                                        key={r}
                                                                        onClick={() => handleRoleChange(u?._id, r)}
                                                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${member.role === r
                                                                            ? 'text-indigo-600 font-semibold bg-indigo-50'
                                                                            : 'text-gray-700 hover:bg-gray-50'
                                                                            }`}
                                                                    >
                                                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                                                        {member.role === r && ' ✓'}
                                                                    </button>
                                                                ))}
                                                                <hr className="my-1 border-gray-100" />
                                                                <button
                                                                    onClick={() => handleRemoveMember(u?._id)}
                                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                                >
                                                                    Remove Member
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Leave Vault */}
                        {!isAdmin && (
                            <div className="px-6 py-4 border-t border-gray-100">
                                <button
                                    onClick={handleLeave}
                                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors group"
                                >
                                    <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                    Leave Vault
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Settings Tab (Admin Only) ────────────────────── */}
                {activeTab === 'settings' && isAdmin && (
                    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 space-y-6">
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Vault Settings</h3>
                            <p className="text-xs text-gray-500">Update your vault's name and description</p>
                        </div>

                        <VaultSettingsForm vault={vault} vaultColor={vaultColor} onUpdated={fetchVault} />

                        <hr className="border-gray-100" />

                        <div className="p-5 bg-red-50/50 border-2 border-red-100 rounded-2xl">
                            <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Danger Zone
                            </h4>
                            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                Archiving the vault will hide it from all members. This action can be undone by contacting support.
                            </p>
                            <button
                                onClick={async () => {
                                    if (!confirm('Archive this vault? Members will lose access.')) return;
                                    try {
                                        await vaultAPI.deleteVault(id!);
                                        toast({
                                            title: "Vault Archived",
                                            description: "Sanctuary has been moved to cold storage."
                                        });
                                        navigate('/vaults');
                                    } catch (err: any) {
                                        toast({
                                            title: "Archive Failed",
                                            description: err.response?.data?.message || "Failed to archive sanctuary.",
                                            variant: "destructive"
                                        });
                                    }
                                }}
                                className="px-5 py-2.5 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
                            >
                                Archive Vault
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <InviteModal
                isOpen={showInvite}
                onClose={() => setShowInvite(false)}
                vaultId={id!}
                vaultName={vault.name}
            />
            <AddMemoryModal
                isOpen={showAddMemory}
                onClose={() => setShowAddMemory(false)}
                vaultId={id!}
                onAdded={fetchVault}
            />

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </DashboardLayout >
    );
};

// ── Settings Form ──────────────────────────────────────────────
const VaultSettingsForm: React.FC<{ vault: any; vaultColor: string; onUpdated: () => void }> = ({
    vault,
    vaultColor,
    onUpdated,
}) => {
    const [name, setName] = useState(vault.name);
    const [description, setDescription] = useState(vault.description || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaved(false);
            await vaultAPI.updateVault(vault._id, { name, description });
            onUpdated();
            setSaved(true);
            toast({
                title: "Parameters Updated",
                description: "Vault core configuration successfully modified."
            });
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            toast({
                title: "Update Failed",
                description: err.response?.data?.message || "Failed to save changes.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">Vault Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="px-6 py-2.5 text-white rounded-xl text-sm font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                    style={{
                        background: `linear-gradient(135deg, ${vaultColor}, ${vaultColor}cc)`,
                        boxShadow: !saving && name.trim() ? `0 4px 14px ${vaultColor}30` : undefined,
                    }}
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saved ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" /> Saved!
                        </>
                    ) : saving ? (
                        'Saving...'
                    ) : (
                        'Save Changes'
                    )}
                </button>
                {saved && (
                    <span className="text-xs text-emerald-600 font-semibold" style={{ animation: 'fadeIn 200ms ease-out' }}>
                        Changes saved successfully
                    </span>
                )}
            </div>
        </div>
    );
};

export default FamilyVaultDetail;
