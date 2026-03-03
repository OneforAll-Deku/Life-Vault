// file: src/pages/Analytics.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { analyticsAPI } from '@/services/api';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Shield,
    Lock,
    FileText,
    Image as ImageIcon,
    Video,
    Music,
    File,
    Flame,
    Calendar,
    Loader2,
    Sparkles,
    Activity,
    Layers,
    Database,
    Globe,
    Award,
    Archive,
    BarChart3
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from 'recharts';

/* ── Color tokens ──────────────────────────── */
const COLORS = {
    primary: { from: '#6366f1', via: '#8b5cf6', to: '#a855f7' },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
} as const;

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b'];
const HEATMAP_COLORS = ['#f1f5f9', '#e0e7ff', '#a5b4fc', '#6366f1', '#4338ca'];

/* ── Helpers ──────────────────────────────────── */
function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'photo': return <ImageIcon className="w-4 h-4" />;
        case 'video': return <Video className="w-4 h-4" />;
        case 'audio': return <Music className="w-4 h-4" />;
        case 'document': return <FileText className="w-4 h-4" />;
        default: return <File className="w-4 h-4" />;
    }
}

function getCategoryLabel(cat: string) {
    const map: Record<string, string> = { photo: 'Photos', video: 'Videos', audio: 'Audio', document: 'Documents', other: 'Other' };
    return map[cat] || cat;
}

function getHeatmapColor(count: number): string {
    if (count === 0) return HEATMAP_COLORS[0];
    if (count <= 1) return HEATMAP_COLORS[1];
    if (count <= 3) return HEATMAP_COLORS[2];
    if (count <= 5) return HEATMAP_COLORS[3];
    return HEATMAP_COLORS[4];
}

/* ── Custom Tooltip ───────────────────────────── */
const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4 min-w-[200px]">
            <p className="text-xs font-medium text-slate-400 mb-3">{label}</p>
            <div className="space-y-2">
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                            <span className="text-sm text-slate-600">{entry.name}</span>
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Analytics: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const res = await analyticsAPI.getAnalytics();
                setData(res.data.data);
            } catch (err: any) {
                console.error('Analytics fetch error:', err);
                setError(err.response?.data?.message || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const pieData = useMemo(() => {
        if (!data?.categoryBreakdown) return [];
        return data.categoryBreakdown.map((cat: any) => ({
            name: getCategoryLabel(cat._id || 'other'),
            value: cat.count,
            size: cat.totalSize,
            category: cat._id,
        }));
    }, [data]);

    const heatmapGrid = useMemo(() => {
        if (!data?.heatmap) return [];
        const hm = data.heatmap;
        const weeks: any[][] = [];
        let currentWeek: any[] = [];
        const firstDate = new Date(hm[0]?.date);
        const startPad = firstDate.getDay();
        for (let i = 0; i < startPad; i++) currentWeek.push(null);
        for (const day of hm) {
            currentWeek.push(day);
            if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }
        return weeks;
    }, [data]);

    const totalActiveDays = useMemo(() => {
        if (!data?.heatmap) return 0;
        return data.heatmap.filter((d: any) => d.count > 0).length;
    }, [data]);

    const heatmapMonths = useMemo(() => {
        if (!heatmapGrid.length) return [];
        const months: { label: string; col: number }[] = [];
        let lastMonth = '';
        heatmapGrid.forEach((week, weekIdx) => {
            for (const day of week) {
                if (day) {
                    const m = new Date(day.date).toLocaleString('en-US', { month: 'short' });
                    if (m !== lastMonth) { months.push({ label: m, col: weekIdx }); lastMonth = m; }
                    break;
                }
            }
        });
        return months;
    }, [heatmapGrid]);

    /* ── Loading State ──────────────────────── */
    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[70vh]">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-sm text-slate-500">Loading analytics...</p>
                </div>
            </DashboardLayout>
        );
    }

    /* ── Error State ──────────────────────── */
    if (error) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center max-w-md p-12 bg-white rounded-2xl border border-slate-100 shadow-lg">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Activity className="w-8 h-8 text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Failed to Load</h2>
                        <p className="text-sm text-slate-500 mb-8">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-[0.97]"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const { overview, timeline = [], streaks = { currentStreak: 0, longestStreak: 0 }, growthRate = 0 } = data;

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">

                {/* ── Hero Header ───────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-8 sm:p-12"
                >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Live Data</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">Analytics</h1>
                            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                                Track your memory storage, on-chain verification, activity trends, and overall growth.
                            </p>
                        </div>

                        <div className="px-6 py-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${growthRate >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {growthRate >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {growthRate >= 0 ? '+' : ''}{growthRate}%
                                </p>
                                <p className="text-slate-400 text-xs">Monthly growth</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Overview Metrics ────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { label: 'Total Memories', value: overview?.totalMemories || 0, icon: Archive, colors: 'from-indigo-600 to-purple-600' },
                        { label: 'Storage Used', value: formatBytes(overview?.totalSize || 0), icon: Database, colors: 'from-blue-600 to-cyan-600' },
                        { label: 'Verification Rate', value: `${overview?.verificationRate || 0}%`, icon: Shield, colors: 'from-emerald-600 to-teal-600' },
                        { label: 'Encryption Rate', value: `${overview?.encryptionRate || 0}%`, icon: Lock, colors: 'from-amber-600 to-orange-600' },
                    ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-slate-200 transition-all"
                            >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.colors} flex items-center justify-center mb-4 shadow-sm`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-1">{card.value}</h3>
                                <p className="text-sm text-slate-500">{card.label}</p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Storage & Verification ──────────────────────── */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Storage Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Storage Breakdown</h2>
                                <p className="text-sm text-slate-500 mt-1">Data distribution by type</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                                <Layers className="w-5 h-5 text-indigo-500" />
                            </div>
                        </div>
                        <div className="flex flex-col xl:flex-row items-center gap-8">
                            <div className="w-[240px] h-[240px] relative flex-shrink-0">
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                    <p className="text-3xl font-bold text-slate-900">{overview?.totalMemories || 0}</p>
                                    <p className="text-xs text-slate-400 mt-1">Total items</p>
                                </div>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={75} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                                            {pieData.map((_: any, idx: number) => (
                                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} className="outline-none" />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={({ active, payload }: any) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4 min-w-[180px]">
                                                    <p className="text-xs text-slate-400 mb-2">{d.name}</p>
                                                    <p className="text-xl font-bold text-indigo-600 mb-1">{d.value} <span className="text-xs text-slate-400 font-normal">items</span></p>
                                                    <p className="text-xs text-slate-500">{formatBytes(d.size)} used</p>
                                                </div>
                                            );
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-3 w-full">
                                {pieData.map((cat: any, idx: number) => (
                                    <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                {getCategoryIcon(cat.category)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">{cat.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-bold text-slate-900">{cat.value}</p>
                                            <p className="text-xs text-slate-400">{formatBytes(cat.size)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* On-Chain Verification */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">On-Chain Verification</h2>
                                <p className="text-sm text-slate-500 mt-1">Blockchain confirmation status</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                                <Globe className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-2 text-emerald-500 mb-2">
                                        <Shield className="w-5 h-5" />
                                        <p className="text-xs font-medium">Verified</p>
                                    </div>
                                    <h3 className="text-5xl font-bold text-slate-900">{overview?.verificationRate || 0}%</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-slate-900">{overview?.onChainCount || 0} on-chain</p>
                                    <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">Confirmed</span>
                                </div>
                            </div>

                            <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 mb-8">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${overview?.verificationRate || 0}%` }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                />
                            </div>

                            <div className="h-[200px] w-full">
                                <ResponsiveContainer>
                                    <BarChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />
                                        <RechartsTooltip content={<CustomTimelineTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="onChain" name="Verified" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={35} />
                                        <Bar dataKey="count" name="Pending" stackId="a" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={35} />
                                        <Legend iconType="circle" iconSize={8} verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 500 }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Timeline Chart ────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 p-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Growth Timeline</h2>
                            </div>
                            <p className="text-sm text-slate-500">Monthly memory creation and verification trends</p>
                        </div>

                        <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-sm text-slate-500">Created</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-sm text-slate-500">Verified</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.primary.from} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={COLORS.primary.from} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.success} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} allowDecimals={false} />
                                <RechartsTooltip content={<CustomTimelineTooltip />} />
                                <Area type="monotone" dataKey="count" name="Created" stroke={COLORS.primary.from} strokeWidth={3} fill="url(#gradPrimary)"
                                    dot={{ r: 4, fill: COLORS.primary.from, strokeWidth: 3, stroke: '#fff' }}
                                    activeDot={{ r: 6, fill: COLORS.primary.from, strokeWidth: 4, stroke: '#fff' }} />
                                <Area type="monotone" dataKey="onChain" name="Verified" stroke={COLORS.success} strokeWidth={3} fill="url(#gradSuccess)"
                                    dot={{ r: 4, fill: COLORS.success, strokeWidth: 3, stroke: '#fff' }}
                                    activeDot={{ r: 6, fill: COLORS.success, strokeWidth: 4, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Activity Heatmap ───────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 p-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100">
                                    <Sparkles className="w-5 h-5 text-orange-400" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Activity Heatmap</h2>
                            </div>
                            <p className="text-sm text-slate-500">{totalActiveDays} active days in the last 90 days</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-xs text-slate-400">Less</span>
                            {HEATMAP_COLORS.map((color, i) => (
                                <div key={i} className="w-4 h-4 rounded" style={{ background: color }} />
                            ))}
                            <span className="text-xs text-slate-400">More</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-4 no-scrollbar">
                        <div className="inline-flex gap-[3px] min-w-full">
                            <div className="flex flex-col gap-[3px] mr-3 pt-8">
                                {['', 'Sun', '', 'Tue', '', 'Thu', '', 'Sat'].map((d, i) => (
                                    <div key={i} className="h-4 text-[10px] text-slate-400 flex items-center">{d}</div>
                                ))}
                            </div>
                            <div>
                                <div className="flex gap-[3px] mb-3 h-6">
                                    {heatmapGrid.map((_, weekIdx) => {
                                        const monthLabel = heatmapMonths.find((m) => m.col === weekIdx);
                                        return <div key={weekIdx} className="w-4 text-[10px] text-slate-400">{monthLabel?.label || ''}</div>;
                                    })}
                                </div>
                                <div className="flex gap-[3px]">
                                    {heatmapGrid.map((week, weekIdx) => (
                                        <div key={weekIdx} className="flex flex-col gap-[3px]">
                                            {week.map((day: any, dayIdx: number) => (
                                                <div
                                                    key={dayIdx}
                                                    className="w-4 h-4 rounded-sm relative group cursor-default"
                                                    style={{ background: day ? getHeatmapColor(day.count) : 'transparent' }}
                                                    title={day ? `${day.count} memories on ${new Date(day.date).toLocaleDateString()}` : ''}
                                                >
                                                    {day && day.count > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                                            <p className="font-semibold">{day.count} memories</p>
                                                            <p className="text-slate-300 text-[10px]">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Streaks & Growth ────────────────────────────── */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Current Streak */}
                    <div className="bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl p-8 text-white relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                                <Flame className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-5xl font-bold mb-2">{streaks.currentStreak}</p>
                            <p className="text-sm font-medium opacity-80 mb-4">Day streak</p>
                            <p className="text-sm opacity-60 leading-relaxed">Keep adding memories daily to build your streak.</p>
                        </div>
                    </div>

                    {/* Longest Streak */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-2xl p-8 text-white relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-5xl font-bold mb-2">{streaks.longestStreak}</p>
                            <p className="text-sm font-medium opacity-80 mb-4">Best streak</p>
                            <p className="text-sm opacity-60 leading-relaxed">Your all-time longest consecutive activity streak.</p>
                        </div>
                    </div>

                    {/* Growth Rate */}
                    <div className={`rounded-2xl p-8 text-white relative overflow-hidden sm:col-span-2 lg:col-span-1 bg-gradient-to-br ${growthRate >= 0 ? 'from-emerald-500 to-teal-700' : 'from-rose-500 to-orange-700'}`}>
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                                {growthRate >= 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
                            </div>
                            <p className="text-5xl font-bold mb-2">{growthRate >= 0 ? '+' : ''}{growthRate}%</p>
                            <p className="text-sm font-medium opacity-80 mb-4">Monthly growth</p>
                            <p className="text-sm opacity-60 leading-relaxed">Your memory creation rate is {growthRate >= 0 ? 'increasing' : 'declining'} compared to last month.</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </DashboardLayout>
    );
};

export default Analytics;
