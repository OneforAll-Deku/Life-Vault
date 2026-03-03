
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { vaultAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
    Users,
    Loader2,
    AlertCircle,
    Check,
    Image as ImageIcon,
    ArrowRight,
    LogIn,
    Shield,
    Heart,
    Eye,
    Pencil,
} from 'lucide-react';

const JoinVault: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const { user, isAuthenticated } = useAuth() as any;
    const navigate = useNavigate();

    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                setLoading(true);
                const res = await vaultAPI.getInviteInfo(code!);
                setInfo(res.data.data);
            } catch (err: any) {
                setError(
                    err.response?.data?.message || 'This invite link is invalid or has expired'
                );
            } finally {
                setLoading(false);
            }
        };
        if (code) fetchInfo();
    }, [code]);

    const handleJoin = async () => {
        try {
            setJoining(true);
            setError(null);
            const res = await vaultAPI.joinVault(code!);
            setJoined(true);
            setTimeout(() => {
                navigate(`/vaults/${res.data.data._id}`);
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to join');
        } finally {
            setJoining(false);
        }
    };

    const vaultColor = info?.color || '#6366f1';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/40 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
                    style={{ background: `radial-gradient(circle, ${vaultColor}, transparent 70%)` }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.04]"
                    style={{ background: `radial-gradient(circle, #8b5cf6, transparent 70%)` }}
                />
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
                        backgroundSize: '32px 32px',
                    }}
                />
            </div>

            {/* Logo / Branding */}
            <Link
                to="/"
                className="relative z-10 flex items-center gap-2.5 mb-8 group"
                style={{ animation: 'fadeIn 400ms ease-out' }}
            >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-xl group-hover:shadow-indigo-500/30 group-hover:scale-105 transition-all duration-200">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-gray-900 tracking-tight">
                    Block<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Pix</span>
                </span>
            </Link>

            <div className="w-full max-w-md relative z-10">
                {/* ── Loading ──────────────────────────────────────── */}
                {loading && (
                    <div className="text-center py-16" style={{ animation: 'fadeIn 300ms ease-out' }}>
                        <div className="relative w-16 h-16 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                            </div>
                        </div>
                        <p className="text-gray-500 font-semibold text-sm">Loading invite details...</p>
                        <p className="text-gray-400 text-xs mt-1">Verifying your invitation link</p>
                    </div>
                )}

                {/* ── Error (no info) ──────────────────────────────── */}
                {!loading && error && !info && (
                    <div
                        className="bg-white rounded-3xl shadow-2xl shadow-black/5 border border-gray-100 p-8 text-center"
                        style={{ animation: 'slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Invalid Invite</h2>
                        <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">{error}</p>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/vaults"
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-500/30 transition-all text-center"
                            >
                                Go to My Vaults
                            </Link>
                            <Link
                                to="/"
                                className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-all text-center"
                            >
                                Go to Home
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── Success (Joined) ─────────────────────────────── */}
                {!loading && joined && (
                    <div
                        className="bg-white rounded-3xl shadow-2xl shadow-black/5 border border-gray-100 p-8 text-center"
                        style={{ animation: 'scaleIn 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div
                                className="absolute inset-0 rounded-3xl opacity-20 animate-ping"
                                style={{ background: vaultColor }}
                            />
                            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                <Check className="w-10 h-10 text-emerald-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're In! 🎉</h2>
                        <p className="text-gray-500 text-sm">Redirecting to the vault...</p>
                        <div className="mt-6">
                            <div className="w-20 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        background: `linear-gradient(90deg, ${vaultColor}, #8b5cf6)`,
                                        animation: 'progressBar 1.5s ease-in-out',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Invite Info Card ──────────────────────────────── */}
                {!loading && info && !joined && (
                    <div
                        className="bg-white rounded-3xl shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden"
                        style={{ animation: 'slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        {/* Hero banner with vault color */}
                        <div
                            className="relative h-32 overflow-hidden"
                            style={{ background: `linear-gradient(135deg, ${vaultColor}, ${vaultColor}bb, ${vaultColor}77)` }}
                        >
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl" />

                            {/* Floating heart decorations */}
                            <Heart className="absolute top-4 right-6 w-5 h-5 text-white/20" />
                            <Heart className="absolute bottom-6 right-16 w-3 h-3 text-white/15" />

                            {/* Centered emoji orb */}
                            <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2 z-10">
                                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl border-4 border-white">
                                    {info.emoji || '👪'}
                                </div>
                            </div>
                        </div>

                        <div className="pt-14 px-8 pb-8 text-center space-y-6">
                            {/* Title */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider mb-1.5"
                                    style={{ color: vaultColor }}>
                                    You've been invited to
                                </p>
                                <h1 className="text-2xl font-extrabold text-gray-900">
                                    {info.vaultName}
                                </h1>
                                {info.description && (
                                    <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                                        {info.description}
                                    </p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-center gap-4">
                                <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                        <p className="text-xl font-extrabold text-gray-900">{info.memberCount}</p>
                                    </div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Members</p>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                                        <p className="text-xl font-extrabold text-gray-900">{info.memoryCount}</p>
                                    </div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Memories</p>
                                </div>
                            </div>

                            {/* Role Info */}
                            <div
                                className="rounded-2xl px-5 py-4 border-2 transition-all"
                                style={{
                                    background: `${vaultColor}06`,
                                    borderColor: `${vaultColor}15`,
                                }}
                            >
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    You'll join as
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    {info.role === 'contributor' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                            <Pencil className="w-3.5 h-3.5" />
                                            Contributor — can upload & view memories
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                                            <Eye className="w-3.5 h-3.5" />
                                            Viewer — can view memories
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Created by */}
                            {info.createdBy && (
                                <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                                    <Heart className="w-3 h-3" />
                                    Created by{' '}
                                    <span className="font-semibold text-gray-600">
                                        {info.createdBy.name}
                                    </span>
                                </p>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                                </div>
                            )}

                            {/* CTA */}
                            {isAuthenticated ? (
                                <button
                                    onClick={handleJoin}
                                    disabled={joining}
                                    className="w-full py-4 text-white rounded-2xl font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
                                    style={{
                                        background: `linear-gradient(135deg, ${vaultColor}, ${vaultColor}cc)`,
                                        boxShadow: `0 8px 24px ${vaultColor}30`,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = `0 12px 32px ${vaultColor}40`;
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = `0 8px 24px ${vaultColor}30`;
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {joining ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Users className="w-5 h-5" />
                                            Join Vault
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <Link
                                        to={`/login?redirect=/vault/join/${code}`}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <LogIn className="w-5 h-5" />
                                        Login to Join
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                    <p className="text-xs text-gray-400">
                                        You need an account to join this vault
                                    </p>
                                </div>
                            )}

                            {/* Authenticated user info */}
                            {isAuthenticated && user && (
                                <div className="flex items-center justify-center gap-2 pt-1">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Joining as <span className="font-semibold text-gray-600">{user.name || user.email}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Security note */}
                <div className="text-center mt-6" style={{ animation: 'fadeIn 600ms ease-out' }}>
                    <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        Protected by Block Pix's end-to-end encryption
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes progressBar {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default JoinVault;
